import { describe, expect, it } from "vitest";
import { computeCouponDiscount, CouponLine } from "../src/services/coupon.service";
import type { Coupon } from "@prisma/client";

const baseCoupon = (over: Partial<Coupon>): Coupon =>
  ({
    id: "c1",
    code: "TESTE",
    description: null,
    discountType: "percentage",
    discountValue: "10",
    minSubtotal: null,
    maxUses: null,
    maxUsesPerCustomer: null,
    usedCount: 0,
    startsAt: null,
    expiresAt: null,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  }) as unknown as Coupon;

const lines: CouponLine[] = [
  { productId: "p1", categoryId: "cat1", unitPrice: "100.00", quantity: 2 },
];

describe("computeCouponDiscount", () => {
  it("aplica desconto percentual", () => {
    const r = computeCouponDiscount(baseCoupon({ discountType: "percentage", discountValue: "10" }), lines);
    expect(r.valid).toBe(true);
    expect(r.discount).toBe("20.00");
  });

  it("aplica desconto fixo", () => {
    const r = computeCouponDiscount(baseCoupon({ discountType: "fixed", discountValue: "15" }), lines);
    expect(r.discount).toBe("15.00");
  });

  it("nunca deixa o desconto ultrapassar o subtotal", () => {
    const r = computeCouponDiscount(baseCoupon({ discountType: "fixed", discountValue: "999" }), lines);
    expect(r.discount).toBe("200.00");
  });

  it("rejeita cupom expirado", () => {
    const r = computeCouponDiscount(
      baseCoupon({ expiresAt: new Date(Date.now() - 1000) }),
      lines,
    );
    expect(r.valid).toBe(false);
    expect(r.discount).toBe("0.00");
  });

  it("rejeita cupom que ainda não começou", () => {
    const r = computeCouponDiscount(baseCoupon({ startsAt: new Date(Date.now() + 86_400_000) }), lines);
    expect(r.valid).toBe(false);
  });

  it("rejeita quando o mínimo de compra não é atingido", () => {
    const r = computeCouponDiscount(baseCoupon({ minSubtotal: "500" as unknown as never }), lines);
    expect(r.valid).toBe(false);
  });

  it("rejeita cupom inativo", () => {
    const r = computeCouponDiscount(baseCoupon({ active: false }), lines);
    expect(r.valid).toBe(false);
  });
});
