import type { PaymentMethod, PaymentStatus } from "@prisma/client";
import type {
  ChargeResult,
  CreateChargeInput,
  PaymentProvider,
  ProviderWebhookEvent,
} from "../core/types";
import { ProviderNotConfigured } from "../core/errors";

/**
 * Placeholder para provedores reais ainda não implementados.
 *
 * Regra do projeto: NÃO inventamos endpoints, payloads, credenciais nem webhooks.
 * Enquanto o adapter real não for escrito a partir da DOCUMENTAÇÃO OFICIAL ATUAL
 * do provedor (com credenciais sandbox válidas), este stub responde 503 claro,
 * e o método só aparece como habilitado quando `isConfigured()` for verdadeiro.
 */
export class UnconfiguredProvider implements PaymentProvider {
  constructor(readonly name: string) {}

  isConfigured(): boolean {
    return false;
  }

  enabledMethods(): PaymentMethod[] {
    return [];
  }

  async createCharge(_input: CreateChargeInput): Promise<ChargeResult> {
    throw ProviderNotConfigured(this.name);
  }

  async getCharge(_externalId: string): Promise<ChargeResult | null> {
    throw ProviderNotConfigured(this.name);
  }

  async cancelCharge(_externalId: string): Promise<ChargeResult> {
    throw ProviderNotConfigured(this.name);
  }

  async refundCharge(_externalId: string, _amount?: string): Promise<ChargeResult> {
    throw ProviderNotConfigured(this.name);
  }

  verifyWebhookSignature(_rawBody: string, _headers: Record<string, string | undefined>): boolean {
    throw ProviderNotConfigured(this.name);
  }

  parseWebhook(_rawBody: string, _headers: Record<string, string | undefined>): ProviderWebhookEvent {
    throw ProviderNotConfigured(this.name);
  }
}

export type { PaymentStatus };
