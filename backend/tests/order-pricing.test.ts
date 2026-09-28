import { describe, expect, it } from "vitest";
import { effectiveUnitPrice, generateOrderNumber } from "../src/services/order.service";
import Decimal from "decimal.js";

describe("preço efetivo do produto", () => {
  const product = { basePrice: new Decimal("100.00"), promotionalPrice: new Decimal("80.00") };

  it("usa o preço da variação quando definido", () => {
    const variant = { price: new Decimal("95.00") };
    expect(effectiveUnitPrice(variant, product).toFixed(2)).toBe("95.00");
  });

  it("usa o preço promocional quando a variação não tem preço", () => {
    const variant = { price: null };
    expect(effectiveUnitPrice(variant, product).toFixed(2)).toBe("80.00");
  });

  it("usa o preço base quando não há promoção", () => {
    const variant = { price: null };
    const p = { basePrice: new Decimal("100.00"), promotionalPrice: null };
    expect(effectiveUnitPrice(variant, p).toFixed(2)).toBe("100.00");
  });
});

describe("geração de número de pedido", () => {
  it("segue o padrão MA-YYYYMMDD-XXXXXX", () => {
    const number = generateOrderNumber(new Date("2025-03-07T12:00:00Z"));
    expect(number).toMatch(/^MA-20250307-[0-9A-Z]{6}$/);
  });

  it("gera números distintos", () => {
    const set = new Set(Array.from({ length: 50 }, () => generateOrderNumber()));
    expect(set.size).toBe(50);
  });
});
