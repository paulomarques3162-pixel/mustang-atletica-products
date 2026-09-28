import { AppError } from "../../lib/errors";

/** Erros específicos da camada de pagamento. */
export class PaymentError extends AppError {
  constructor(code: string, message: string, status = 502, details?: unknown) {
    super(status, code, message, details);
    this.name = "PaymentError";
  }
}

export const ProviderNotConfigured = (provider: string) =>
  new PaymentError(
    "PAYMENT_PROVIDER_NOT_CONFIGURED",
    `O provedor de pagamento "${provider}" não está configurado. ` +
      "Configure as credenciais oficiais para habilitar pagamentos reais.",
    503,
  );

export const InvalidWebhookSignature = () =>
  new PaymentError("INVALID_WEBHOOK_SIGNATURE", "Assinatura de webhook inválida.", 401);

export const PaymentNotAllowedInProduction = (name: string) =>
  new PaymentError(
    "MOCK_PROVIDER_FORBIDDEN",
    `O provedor "${name}" é exclusivo para testes e não pode operar em produção.`,
    500,
  );
