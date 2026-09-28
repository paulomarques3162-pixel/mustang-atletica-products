# Pagamentos

## Princípios (não negociáveis)

1. **Nada de pagamento fictício.** Sem QR Code falso, sem aprovação falsa.
2. **`status = paid` só via webhook validado** por assinatura do provedor.
3. **O frontend nunca confirma pagamento.** Abrir a tela de PIX/boleto não paga nada.
4. **Não inventamos endpoints, payloads, credenciais nem webhooks.** Adapters reais são
   escritos a partir da **documentação oficial atual** do provedor.
5. **`MockProvider` é proibido em produção** — lança erro se `NODE_ENV=production`.

## Estrutura

```
backend/src/payments/
├── core/
│   ├── types.ts       # PaymentProvider, CreateChargeInput, ChargeResult, WebhookEvent
│   └── errors.ts      # PaymentError, ProviderNotConfigured, InvalidWebhookSignature…
├── providers/
│   ├── mock.provider.ts          # testes/dev — bloqueado em produção
│   ├── unconfigured.provider.ts  # stub de provedores reais (503 claro)
│   └── registry.ts               # escolhe o provider via PAYMENT_PROVIDER
├── services/
│   └── payment.service.ts        # cobrança, webhook idempotente, estorno, sync
└── webhooks/
    └── payment.webhook.routes.ts # POST /api/webhooks/payment
```

## Interface `PaymentProvider`

```ts
interface PaymentProvider {
  name: string;
  isConfigured(): boolean;
  enabledMethods(): PaymentMethod[];
  createCharge(input): Promise<ChargeResult>;
  getCharge(externalId): Promise<ChargeResult | null>;
  cancelCharge(externalId): Promise<ChargeResult>;
  refundCharge(externalId, amount?): Promise<ChargeResult>;
  verifyWebhookSignature(rawBody, headers): boolean;
  parseWebhook(rawBody, headers): ProviderWebhookEvent;
}
```

## Métodos preparados

`pix`, `credit_card`, `debit_card`, `boleto`, `wallet`, `apple_pay`, `google_pay`.

> A disponibilidade **depende do provedor, conta, contrato, país, bandeira,
> dispositivo e regulamentação**. O sistema expõe apenas os métodos que o provider
> ativo reportar em `enabledMethods()`. Não prometemos que todos estejam disponíveis.

O frontend consulta `GET /health/payment` para saber quais métodos exibir.

## Fluxo PIX

```
Cliente → Checkout → Backend → Provider → Cobrança PIX
        → QR Code / Copia-e-cola → Cliente paga
        → Provider → Webhook → validação de assinatura → idempotência
        → Payment = paid → Order = confirmed → Inventory → Notificação
```

A tela de pagamento exibe QR, copia-e-cola, status e o botão
**“Atualizar status do pagamento”** (`POST /api/payments/:id/refresh`), que consulta o
provedor. Mesmo assim, a confirmação definitiva é o webhook.

## Fluxo Boleto

Cria cobrança → linha digitável + URL → vencimento → status atualizado por webhook.

## Cartão

- **Nunca** armazenamos número completo, CVV ou senha.
- Usamos **tokenização / hosted fields** do provedor. O backend recebe apenas o token.
- Preparado para crédito, parcelamento, bandeiras e antifraude do gateway.

## Webhooks e idempotência

- Corpo cru preservado (`express.json({ verify })`) para validação HMAC.
- Chave de idempotência: tabela `PaymentWebhook` com `@@unique([provider, eventId])`.
- Evento repetido → `{ duplicated: true }`, sem efeito colateral.
- Cada evento gera uma `PaymentTransaction` (histórico/auditoria).
- Falha de processamento é registrada em `PaymentWebhook.error` + `AuditLog`.

## Estorno

`POST /api/admin/payments/:id/refund` (papel MANAGER+). Só para pagamentos `paid`.
Suporta total e parcial. Se o provider não estiver configurado, retorna erro claro —
**não simulamos estorno**. Estorno aprovado devolve estoque (movimento `return`).

## Como implementar um provedor real

1. Escolha o provedor e obtenha as credenciais **sandbox** oficiais.
2. Preencha `PAYMENT_PROVIDER`, `PAYMENT_API_KEY`, `PAYMENT_SECRET`,
   `PAYMENT_WEBHOOK_SECRET`, `PAYMENT_ENVIRONMENT`.
3. Crie `providers/<nome>.provider.ts` implementando `PaymentProvider`, usando
   **somente** os endpoints/payloads da documentação oficial.
4. Registre o provider em `providers/registry.ts`.
5. Configure a URL de webhook no painel do provedor:
   `https://<api-publica>/api/webhooks/payment`.
6. Teste em sandbox: criar cobrança, receber webhook, testar duplicidade, recusa,
   cancelamento e estorno — com o `MockProvider` nos testes automatizados.
7. Só então ajuste `PAYMENT_ENVIRONMENT=production`.

## Testes cobertos hoje (node: mock)

- criação de cobrança PIX com copia-e-cola;
- criação de boleto com linha digitável;
- assinatura de webhook válida / inválida / payload adulterado;
- estorno;
- provider mock bloqueado em produção;
- provider não configurado recusa operações.
