# Arquitetura

## Visão geral

```
┌────────────────────┐        HTTPS/REST        ┌─────────────────────────┐
│  Vercel            │  ───────────────────────▶ │  Render                 │
│  Next.js (App R.)  │   Authorization: Bearer   │  Node/Express (TS)      │
│  • loja pública    │ ◀───────────────────────  │  • API /api/*           │
│  • painel admin    │        cookies            │  • webhooks /api/webhooks│
└────────────────────┘                           └───────────┬─────────────┘
                                                              │ Prisma
                                                              ▼
                                                   ┌─────────────────────┐
                                                   │  Neon PostgreSQL    │
                                                   └─────────────────────┘

Pagamentos: Frontend → Backend → PaymentProvider → Gateway → Webhook (assinatura)
```

## Camadas do backend

| Camada | Diretório | Responsabilidade |
|---|---|---|
| Config | `src/config/env.ts` | Validação fail-fast das variáveis de ambiente |
| Lib | `src/lib` | Prisma, erros tipados, JWT, dinheiro (Decimal), logger, slug |
| Middleware | `src/middleware` | Auth/RBAC, validação Zod, rate limit, tratador de erros |
| Services | `src/services` | Regras de negócio: pedido, estoque, cupom, frete, auditoria |
| Modules | `src/modules` | Rotas + serviços por domínio |
| Payments | `src/payments` | Núcleo de pagamentos desacoplado de provedor |

### Princípios

1. **O servidor é a fonte de verdade.** Preços, descontos, frete, estoque e total são
   recalculados no backend. O frontend nunca decide quanto o cliente paga.
2. **Estoque com atomicidade.** A baixa usa `updateMany` condicional
   (`stock >= quantidade`) dentro de transação Prisma — impossível vender acima do
   estoque sob concorrência.
3. **Idempotência.** Cobranças usam `idempotencyKey` (constraint única) e webhooks usam
   a chave composta `(provider, eventId)`.
4. **RBAC no backend.** Toda rota `/api/admin` valida papel via middleware.
5. **Erros padronizados.** Respostas `{ error: { code, message, details? } }` com os
   status 400/401/403/404/409/422/429/500. Stack trace nunca vai ao cliente.

## Modelo de dados

Entidades principais (ver `backend/prisma/schema.prisma`):

`User`, `Session`, `PasswordResetToken`, `Address`, `Category`, `Product`,
`ProductVariant`, `ProductImage`, `InventoryMovement`, `Cart`, `CartItem`, `Order`,
`OrderItem`, `OrderEvent`, `Payment`, `PaymentTransaction`, `PaymentWebhook`, `Refund`,
`Coupon`, `CouponCategory`, `CouponProduct`, `CouponUsage`, `Wishlist`, `Review`,
`AuditLog`, `StoreSettings`, `Banner`.

Convenções:

- IDs `cuid()`; timestamps `createdAt`/`updatedAt`.
- Valores monetários em `Decimal(12,2)`.
- Índices em FKs, status e slugs; `@unique` em slug/SKU/códigos/idempotência.
- `onDelete` explícito (Cascade/SetNull) preservando integridade referencial.

## Fluxo de checkout

```
Cliente → POST /api/checkout
  1. Validação Zod do payload
  2. Resolução do cliente (conta ou dados informados)
  3. Itens: do body (visitante) ou do carrinho do usuário (servidor)
  4. Transação Prisma:
       - recalcula preço unitário (variação > promocional > base)
       - valida cupom e incrementa uso condicionalmente
       - calcula frete (adapter) e total
       - cria Order + OrderItems
       - baixa estoque (condicional) e registra InventoryMovement
  5. Cria cobrança (idempotente) no provedor configurado
  6. Limpa carrinho do usuário
  7. Retorna { order, payment, paymentPending, paymentError }
```

## Frontend

- **App Router** com Server Components para SEO (home, catálogo, produto, sitemap) e
  Client Components para interação (cart, checkout, admin).
- **Contexts**: `AuthProvider` (sessão + merge de carrinho), `CartProvider`.
- **Design system** em `globals.css` + tokens no `tailwind.config.ts`
  (verde profundo, dourado, off-white).
- **Estados de UI** padronizados: loading, skeleton, empty, error, retry, success.
- **Admin** isolado por `SiteChrome` (sem cabeçalho/rodapé da loja).

## Decisões e trade-offs

| Decisão | Motivo | Trade-off |
|---|---|---|
| Baixa de estoque na criação do pedido | Evita venda acima do estoque | Pedidos não pagos reservam estoque; cancelamento devolve |
| Access token em memória | Reduz exposição a XSS | Exige refresh de sessão |
| Refresh token em localStorage (fallback) | Cookies cross-origin (Vercel→Render) podem ser bloqueados | Mitigado por rotação e revogação de sessão |
| Provider de pagamento desacoplado | Trocar gateway sem reescrever a loja | Adapters reais precisam de implementação oficial |
| Sem frete inventado | Honestidade de dados | Envio só libera com taxa fixa/integração real |
