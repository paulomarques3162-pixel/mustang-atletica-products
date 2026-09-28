# Mustang Atlética — Loja Oficial

E-commerce completo da **Mustang Atlética** (Medicina Veterinária — Anhanguera).

> **Status honesto:** frontend e backend **compilam e passam nos testes**; o fluxo
> catálogo → carrinho → checkout → pedido → pagamento (arquitetura) → admin está
> **implementado**. Integrações que dependem de credenciais/serviços externos
> (pagamento real, storage, frete, e-mail, Neon/Render/Vercel) estão **marcadas como
> pendentes** — nada é apresentado como funcionando sem validação real. Ver
> [`docs/AUDIT.md`](docs/AUDIT.md) para a classificação completa.

---

## 1. Arquitetura

```
Vercel (frontend Next.js)
        │  HTTPS / REST
        ▼
Render (backend Node/Express + TypeScript)
        │  Prisma
        ▼
Neon (PostgreSQL)

Pagamentos:  Frontend → Backend → PaymentProvider (adapter) → Gateway → Webhook validado
```

- **Frontend** (`frontend/`): Next.js 14 (App Router), TypeScript, Tailwind CSS, design system próprio.
- **Backend** (`backend/`): Express + TypeScript, Prisma, Zod, JWT, RBAC, rate limiting, auditoria.
- **Banco** (`backend/prisma/`): PostgreSQL (Neon), migração inicial versionada, seed DEMO separado.
- **Pagamentos** (`backend/src/payments/`): arquitetura de providers desacoplada (core/providers/services/webhooks).

Detalhes em [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## 2. Tecnologias

| Camada | Stack |
|---|---|
| Frontend | Next.js 14, React 18, TypeScript, Tailwind CSS |
| Backend | Node.js, Express, TypeScript, Zod, JWT, Pino |
| Banco | PostgreSQL (Neon) + Prisma ORM |
| Segurança | Helmet, CORS, rate limit, bcrypt, RBAC, auditoria |
| Testes | Vitest (+ Supertest disponível para integração) |

## 3. Estrutura do projeto

```
mustang-atletica/
├── backend/
│   ├── prisma/            # schema, migrations, seed (DEMO)
│   ├── src/
│   │   ├── config/        # env, validação
│   │   ├── lib/           # prisma, erros, jwt, money, logger
│   │   ├── middleware/    # auth/RBAC, validação, rate limit, erros
│   │   ├── modules/       # auth, catalog, cart, checkout, orders, account, admin, health
│   │   ├── payments/      # core, providers, services, webhooks
│   │   └── services/      # order, inventory, coupon, shipping, audit
│   └── tests/             # testes unitários (Vitest)
├── frontend/
│   ├── app/               # rotas (loja + admin)
│   ├── components/        # design system e componentes
│   ├── lib/               # api client, contexts, formatação, share, analytics
│   └── public/            # assets da marca
├── docs/                  # arquitetura, pagamentos, deploy, ambiente, auditoria
├── render.yaml            # blueprint do backend no Render
├── .github/workflows/ci.yml
└── README.md
```

## 4. Instalação

Pré-requisitos: **Node.js ≥ 20** e um banco PostgreSQL (Neon).

```bash
# Backend
cd backend
npm install
cp .env.example .env          # preencha DATABASE_URL, DIRECT_URL, JWT_SECRET
npx prisma generate
npx prisma migrate dev        # cria o schema no banco de desenvolvimento
npm run dev                   # API em http://localhost:4000

# Frontend (em outro terminal)
cd frontend
npm install
cp .env.example .env.local    # NEXT_PUBLIC_API_URL=http://localhost:4000
npm run dev                   # loja em http://localhost:3000
```

## 5. Comandos reais

**Backend**

| Comando | O que faz |
|---|---|
| `npm run dev` | Sobe a API com reload (tsx watch) |
| `npm run build` | `prisma generate` + compila TypeScript para `dist/` |
| `npm start` | Executa `dist/server.js` |
| `npm run typecheck` | Checagem de tipos sem emitir |
| `npm test` | Testes unitários (Vitest) |
| `npx prisma generate` | Gera o Prisma Client |
| `npx prisma migrate dev` | Cria/aplica migrations em desenvolvimento |
| `npx prisma migrate deploy` | Aplica migrations pendentes (usado em produção) |
| `npx prisma studio` | Interface visual do banco |
| `ALLOW_SEED=true npm run seed` | Popula o banco com dados **DEMO** (bloqueado em produção) |

**Frontend**

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento (porta 3000) |
| `npm run build` | Build de produção |
| `npm start` | Servidor de produção |
| `npm run typecheck` | Checagem de tipos |
| `npm run lint` | ESLint (Padrão Next) |

## 6. Banco de dados (Neon)

1. Crie um projeto no [Neon](https://neon.tech) e copie as duas URLs de conexão.
2. Em `backend/.env`:
   - `DATABASE_URL` → conexão **pooler** (PgBouncer), com `?sslmode=require`.
   - `DIRECT_URL` → conexão **direta** (necessária para migrations Prisma).
3. Aplique a migração inicial:
   ```bash
   npx prisma migrate deploy
   ```
4. Verifique a conexão real:
   ```bash
   curl http://localhost:4000/health/db
   # { "status": "ok", "database": "connected", "provider": "postgresql" }
   ```

Valores monetários usam `Decimal(12,2)` no banco — **nunca** ponto flutuante.

## 7. Variáveis de ambiente

Documentadas em [`docs/ENVIRONMENT.md`](docs/ENVIRONMENT.md), com os arquivos
`backend/.env.example` e `frontend/.env.example`. Nunca comite o `.env` real.

## 8. Pagamentos

Arquitetura em `backend/src/payments/`:

```
core/        contratos (PaymentProvider) e erros
providers/   mock (testes) + unconfigured (stub de provedores reais)
services/    criação de cobrança, webhooks idempotentes, estorno
webhooks/    POST /api/webhooks/payment
```

- **`mock`** — apenas desenvolvimento/testes; **bloqueado em produção**.
- **`mercadopago` | `pagarme` | `asaas` | `stripe`** — placeholders que respondem
  `503` claramente até o adapter oficial ser implementado com
  **documentação oficial + credenciais sandbox**.

> Nada de QR Code falso, aprovação falsa ou `status = paid` sem confirmação do
> provedor. Um pagamento só é confirmado por **webhook validado por assinatura**.

Detalhes e fluxo completo em [`docs/PAYMENTS.md`](docs/PAYMENTS.md).

## 9. Webhooks

`POST /api/webhooks/payment` — fluxo:

```
Provider → validação de assinatura → idempotência (provider,eventId)
        → PaymentTransaction → Payment → Order → Inventory → AuditLog
```

O corpo cru é preservado para validação HMAC. Eventos duplicados são ignorados.

## 10. Painel administrativo

Acesso discreto pelo rodapé: **“Área restrita”** → `/admin/login`.

Papéis (RBAC): `SUPPORT < EDITOR < MANAGER < ADMIN`. As permissões são validadas
no backend em **toda** rota `/api/admin` — nunca apenas na interface.

Módulos: Dashboard, Produtos, Categorias, Estoque, Pedidos, Pagamentos, Clientes,
Cupons, Auditoria.

## 11. Testes

```bash
cd backend && npm test      # 25 testes unitários
```

Cobrem: precisão monetária (Decimal), cálculo de cupom, preço efetivo de variação,
número de pedido, assinatura de webhook, idempotência de assinatura e bloqueio do
provider mock em produção.

## 12. Deploy

- **Backend (Render):** use `render.yaml` (build `npm ci && npm run build:render`,
  start `npm run start:render` com `prisma migrate deploy`, health check `/health`).
- **Frontend (Vercel):** aponte a raiz para `frontend/` e configure
  `NEXT_PUBLIC_API_URL` e `NEXT_PUBLIC_APP_URL`.

Passo a passo em [`docs/DEPLOY.md`](docs/DEPLOY.md).

## 13. Troubleshooting

| Sintoma | Causa provável | Solução |
|---|---|---|
| `Configuração de ambiente inválida` no boot | `DATABASE_URL`/`JWT_SECRET` ausentes | Preencha `backend/.env` |
| `/health/db` retorna 503 | Conexão Neon incorreta | Confira `DATABASE_URL` (pooler) e `DIRECT_URL` |
| CORS bloqueado | Origem não listada | Ajuste `CORS_ORIGINS` no backend |
| Loja sem produtos | Seed não executado / API fora | Rode `ALLOW_SEED=true npm run seed` (dev) e confira `NEXT_PUBLIC_API_URL` |
| Pagamento indisponível | Provider não configurado | Esperado até configurar um provedor real |
| `PAYMENT_PROVIDER_NOT_CONFIGURED` | Adapter real não implementado | Implemente o adapter oficial com credenciais |

## 14. Documentação

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- [`docs/PAYMENTS.md`](docs/PAYMENTS.md)
- [`docs/DEPLOY.md`](docs/DEPLOY.md)
- [`docs/ENVIRONMENT.md`](docs/ENVIRONMENT.md)
- [`docs/AUDIT.md`](docs/AUDIT.md) — relatório de auditoria e o que está pendente
