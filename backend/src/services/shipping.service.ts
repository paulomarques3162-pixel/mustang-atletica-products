import { env } from "../config/env";
import { UnprocessableEntity } from "../lib/errors";

export type ShippingMethod = "pickup" | "delivery";

export interface ShippingQuote {
  method: ShippingMethod;
  cost: string; // decimal string
  label: string;
  /** true quando o custo é uma estimativa declarada, false quando definitivo. */
  estimated: boolean;
}

/**
 * Adapter de frete.
 *
 * NÃO inventamos preços de frete. Enquanto não houver integração real com
 * transportadora/correios configurada, apenas:
 *  - retirada: custo zero (retirada na atlética);
 *  - entrega: usa taxa fixa definida pelo lojista via SHIPPING_FLAT_FEE,
 *    quando existir. Sem taxa configurada, a entrega é recusada de forma clara.
 */
export function quoteShipping(method: ShippingMethod): ShippingQuote {
  if (method === "pickup") {
    return { method, cost: "0.00", label: "Retirada na Mustang Atlética", estimated: false };
  }

  if (!env.SHIPPING_FLAT_FEE) {
    throw UnprocessableEntity(
      "Cálculo de frete por transportadora ainda não está configurado. " +
        "Escolha retirada ou configure SHIPPING_FLAT_FEE / integração de frete.",
    );
  }

  return {
    method,
    cost: env.SHIPPING_FLAT_FEE,
    label: "Entrega (taxa fixa configurada)",
    estimated: false,
  };
}
