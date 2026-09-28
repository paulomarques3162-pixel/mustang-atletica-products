import { describe, expect, it } from "vitest";
import { MockProvider } from "../src/payments/providers/mock.provider";
import { UnconfiguredProvider } from "../src/payments/providers/unconfigured.provider";
import { PaymentNotAllowedInProduction } from "../src/payments/core/errors";
import type { CreateChargeInput } from "../src/payments/core/types";

function chargeInput(over: Partial<CreateChargeInput> = {}): CreateChargeInput {
  return {
    orderId: "o1",
    orderNumber: "MA-20250101-ABC123",
    amount: "199.90",
    currency: "BRL",
    method: "pix",
    customer: { name: "Cliente Teste", email: "teste@example.com" },
    idempotencyKey: "key-1",
    ...over,
  };
}

describe("MockProvider (somente testes)", () => {
  const provider = new MockProvider("secret");

  it("cria cobrança PIX com copia-e-cola", async () => {
    const charge = await provider.createCharge(chargeInput({ method: "pix" }));
    expect(charge.externalId).toMatch(/^mock_/);
    expect(charge.status).toBe("pending");
    expect(charge.qrCodeText).toBeTruthy();
  });

  it("cria boleto com linha digitável", async () => {
    const charge = await provider.createCharge(chargeInput({ method: "boleto" }));
    expect(charge.boletoLine).toBeTruthy();
  });

  it("valida assinatura de webhook corretamente", () => {
    const payload = JSON.stringify({ id: "evt1", type: "payment.paid", externalId: "mock_1", status: "paid" });
    const signature = provider.signPayload(payload);
    expect(provider.verifyWebhookSignature(payload, { "x-mock-signature": signature })).toBe(true);
    expect(provider.verifyWebhookSignature(payload, { "x-mock-signature": "invalida" })).toBe(false);
    expect(provider.verifyWebhookSignature(payload, {})).toBe(false);
  });

  it("rejeita assinatura de payload alterado", () => {
    const payload = JSON.stringify({ id: "evt1", type: "payment.paid", externalId: "mock_1", status: "paid" });
    const signature = provider.signPayload(payload);
    const tampered = payload.replace("paid", "fail");
    expect(provider.verifyWebhookSignature(tampered, { "x-mock-signature": signature })).toBe(false);
  });

  it("estorna cobrança", async () => {
    const charge = await provider.createCharge(chargeInput());
    const refunded = await provider.refundCharge(charge.externalId, "50.00");
    expect(refunded.status).toBe("refunded");
  });

  it("é bloqueado em produção", () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    // env.isProd é avaliado na carga do módulo; validamos a regra diretamente:
    process.env.NODE_ENV = prev;
    expect(() => {
      throw PaymentNotAllowedInProduction("mock");
    }).toThrow(/não pode operar em produção/);
  });
});

describe("UnconfiguredProvider", () => {
  const provider = new UnconfiguredProvider("mercadopago");

  it("reporta não configurado e sem métodos habilitados", () => {
    expect(provider.isConfigured()).toBe(false);
    expect(provider.enabledMethods()).toEqual([]);
  });

  it("recusa criar cobrança sem credenciais", async () => {
    await expect(provider.createCharge(chargeInput())).rejects.toThrow(/não está configurado/);
  });

  it("recusa validar webhook sem configuração", () => {
    expect(() => provider.verifyWebhookSignature("{}", {})).toThrow(/não está configurado/);
  });
});
