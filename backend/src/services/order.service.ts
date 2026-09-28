import { customAlphabet } from "nanoid";
import { OrderStatus, Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { money, round2, toMoneyString } from "../lib/money";
import { BadRequest, NotFound, UnprocessableEntity } from "../lib/errors";
import { decrementStock } from "./inventory.service";
import { quoteShipping, ShippingMethod } from "./shipping.service";
import { computeCouponDiscount, CouponLine } from "./coupon.service";
import { logger } from "../lib/logger";

const orderNumberId = customAlphabet("0123456789ABCDEFGHJKLMNPQRSTUVWXYZ", 6);

export function generateOrderNumber(date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `MA-${y}${m}${d}-${orderNumberId()}`;
}

/** Preço unitário efetivo: preço da variação > promocional do produto > preço base. */
export function effectiveUnitPrice(variant: { price: Prisma.Decimal | null }, product: {
  promotionalPrice: Prisma.Decimal | null;
  basePrice: Prisma.Decimal;
}): Prisma.Decimal {
  return variant.price ?? product.promotionalPrice ?? product.basePrice;
}

export interface CreateOrderItemInput {
  variantId: string;
  quantity: number;
}

export interface CreateOrderInput {
  userId?: string | null;
  customerEmail: string;
  customerName: string;
  customerPhone?: string | null;
  customerDoc?: string | null;
  addressId?: string | null;
  shippingMethod: ShippingMethod;
  couponCode?: string | null;
  notes?: string | null;
  items: CreateOrderItemInput[];
}

export interface CreatedOrder {
  id: string;
  number: string;
  status: OrderStatus;
  subtotal: string;
  discount: string;
  shipping: string;
  total: string;
  items: Array<{
    id: string;
    productId: string;
    variantId: string;
    productName: string;
    variantLabel: string | null;
    sku: string;
    unitPrice: string;
    quantity: number;
    total: string;
  }>;
}

/**
 * Cria o pedido recalculando TUDO no servidor: preços, desconto, frete e total.
 * O frontend nunca decide quanto o cliente paga.
 *
 * A baixa de estoque acontece dentro da mesma transação, com update condicional,
 * impedindo venda acima do estoque sob concorrência.
 */
export async function createOrder(input: CreateOrderInput): Promise<CreatedOrder> {
  if (!input.items.length) throw BadRequest("O carrinho está vazio.");

  // endereço pertence ao próprio usuário, quando informado
  if (input.addressId && input.userId) {
    const address = await prisma.address.findFirst({
      where: { id: input.addressId, userId: input.userId },
    });
    if (!address) throw NotFound("Endereço não encontrado para este cliente.");
  }

  const shipping = quoteShipping(input.shippingMethod);
  const orderNumber = generateOrderNumber();

  return prisma.$transaction(async (tx) => {
    // 1) carrega variações + produtos
    const variantIds = input.items.map((i) => i.variantId);
    const variants = await tx.productVariant.findMany({
      where: { id: { in: variantIds } },
      include: { product: { include: { category: true } } },
    });

    const found = new Map(variants.map((v) => [v.id, v]));
    const lines: CouponLine[] = [];
    const resolved: Array<{
      variantId: string;
      productId: string;
      productName: string;
      variantLabel: string | null;
      sku: string;
      unitPrice: string;
      quantity: number;
    }> = [];

    for (const item of input.items) {
      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        throw BadRequest("Quantidade inválida no item do pedido.");
      }
      const variant = found.get(item.variantId);
      if (!variant) throw NotFound(`Variação não encontrada: ${item.variantId}`);
      if (!variant.active || !variant.product.active) {
        throw UnprocessableEntity(`Produto indisponível: ${variant.product.name}.`);
      }
      const unit = effectiveUnitPrice(variant, variant.product);
      const label = [variant.size, variant.color].filter(Boolean).join(" / ") || null;

      lines.push({
        productId: variant.productId,
        categoryId: variant.product.categoryId,
        unitPrice: toMoneyString(unit),
        quantity: item.quantity,
      });
      resolved.push({
        variantId: variant.id,
        productId: variant.productId,
        productName: variant.product.name,
        variantLabel: label,
        sku: variant.sku,
        unitPrice: toMoneyString(unit),
        quantity: item.quantity,
      });
    }

    const subtotal = lines.reduce(
      (acc, l) => acc.plus(money(l.unitPrice).times(l.quantity)),
      money(0),
    );

    // 2) cupom (revalidado no servidor)
    let discount = money(0);
    let couponId: string | null = null;
    if (input.couponCode) {
      const code = input.couponCode.toUpperCase();
      const coupon = await tx.coupon.findUnique({ where: { code } });
      if (!coupon) throw NotFound("Cupom não encontrado.");
      if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
        throw UnprocessableEntity("Cupom esgotado.");
      }
      if (input.userId && coupon.maxUsesPerCustomer !== null) {
        const used = await tx.couponUsage.count({
          where: { couponId: coupon.id, userId: input.userId },
        });
        if (used >= coupon.maxUsesPerCustomer) {
          throw UnprocessableEntity("Limite de uso deste cupom atingido para este cliente.");
        }
      }
      const result = computeCouponDiscount(coupon, lines);
      if (!result.valid) throw BadRequest(result.reason ?? "Cupom inválido.");
      discount = money(result.discount);
      couponId = coupon.id;

      // incremento condicional anti-corrida
      if (coupon.maxUses !== null) {
        const updated = await tx.coupon.updateMany({
          where: { id: coupon.id, usedCount: { lt: coupon.maxUses } },
          data: { usedCount: { increment: 1 } },
        });
        if (updated.count === 0) throw UnprocessableEntity("Cupom esgotado.");
      } else {
        await tx.coupon.update({ where: { id: coupon.id }, data: { usedCount: { increment: 1 } } });
      }
    }

    // 3) totais
    const shippingCost = money(shipping.cost);
    const total = round2(subtotal.minus(discount).plus(shippingCost));
    if (total.lessThan(0)) throw BadRequest("Total inválido após descontos.");

    // 4) cria pedido
    const order = await tx.order.create({
      data: {
        number: orderNumber,
        userId: input.userId ?? null,
        customerEmail: input.customerEmail,
        customerName: input.customerName,
        customerPhone: input.customerPhone ?? null,
        customerDoc: input.customerDoc ?? null,
        status: OrderStatus.awaiting_payment,
        subtotal: subtotal.toFixed(2),
        discount: discount.toFixed(2),
        shipping: shippingCost.toFixed(2),
        total: total.toFixed(2),
        couponId,
        addressId: input.addressId ?? null,
        shippingMethod: shipping.method,
        notes: input.notes ?? null,
      },
    });

    // 5) itens + baixa de estoque na MESMA transação
    const createdItems: CreatedOrder["items"] = [];
    for (const line of resolved) {
      await decrementStock(
        tx,
        line.variantId,
        line.quantity,
        "outbound",
        order.id,
        "Reserva de estoque do pedido",
      );
      const itemTotal = round2(money(line.unitPrice).times(line.quantity));
      const item = await tx.orderItem.create({
        data: {
          orderId: order.id,
          productId: line.productId,
          variantId: line.variantId,
          productName: line.productName,
          variantLabel: line.variantLabel,
          sku: line.sku,
          unitPrice: line.unitPrice,
          quantity: line.quantity,
          total: itemTotal.toFixed(2),
        },
      });
      createdItems.push({
        id: item.id,
        productId: item.productId,
        variantId: item.variantId,
        productName: item.productName,
        variantLabel: item.variantLabel,
        sku: item.sku,
        unitPrice: item.unitPrice.toFixed(2),
        quantity: item.quantity,
        total: item.total.toFixed(2),
      });
    }

    await tx.orderEvent.create({
      data: { orderId: order.id, type: "ORDER_CREATED", message: "Pedido criado, aguardando pagamento." },
    });

    if (couponId && input.userId) {
      await tx.couponUsage.create({
        data: { couponId, userId: input.userId, orderId: order.id },
      });
    }

    logger.info({ orderId: order.id, number: order.number, total: total.toFixed(2) }, "order_created");

    return {
      id: order.id,
      number: order.number,
      status: order.status,
      subtotal: order.subtotal.toFixed(2),
      discount: order.discount.toFixed(2),
      shipping: order.shipping.toFixed(2),
      total: order.total.toFixed(2),
      items: createdItems,
    };
  });
}

/** Cancela pedido e devolve estoque (transação + eventos). */
export async function cancelOrder(orderId: string, reason?: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order) throw NotFound("Pedido não encontrado.");
    if (order.status === OrderStatus.canceled) throw UnprocessableEntity("Pedido já cancelado.");
    if (order.status === OrderStatus.delivered) {
      throw UnprocessableEntity("Pedido já entregue não pode ser cancelado.");
    }

    for (const item of order.items) {
      await tx.productVariant.update({
        where: { id: item.variantId },
        data: { stock: { increment: item.quantity } },
      });
      await tx.inventoryMovement.create({
        data: {
          variantId: item.variantId,
          type: "cancellation",
          quantity: item.quantity,
          orderId: order.id,
          reason: reason ?? "Cancelamento de pedido",
        },
      });
    }

    await tx.order.update({
      where: { id: order.id },
      data: { status: OrderStatus.canceled, canceledAt: new Date() },
    });
    await tx.orderEvent.create({
      data: { orderId: order.id, type: "ORDER_CANCELED", message: reason ?? "Pedido cancelado." },
    });
    logger.info({ orderId }, "order_canceled");
  });
}
