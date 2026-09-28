import { env } from "../../config/env";
import type { PaymentProvider } from "../core/types";
import { MockProvider } from "./mock.provider";
import { UnconfiguredProvider } from "./unconfigured.provider";

/**
 * Seleciona o provedor de pagamento ativo.
 *
 * - `mock`        → somente testes/dev; bloqueado em produção.
 * - demais nomes  → placeholder até que o adapter oficial seja implementado
 *                   e as credenciais sejam configuradas. Nunca "finge" sucesso.
 */
export function getPaymentProvider(): PaymentProvider {
  switch (env.PAYMENT_PROVIDER) {
    case "mock":
      return new MockProvider(env.PAYMENT_WEBHOOK_SECRET ?? "mock-webhook-secret");
    case "mercadopago":
    case "pagarme":
    case "asaas":
    case "stripe":
      return new UnconfiguredProvider(env.PAYMENT_PROVIDER);
    default:
      return new UnconfiguredProvider(String(env.PAYMENT_PROVIDER));
  }
}

export { MockProvider, UnconfiguredProvider };
