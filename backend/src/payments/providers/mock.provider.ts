import crypto from "node:crypto";
import type { PaymentMethod, PaymentStatus } from "@prisma/client";
import type {
  ChargeResult,
  CreateChargeInput,
  PaymentProvider,
  ProviderWebhookEvent,
} from "../core/types";
import { InvalidWebhookSignature, PaymentNotAllowedInProduction } from "../core/errors";
import { isProd } from "../../config/env";

const SUPPORTED_METHODS: PaymentMethod[] = [
  "pix",
  "credit_card",
  "debit_card",
  "boleto",
];

/**
 * MockProvider — EXCLUSIVO para testes automatizados e desenvolvimento local.
 *
 * PROIBIDO EM PRODUÇÃO: em NODE_ENV=production qualquer chamada lança erro.
 * Não representa um pagamento real e nunca deve ser apresentado como tal.
 */
export class MockProvider implements PaymentProvider {
  readonly name = "mock";
  private readonly store = new Map<string, ChargeResult>();

  constructor(private readonly webhookSecret = "mock-webhook-secret") {
    if (isProd) {
      throw PaymentNotAllowedInProduction("mock");
    }
  }

  isConfigured(): boolean {
    return true;
  }

  enabledMethods(): PaymentMethod[] {
    return SUPPORTED_METHODS;
  }

  async createCharge(input: CreateChargeInput): Promise<ChargeResult> {
    const externalId = `mock_${crypto.randomUUID()}`;
    const status: PaymentStatus = input.method === "pix" ? "pending" : "pending";

    const result: ChargeResult = {
      externalId,
      status,
      method: input.method,
      amount: input.amount,
      expiresAt: new Date(Date.now() + (input.expiresInSeconds ?? 3600) * 1000),
    };

    if (input.method === "pix") {
      result.qrCodeText = `00020126MOCKPIX${externalId}5204000053039865802BR`;
      result.qrCodeImage = "data:image/png;base64,"; // imagem real gerada só por provedor real
    }
    if (input.method === "boleto") {
      result.boletoLine = "00000.00000 00000.000000 00000.000000 0 00000000000000";
      result.boletoUrl = `mock://boleto/${externalId}`;
    }

    this.store.set(externalId, result);
    return result;
  }

  async getCharge(externalId: string): Promise<ChargeResult | null> {
    return this.store.get(externalId) ?? null;
  }

  async cancelCharge(externalId: string): Promise<ChargeResult> {
    const charge = this.store.get(externalId);
    if (!charge) throw new Error("Cobrança mock não encontrada");
    charge.status = "canceled";
    this.store.set(externalId, charge);
    return charge;
  }

  async refundCharge(externalId: string, amount?: string): Promise<ChargeResult> {
    const charge = this.store.get(externalId);
    if (!charge) throw new Error("Cobrança mock não encontrada");
    charge.status = "refunded";
    if (amount) charge.amount = amount;
    this.store.set(externalId, charge);
    return charge;
  }

  verifyWebhookSignature(rawBody: string, headers: Record<string, string | undefined>): boolean {
    const signature = headers["x-mock-signature"];
    if (!signature) return false;
    const expected = crypto
      .createHmac("sha256", this.webhookSecret)
      .update(rawBody)
      .digest("hex");
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }

  parseWebhook(rawBody: string, _headers: Record<string, string | undefined>): ProviderWebhookEvent {
    const body = JSON.parse(rawBody) as {
      id: string;
      type: string;
      externalId: string;
      status: PaymentStatus;
      amount?: string;
    };
    return {
      eventId: body.id,
      eventType: body.type,
      externalId: body.externalId,
      status: body.status,
      amount: body.amount,
      raw: body as unknown as Record<string, unknown>,
    };
  }

  /** Utilitário de teste: assina um payload exatamente como o provedor faria. */
  signPayload(rawBody: string): string {
    return crypto.createHmac("sha256", this.webhookSecret).update(rawBody).digest("hex");
  }
}

export { InvalidWebhookSignature };
