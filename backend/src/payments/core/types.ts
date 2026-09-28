import type { PaymentMethod, PaymentStatus } from "@prisma/client";

/**
 * Contrato de provedor de pagamento.
 * A arquitetura é desacoplada: a loja fala com esta interface, nunca
 * diretamente com um gateway. Trocar de provedor = trocar o adapter.
 */
export interface CreateChargeInput {
  orderId: string;
  orderNumber: string;
  amount: string; // decimal como string, ex "199.90"
  currency: string; // "BRL"
  method: PaymentMethod;
  customer: {
    name: string;
    email: string;
    document?: string | null;
    phone?: string | null;
  };
  /** Chave de idempotência repassada ao provedor quando suportado. */
  idempotencyKey: string;
  description?: string;
  /** Dados específicos do método, já tokenizados quando aplicável. */
  card?: {
    token?: string;
    installments?: number;
    paymentMethodId?: string;
  };
  returnUrl?: string;
  notificationUrl?: string;
  expiresInSeconds?: number;
}

export interface ChargeResult {
  externalId: string;
  status: PaymentStatus;
  method: PaymentMethod;
  amount: string;
  /** PIX */
  qrCodeImage?: string;
  qrCodeText?: string;
  /** Boleto */
  boletoUrl?: string;
  boletoLine?: string;
  expiresAt?: Date;
  raw?: Record<string, unknown>;
}

export interface ProviderWebhookEvent {
  /** ID único do evento no provedor — usado para idempotência. */
  eventId: string;
  eventType: string;
  /** ID da cobrança no provedor. */
  externalId: string;
  status: PaymentStatus;
  amount?: string;
  raw: Record<string, unknown>;
}

export interface PaymentProvider {
  readonly name: string;
  /** Métodos efetivamente habilitados nesta conta/contrato. */
  enabledMethods(): PaymentMethod[];
  /** Indica se o provedor está configurado (credenciais presentes). */
  isConfigured(): boolean;
  createCharge(input: CreateChargeInput): Promise<ChargeResult>;
  getCharge(externalId: string): Promise<ChargeResult | null>;
  cancelCharge(externalId: string): Promise<ChargeResult>;
  refundCharge(externalId: string, amount?: string): Promise<ChargeResult>;
  /** Valida a assinatura do webhook. Retorna false se inválida. */
  verifyWebhookSignature(rawBody: string, headers: Record<string, string | undefined>): boolean;
  parseWebhook(rawBody: string, headers: Record<string, string | undefined>): ProviderWebhookEvent;
}
