import Decimal from "decimal.js";

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export type MoneyInput = string | number | Decimal | { toString(): string };

/** Cria um Decimal seguro a partir de qualquer entrada monetária. */
export function money(value: MoneyInput): Decimal {
  return new Decimal(value.toString());
}

/** Arredonda para 2 casas (padrão monetário). */
export function round2(value: MoneyInput): Decimal {
  return money(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

/** Soma valores monetários com precisão decimal. */
export function sum(values: MoneyInput[]): Decimal {
  return values.reduce<Decimal>((acc, v) => acc.plus(money(v)), new Decimal(0));
}

/**
 * Converte Decimal para string com 2 casas — formato seguro para JSON,
 * nunca expondo representação binária de ponto flutuante.
 */
export function toMoneyString(value: MoneyInput): string {
  return round2(value).toFixed(2);
}
