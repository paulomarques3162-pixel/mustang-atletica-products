import { describe, expect, it } from "vitest";
import { money, round2, sum, toMoneyString } from "../src/lib/money";

describe("money", () => {
  it("soma decimais sem erro de ponto flutuante", () => {
    // 0.1 + 0.2 === 0.30000000000000004 em float — aqui deve ser exato
    expect(sum(["0.10", "0.20"]).toFixed(2)).toBe("0.30");
  });

  it("multiplica preço por quantidade corretamente", () => {
    expect(round2(money("19.99").times(3)).toFixed(2)).toBe("59.97");
  });

  it("formata com 2 casas", () => {
    expect(toMoneyString("10")).toBe("10.00");
    expect(toMoneyString(10.005)).toBe("10.01");
  });

  it("não usa float inseguro em valores grandes", () => {
    const total = sum(["1234.56", "7890.12", "0.01"]);
    expect(total.toFixed(2)).toBe("9124.69");
  });
});
