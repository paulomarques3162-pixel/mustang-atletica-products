# Variáveis de ambiente

Nunca comite arquivos `.env` reais. Use `backend/.env.example` e
`frontend/.env.example` como referência.

## Backend (`backend/.env`)

| Variável | Obrigatória | Descrição |
|---|---|---|
| `NODE_ENV` | sim | `development` \| `test` \| `production` |
| `PORT` | não | Porta HTTP (padrão 4000) |
| `PUBLIC_URL` | sim | URL pública da API (usada em links/callbacks) |
| `CORS_ORIGINS` | sim | Origens permitidas, separadas por vírgula |
| `DATABASE_URL` | sim | Conexão PostgreSQL (pooler do Neon) |
| `DIRECT_URL` | não | Conexão direta para migrations |
| `JWT_SECRET` | sim | Segredo de assinatura (≥ 16 caracteres) |
| `JWT_EXPIRES_IN` | não | Validade do access token (padrão `15m`) |
| `JWT_REFRESH_EXPIRES_IN` | não | Validade do refresh token (padrão `30d`) |
| `PAYMENT_PROVIDER` | sim | `mock` \| `mercadopago` \| `pagarme` \| `asaas` \| `stripe` |
| `PAYMENT_API_KEY` | condicional | Chave do provedor de pagamento |
| `PAYMENT_SECRET` | condicional | Segredo do provedor |
| `PAYMENT_WEBHOOK_SECRET` | condicional | Segredo de assinatura do webhook |
| `PAYMENT_ENVIRONMENT` | não | `sandbox` \| `production` |
| `SHIPPING_FLAT_FEE` | não | Taxa fixa de entrega (sem integração de transportadora) |
| `STORAGE_PROVIDER` | não | `local` \| `s3` \| `cloudinary` \| `r2` \| `supabase` |
| `STORAGE_BUCKET` | condicional | Bucket/coleção do storage |
| `STORAGE_PUBLIC_URL` | condicional | Domínio público do storage |
| `RATE_LIMIT_WINDOW_MS` | não | Janela do rate limit global (padrão 60000) |
| `RATE_LIMIT_MAX` | não | Máximo por janela (padrão 120) |
| `AUTH_RATE_LIMIT_MAX` | não | Máximo de tentativas de login (padrão 10) |
| `LOG_LEVEL` | não | Nível do log (`info`) |
| `ALLOW_SEED` | não | `true` libera o seed **em desenvolvimento** |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | não | Admin criado pelo seed |

## Frontend (`frontend/.env.local` / Vercel)

| Variável | Obrigatória | Descrição |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | sim | URL pública da loja (canonical, OG, sitemap, share) |
| `NEXT_PUBLIC_API_URL` | sim | URL pública da API (Render em produção) |
| `NEXT_PUBLIC_ANALYTICS_ID` | não | Habilita envio de eventos anônimos; vazio = sem rastreamento |

## Regras

- **Secrets de pagamento nunca no frontend.** O frontend fala só com o backend.
- `NEXT_PUBLIC_*` é exposto ao navegador — nunca coloque segredos ali.
- O backend valida o ambiente no boot e **falha rápido** se faltar algo obrigatório.
- Nenhum valor real é fornecido no repositório.
