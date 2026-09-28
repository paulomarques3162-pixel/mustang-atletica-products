import { Router } from "express";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { optionalAuth } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../lib/asyncHandler";
import { checkoutLimiter } from "../../middleware/rateLimit";
import { createOrder } from "../../services/order.service";
import { createPaymentForOrder, PaymentView } from "../../payments/services/payment.service";
import { prisma } from "../../lib/prisma";
import { getOrCreateCart } from "../cart/cart.service";
import { BadRequest, UnprocessableEntity } from "../../lib/errors";
import { audit } from "../../services/audit.service";
import { quoteShipping } from "../../services/shipping.service";

export const checkoutRouter = Router();

const itemSchema = z.object({
  variantId: z.string().min(1),
  quantity: z.number().int().positive().max(50),
});

const checkoutSchema = z.object({
  items: z.array(itemSchema).max(50).optional(),
  shippingMethod: z.enum(["pickup", "delivery"]),
  addressId: z.string().optional(),
  couponCode: z.string().trim().min(2).max(40).optional(),
  notes: z.string().max(500).optional(),
  customer: z
    .object({
      name: z.string().min(2).max(120),
      email: z.string().email(),
      phone: z.string().max(20).optional(),
      document: z.string().max(20).optional(),
    })
    .optional(),
  payment: z.object({
    method: z.enum(["pix", "credit_card", "debit_card", "boleto", "wallet", "apple_pay", "google_pay"]),
    cardToken: z.string().min(1).optional(),
    installments: z.number().int().min(1).max(12).optional(),
    paymentMethodId: z.string().optional(),
  }),
});

/**
 * POST /api/checkout
 * Cria o pedido recalculando tudo no servidor e, em seguida, a cobrança.
 * O pagamento NÃO é confirmado aqui — apenas o webhook validado confirma.
 */
checkoutRouter.post(
  "/checkout",
  checkoutLimiter,
  optionalAuth,
  validate({ body: checkoutSchema }),
  asyncHandler(async (req, res) => {
    const userId = req.auth?.sub ?? null;
    const body = req.body as z.infer<typeof checkoutSchema>;

    // cliente: usa dados da conta quando logado, ou dados informados
    let customer = body.customer;
    if (userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) throw UnprocessableEntity("Usuário não encontrado.");
      customer = {
        name: user.name ?? body.customer?.name ?? "Cliente",
        email: user.email,
        phone: body.customer?.phone ?? user.phone ?? undefined,
        document: body.customer?.document ?? user.document ?? undefined,
      };
    }
    if (!customer) throw BadRequest("Informe os dados do cliente.");

    // itens: do body (visitante) ou do carrinho do usuário (servidor)
    let items = body.items ?? [];
    if ((!items || items.length === 0) && userId) {
      const cart = await getOrCreateCart({ userId });
      const cartItems = await prisma.cartItem.findMany({ where: { cartId: cart.id } });
      items = cartItems.map((i) => ({ variantId: i.variantId, quantity: i.quantity }));
    }
    if (!items.length) throw BadRequest("Nenhum item para finalizar a compra.");

    const order = await createOrder({
      userId,
      customerEmail: customer.email,
      customerName: customer.name,
      customerPhone: customer.phone ?? null,
      customerDoc: customer.document ?? null,
      addressId: body.addressId ?? null,
      shippingMethod: body.shippingMethod,
      couponCode: body.couponCode ?? null,
      notes: body.notes ?? null,
      items,
    });

    await audit({
      userId,
      action: "ORDER_CREATED",
      entity: "Order",
      entityId: order.id,
      metadata: { number: order.number, total: order.total },
      ip: req.ip,
    });

    // cria cobrança (idempotente)
    const idempotencyKey =
      req.header("idempotency-key") ?? `order:${order.id}:${body.payment.method}`;

    let payment: PaymentView | null = null;
    let paymentError: string | null = null;
    try {
      payment = await createPaymentForOrder({
        orderId: order.id,
        method: body.payment.method,
        idempotencyKey,
        card: body.payment.cardToken
          ? {
              token: body.payment.cardToken,
              installments: body.payment.installments,
              paymentMethodId: body.payment.paymentMethodId,
            }
          : undefined,
      });
    } catch (err) {
      // pedido foi criado; cobrança pode estar pendente de configuração externa
      paymentError = err instanceof Error ? err.message : "Falha ao criar cobrança.";
    }

    // limpa carrinho do usuário após converter o pedido
    if (userId) {
      const cart = await getOrCreateCart({ userId });
      await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    }

    res.status(201).json({
      order,
      payment,
      paymentPending: !payment,
      paymentError,
    });
  }),
);

/** GET /api/checkout/shipping?method=... — cota de frete (retirada sempre disponível). */
checkoutRouter.get(
  "/checkout/shipping",
  asyncHandler(async (req, res) => {
    const method = req.query.method === "delivery" ? "delivery" : "pickup";
    res.json({ quote: quoteShipping(method) });
  }),
);

export { randomUUID };
