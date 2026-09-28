import { OrderStatus, Payment, PaymentMethod, PaymentStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { NotFound, UnprocessableEntity, BadRequest } from "../../lib/errors";
import { logger } from "../../lib/logger";
import { getPaymentProvider } from "../providers/registry";
import type { PaymentProvider, ProviderWebhookEvent } from "../core/types";
import { InvalidWebhookSignature } from "../core/errors";
import type { MockProvider } from "../providers/mock.provider";
import { audit } from "../../services/audit.service";
import { money, toMoneyString } from "../../lib/money";
import { Refund } from "@prisma/client";
import { incrementStock } from "../../services/inventory.service";

export interface CreatePaymentInput {
  orderId: string;
  method: PaymentMethod;
  idempotencyKey: string;
  card?: { token?: string; installments?: number; paymentMethodId?: string };
}

export interface PaymentView {
  id: string;
  orderId: string;
  method: PaymentMethod;
  status: PaymentStatus;
  amount: string;
  provider: string;
  qrCodeImage?: string | null;
  qrCodeText?: string | null;
  boletoUrl?: string | null;
  boletoLine?: string | null;
  expiresAt?: Date | null;
  /** Indica se é um provedor de teste — o frontend deve avisar o usuário. */
  sandbox: boolean;
}

function toView(payment: Payment, sandbox: boolean): PaymentView {
  return {
    id: payment.id,
    orderId: payment.orderId,
    method: payment.method,
    status: payment.status,
    amount: payment.amount.toFixed(2),
    provider: payment.provider,
    qrCodeImage: payment.qrCode,
    qrCodeText: payment.qrCodeText,
    boletoUrl: payment.boletoUrl,
    boletoLine: payment.boletoLine,
    expiresAt: payment.expiresAt,
    sandbox,
  };
}

/**
 * Cria (ou reaproveita, de forma idempotente) uma cobrança para o pedido.
 * Nunca marcamos pagamento como pago aqui — isso só ocorre via webhook validado.
 */
export async function createPaymentForOrder(input: CreatePaymentInput): Promise<PaymentView> {
  const provider = getPaymentProvider();
  if (!provider.isConfigured()) {
    throw UnprocessableEntity(
      `O provedor de pagamento "${provider.name}" não está configurado. ` +
        "Pagamentos reais ainda não estão habilitados nesta instalação.",
    );
  }
  if (!provider.enabledMethods().includes(input.method)) {
    throw BadRequest(`Método de pagamento indisponível: ${input.method}.`);
  }

  // idempotência: se já existe pagamento com a mesma chave, devolve
  const existing = await prisma.payment.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
  if (existing) return toView(existing, provider.name === "mock");

  const order = await prisma.order.findUnique({ where: { id: input.orderId } });
  if (!order) throw NotFound("Pedido não encontrado.");
  if (order.status === OrderStatus.canceled) {
    throw UnprocessableEntity("Pedido cancelado não pode receber pagamento.");
  }

  const charge = await provider.createCharge({
    orderId: order.id,
    orderNumber: order.number,
    amount: order.total.toFixed(2),
    currency: order.currency,
    method: input.method,
    customer: {
      name: order.customerName,
      email: order.customerEmail,
      document: order.customerDoc,
      phone: order.customerPhone,
    },
    idempotencyKey: input.idempotencyKey,
    description: `Pedido ${order.number} — Mustang Atlética`,
    card: input.card,
    notificationUrl: undefined, // definido quando o webhook do provedor for configurado
  });

  const payment = await prisma.payment.create({
    data: {
      orderId: order.id,
      provider: provider.name,
      method: input.method,
      status: charge.status,
      amount: order.total.toFixed(2),
      currency: order.currency,
      idempotencyKey: input.idempotencyKey,
      externalId: charge.externalId,
      qrCode: charge.qrCodeImage ?? null,
      qrCodeText: charge.qrCodeText ?? null,
      boletoUrl: charge.boletoUrl ?? null,
      boletoLine: charge.boletoLine ?? null,
      expiresAt: charge.expiresAt ?? null,
      metadata: charge.raw as object | undefined,
    },
  });

  await prisma.paymentTransaction.create({
    data: {
      paymentId: payment.id,
      externalId: charge.externalId,
      status: charge.status,
      amount: order.total.toFixed(2),
      rawPayload: (charge.raw ?? {}) as object,
    },
  });

  await prisma.orderEvent.create({
    data: { orderId: order.id, type: "PAYMENT_CREATED", message: `Pagamento ${input.method} criado.` },
  });

  await audit({
    action: "PAYMENT_CREATED",
    entity: "Payment",
    entityId: payment.id,
    metadata: { orderId: order.id, method: input.method, provider: provider.name },
  });

  logger.info({ paymentId: payment.id, orderId: order.id, method: input.method }, "payment_created");

  return toView(payment, provider.name === "mock");
}

export async function getPayment(id: string): Promise<PaymentView> {
  const payment = await prisma.payment.findUnique({ where: { id } });
  if (!payment) throw NotFound("Pagamento não encontrado.");
  return toView(payment, payment.provider === "mock");
}

/**
 * Processa webhook do provedor de forma idempotente.
 * Retorna { duplicated: true } quando o evento já foi processado.
 */
export async function processWebhook(
  provider: PaymentProvider,
  rawBody: string,
  headers: Record<string, string | undefined>,
): Promise<{ duplicated: boolean; paymentId?: string; status?: PaymentStatus }> {
  // 1) valida assinatura
  const signatureOk = provider.verifyWebhookSignature(rawBody, headers);
  if (!signatureOk) {
    await audit({
      action: "WEBHOOK_FAILED",
      entity: "PaymentWebhook",
      metadata: { provider: provider.name, reason: "invalid_signature" },
      result: "failure",
    });
    throw InvalidWebhookSignature();
  }

  // 2) parse
  const event: ProviderWebhookEvent = provider.parseWebhook(rawBody, headers);

  // 3) idempotência por (provider, eventId)
  const existing = await prisma.paymentWebhook.findUnique({
    where: { provider_eventId: { provider: provider.name, eventId: event.eventId } },
  });
  if (existing?.processed) {
    logger.info({ eventId: event.eventId }, "webhook_duplicated_ignored");
    return { duplicated: true };
  }

  const webhook =
    existing ??
    (await prisma.paymentWebhook.create({
      data: {
        provider: provider.name,
        eventId: event.eventId,
        eventType: event.eventType,
        signatureOk: true,
        payload: event.raw as object,
      },
    }));

  try {
    const result = await applyWebhookEvent(provider, event);
    await prisma.paymentWebhook.update({
      where: { id: webhook.id },
      data: { processed: true, processedAt: new Date() },
    });
    await audit({
      action: "WEBHOOK_PROCESSED",
      entity: "PaymentWebhook",
      entityId: webhook.id,
      metadata: { eventId: event.eventId, eventType: event.eventType },
    });
    return { duplicated: false, ...result };
  } catch (err) {
    await prisma.paymentWebhook.update({
      where: { id: webhook.id },
      data: { error: err instanceof Error ? err.message : String(err), processed: false },
    });
    await audit({
      action: "WEBHOOK_FAILED",
      entity: "PaymentWebhook",
      entityId: webhook.id,
      metadata: { eventId: event.eventId, reason: "processing_error" },
      result: "failure",
    });
    throw err;
  }
}

/** Aplica o efeito do evento: pagamento, pedido e estoque. */
async function applyWebhookEvent(
  provider: PaymentProvider,
  event: ProviderWebhookEvent,
): Promise<{ paymentId: string; status: PaymentStatus }> {
  const payment = await prisma.payment.findFirst({
    where: { externalId: event.externalId, provider: provider.name },
    include: { order: { include: { items: true } } },
  });
  if (!payment) throw NotFound(`Pagamento não encontrado para externalId ${event.externalId}.`);

  return prisma.$transaction(async (tx) => {
    // valida valor quando o provedor informa
    if (event.amount && money(event.amount).lessThan(payment.amount)) {
      throw BadRequest("Valor do webhook menor que o valor do pagamento.");
    }

    const previousStatus = payment.status;

    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: event.status,
        paidAt: event.status === "paid" ? new Date() : payment.paidAt,
        canceledAt: event.status === "canceled" ? new Date() : payment.canceledAt,
        refundedAt: event.status === "refunded" ? new Date() : payment.refundedAt,
      },
    });

    await tx.paymentTransaction.create({
      data: {
        paymentId: payment.id,
        externalId: event.externalId,
        status: event.status,
        amount: payment.amount.toFixed(2),
        rawPayload: event.raw as object,
      },
    });

    // pagamento aprovado → confirma pedido
    if (event.status === "paid" && previousStatus !== "paid") {
      await tx.order.update({
        where: { id: payment.orderId },
        data: { status: OrderStatus.confirmed, confirmedAt: new Date() },
      });
      await tx.orderEvent.create({
        data: { orderId: payment.orderId, type: "PAYMENT_PAID", message: "Pagamento confirmado." },
      });
      await audit({
        action: "PAYMENT_PAID",
        entity: "Payment",
        entityId: payment.id,
        metadata: { orderId: payment.orderId, amount: toMoneyString(payment.amount) },
      });
    }

    // estorno/cancelamento → devolve estoque e atualiza pedido
    if (
      (event.status === "refunded" || event.status === "canceled") &&
      previousStatus === "paid"
    ) {
      for (const item of payment.order.items) {
        await incrementStock(
          tx,
          item.variantId,
          item.quantity,
          event.status === "refunded" ? "return" : "cancellation",
          payment.orderId,
          `Webhook: pagamento ${event.status}`,
        );
      }
      await tx.order.update({
        where: { id: payment.orderId },
        data: {
          status: event.status === "refunded" ? OrderStatus.refunded : OrderStatus.canceled,
          canceledAt: event.status === "canceled" ? new Date() : payment.order.canceledAt,
        },
      });
    }

    if (event.status === "failed") {
      await tx.orderEvent.create({
        data: { orderId: payment.orderId, type: "PAYMENT_FAILED", message: "Pagamento recusado." },
      });
      await audit({
        action: "PAYMENT_FAILED",
        entity: "Payment",
        entityId: payment.id,
        metadata: { orderId: payment.orderId },
        result: "failure",
      });
    }

    logger.info(
      { paymentId: payment.id, from: previousStatus, to: event.status },
      "webhook_applied",
    );

    return { paymentId: payment.id, status: event.status };
  });
}

/**
 * Estorno (total ou parcial) via provedor.
 * Só executa se o provedor suportar — nunca simulamos estorno.
 */
export async function refundPayment(
  paymentId: string,
  amount: string | undefined,
  reason: string | undefined,
  actorId: string,
): Promise<{ refundId: string; status: string; amount: string }> {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) throw NotFound("Pagamento não encontrado.");
  if (payment.status !== "paid") throw UnprocessableEntity("Somente pagamentos aprovados podem ser estornados.");

  const provider = getPaymentProvider();
  if (!provider.isConfigured()) {
    throw UnprocessableEntity(
      `O provedor "${provider.name}" não está configurado; estorno indisponível.`,
    );
  }

  if (amount && money(amount).greaterThan(payment.amount)) {
    throw BadRequest("Valor de estorno maior que o valor pago.");
  }

  const result = await provider.refundCharge(payment.externalId ?? "", amount);
  const refundAmount = amount ?? payment.amount.toFixed(2);

  const refund: Refund = await prisma.refund.create({
    data: {
      paymentId: payment.id,
      amount: refundAmount,
      reason: reason ?? null,
      status: result.status === "refunded" ? "completed" : "processing",
      externalId: result.externalId,
    },
  });

  await audit({
    userId: actorId,
    action: "PAYMENT_REFUNDED",
    entity: "Payment",
    entityId: payment.id,
    metadata: { amount: toMoneyString(refundAmount), refundId: refund.id },
  });

  return { refundId: refund.id, status: refund.status, amount: refundAmount };
}

/** Consulta o provedor e sincroniza o status local (usado pelo botão "atualizar"). */
export async function refreshPaymentStatus(paymentId: string): Promise<PaymentView> {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) throw NotFound("Pagamento não encontrado.");
  if (!payment.externalId) return toView(payment, payment.provider === "mock");

  const provider = getPaymentProvider();
  const charge = await provider.getCharge(payment.externalId);
  if (!charge) return toView(payment, provider.name === "mock");

  if (charge.status !== payment.status) {
    const payload = JSON.stringify({
      id: `sync_${payment.externalId}_${charge.status}`,
      type: "payment.updated",
      externalId: payment.externalId,
      status: charge.status,
      amount: charge.amount,
    });
    const headers: Record<string, string | undefined> =
      provider.name === "mock"
        ? { "x-mock-signature": (provider as MockProvider).signPayload(payload) }
        : {};
    await processWebhook(provider, payload, headers);
  }

  const updated = await prisma.payment.findUnique({ where: { id: paymentId } });
  return toView(updated!, provider.name === "mock");
}
