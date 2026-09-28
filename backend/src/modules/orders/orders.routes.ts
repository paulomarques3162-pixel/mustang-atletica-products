import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../lib/asyncHandler";
import { prisma } from "../../lib/prisma";
import { Forbidden, NotFound } from "../../lib/errors";
import { toMoneyString } from "../../lib/money";
import { getPayment } from "../../payments/services/payment.service";

export const ordersRouter = Router();

function serializeOrder(order: any, includeUser = false) {
  return {
    id: order.id,
    number: order.number,
    status: order.status,
    subtotal: toMoneyString(order.subtotal),
    discount: toMoneyString(order.discount),
    shipping: toMoneyString(order.shipping),
    total: toMoneyString(order.total),
    currency: order.currency,
    shippingMethod: order.shippingMethod,
    trackingCode: order.trackingCode,
    createdAt: order.createdAt,
    items: (order.items ?? []).map((i: any) => ({
      id: i.id,
      productName: i.productName,
      variantLabel: i.variantLabel,
      sku: i.sku,
      unitPrice: toMoneyString(i.unitPrice),
      quantity: i.quantity,
      total: toMoneyString(i.total),
    })),
    payments: (order.payments ?? []).map((p: any) => ({
      id: p.id,
      method: p.method,
      status: p.status,
      amount: toMoneyString(p.amount),
      provider: p.provider,
    })),
    customer: includeUser
      ? { name: order.customerName, email: order.customerEmail, phone: order.customerPhone }
      : undefined,
    address: order.address
      ? {
          line1: order.address.line1,
          number: order.address.number,
          city: order.address.city,
          state: order.address.state,
          postalCode: order.address.postalCode,
        }
      : null,
  };
}

/** GET /api/orders — pedidos do próprio cliente. */
ordersRouter.get(
  "/orders",
  requireAuth,
  asyncHandler(async (req, res) => {
    const orders = await prisma.order.findMany({
      where: { userId: req.auth!.sub },
      orderBy: { createdAt: "desc" },
      include: { items: true, payments: true },
      take: 50,
    });
    res.json({ orders: orders.map((o) => serializeOrder(o)) });
  }),
);

/** GET /api/orders/:id — detalhe (somente do dono, ou admin). */
ordersRouter.get(
  "/orders/:id",
  requireAuth,
  validate({ params: z.object({ id: z.string().min(1) }) }),
  asyncHandler(async (req, res) => {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { items: true, payments: true, address: true, events: { orderBy: { createdAt: "asc" } } },
    });
    if (!order) throw NotFound("Pedido não encontrado.");
    if (order.userId !== req.auth!.sub && req.auth!.role !== "ADMIN") {
      throw Forbidden("Você não tem acesso a este pedido.");
    }
    res.json({
      order: {
        ...serializeOrder(order),
        events: order.events.map((e) => ({ type: e.type, message: e.message, createdAt: e.createdAt })),
      },
    });
  }),
);

/** GET /api/payments/:id — status do pagamento (dono ou admin). */
ordersRouter.get(
  "/payments/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const payment = await prisma.payment.findUnique({
      where: { id: req.params.id },
      include: { order: true },
    });
    if (!payment) throw NotFound("Pagamento não encontrado.");
    if (payment.order.userId !== req.auth!.sub && req.auth!.role !== "ADMIN") {
      throw Forbidden("Você não tem acesso a este pagamento.");
    }
    res.json({ payment: await getPayment(req.params.id) });
  }),
);

/** POST /api/payments/:id/refresh — consulta o provedor e sincroniza o status. */
ordersRouter.post(
  "/payments/:id/refresh",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { refreshPaymentStatus } = await import("../../payments/services/payment.service");
    const payment = await prisma.payment.findUnique({
      where: { id: req.params.id },
      include: { order: true },
    });
    if (!payment) throw NotFound("Pagamento não encontrado.");
    if (payment.order.userId !== req.auth!.sub && req.auth!.role !== "ADMIN") {
      throw Forbidden("Você não tem acesso a este pagamento.");
    }
    res.json({ payment: await refreshPaymentStatus(req.params.id) });
  }),
);
