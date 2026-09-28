import Decimal from "decimal.js";
import { Coupon, CouponDiscountType } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { money, round2 } from "../lib/money";
import { BadRequest, NotFound, UnprocessableEntity } from "../lib/errors";

export interface CouponLine {
  productId: string;
  categoryId: string;
  unitPrice: string;
  quantity: number;
}

export interface CouponEvalResult {
  valid: boolean;
  reason?: string;
  discount: string; // valor do desconto com 2 casas
}

/** Cálculo puro e testável do desconto do cupom. */
export function computeCouponDiscount(
  coupon: Pick<
    Coupon,
    "discountType" | "discountValue" | "minSubtotal" | "startsAt" | "expiresAt" | "active"
  >,
  lines: CouponLine[],
  now: Date = new Date(),
): CouponEvalResult {
  if (!coupon.active) return { valid: false, reason: "Cupom inativo.", discount: "0.00" };
  if (coupon.startsAt && now < coupon.startsAt) {
    return { valid: false, reason: "Cupom ainda não é válido.", discount: "0.00" };
  }
  if (coupon.expiresAt && now > coupon.expiresAt) {
    return { valid: false, reason: "Cupom expirado.", discount: "0.00" };
  }

  const subtotal = lines.reduce(
    (acc, l) => acc.plus(money(l.unitPrice).times(l.quantity)),
    new Decimal(0),
  );

  if (coupon.minSubtotal && subtotal.lessThan(money(coupon.minSubtotal))) {
    return {
      valid: false,
      reason: `Valor mínimo de compra não atingido para este cupom.`,
      discount: "0.00",
    };
  }

  let discount: Decimal;
  if (coupon.discountType === CouponDiscountType.percentage) {
    discount = subtotal.times(money(coupon.discountValue).dividedBy(100));
  } else {
    discount = money(coupon.discountValue);
  }

  discount = round2(Decimal.min(discount, subtotal));
  return { valid: true, discount: discount.toFixed(2) };
}

/**
 * Busca o cupom e valida regras de uso (limite total e por cliente).
 * Retorna o registro para uso posterior na criação do pedido.
 */
export async function resolveCoupon(
  code: string,
  lines: CouponLine[],
  userId?: string | null,
): Promise<{ coupon: Coupon; discount: string }> {
  const coupon = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
  if (!coupon) throw NotFound("Cupom não encontrado.");

  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
    throw UnprocessableEntity("Cupom esgotado.");
  }

  if (userId && coupon.maxUsesPerCustomer !== null) {
    const used = await prisma.couponUsage.count({ where: { couponId: coupon.id, userId } });
    if (used >= coupon.maxUsesPerCustomer) {
      throw UnprocessableEntity("Você já atingiu o limite de uso deste cupom.");
    }
  }

  const result = computeCouponDiscount(coupon, lines);
  if (!result.valid) throw BadRequest(result.reason ?? "Cupom inválido.");

  return { coupon, discount: result.discount };
}
