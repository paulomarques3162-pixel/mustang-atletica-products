# Deploy — Vercel + Render + Neon

> Nada abaixo foi executado neste ambiente (não há contas/credenciais). São os passos
> reais para publicar. Enquanto não forem feitos, o sistema está **pronto para deploy**,
> mas **não implantado**.

## 1. Neon (PostgreSQL)

1. Crie o projeto em https://neon.tech (região próxima dos usuários).
2. Copie duas strings de conexão:
   - **Pooled** (com `-pooler`) → `DATABASE_URL`
   - **Direct** → `DIRECT_URL`
3. Aplique as migrations a partir do Render (start command) ou localmente:
   ```bash
   cd backend
   DATABASE_URL=... DIRECT_URL=... npx prisma migrate deploy
   ```
4. Confirme: `GET /health/db` deve retornar `{ "status": "ok" }`.

## 2. Render (backend)

**Opção A — Blueprint:** o repositório inclui `render.yaml`. Em Render → New → Blueprint,
selecione o repositório.

**Opção B — Manual:**

| Config | Valor |
|---|---|
| Root Directory | `backend` |
| Build Command | `npm ci && npm run build:render` |
| Start Command | `npm run start:render` |
| Health Check Path | `/health` |
| Node version | ≥ 20 |

Variáveis obrigatórias (Environment):

```
NODE_ENV=production
PORT=4000
PUBLIC_URL=https://SEU-BACKEND.onrender.com
DATABASE_URL=postgresql://...-pooler...?sslmode=require
DIRECT_URL=postgresql://...?sslmode=require
JWT_SECRET=<segredo longo e aleatório>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d
CORS_ORIGINS=https://SUA-LOJA.vercel.app
PAYMENT_PROVIDER=mock            # trocar por provedor real depois
PAYMENT_ENVIRONMENT=sandbox
```

> `start:render` executa `prisma migrate deploy` (aplica apenas migrations pendentes —
> não destrutivo). **Nunca** rodamos seed em produção; o seed é bloqueado se
> `NODE_ENV=production`.

## 3. Vercel (frontend)

1. Importe o repositório. **Root Directory:** `frontend`.
2. Build Command: `npm run build` · Install: `npm ci`.
3. Variáveis:
   ```
   NEXT_PUBLIC_APP_URL=https://SUA-LOJA.vercel.app
   NEXT_PUBLIC_API_URL=https://SEU-BACKEND.onrender.com
   ```
4. Deploy. Depois, atualize `CORS_ORIGINS` no Render com o domínio final da Vercel.

## 4. Ordem correta

1. Neon criado
2. Render com `DATABASE_URL`/`DIRECT_URL` + deploy (migrations aplicam)
3. Testar `https://<backend>/health`, `/health/db`, `/health/payment`
4. Vercel apontando `NEXT_PUBLIC_API_URL` para o backend
5. Atualizar `CORS_ORIGINS` no Render
6. Criar administrador (ver abaixo)
7. Cadastrar categorias/produtos reais no painel
8. Configurar storage externo de imagens
9. Configurar provedor de pagamento real + webhook
10. Configurar frete (integração ou taxa fixa) e e-mail transacional

## 5. Criar o administrador em produção

O seed é bloqueado em produção. Crie o primeiro admin com um script seguro (defina a
senha por variável de ambiente e nunca a exponha em logs):

```bash
# Exemplo de uso único no shell do Render
cd backend
node -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const p = new PrismaClient();
(async () => {
  const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);
  await p.user.upsert({
    where: { email: process.env.ADMIN_EMAIL.toLowerCase() },
    update: { role: 'ADMIN' },
    create: { email: process.env.ADMIN_EMAIL.toLowerCase(), name: 'Administrador', passwordHash: hash, role: 'ADMIN' },
  });
  console.log('Admin pronto');
  await p.\$disconnect();
})();
"
```

## 6. Checklist de produção

- [ ] HTTPS ativo (Vercel/Render fornecem automaticamente)
- [ ] `CORS_ORIGINS` contém apenas o domínio real
- [ ] `JWT_SECRET` forte e exclusivo
- [ ] Nenhum `localhost` em variáveis de produção
- [ ] `/health/db` OK
- [ ] Storage externo de imagens configurado (não usar disco do Render)
- [ ] Provedor de pagamento real + URL de webhook cadastrada no gateway
- [ ] Provedor de e-mail para redefinição de senha e notificações
- [ ] Backup/point-in-time do Neon habilitado
- [ ] `PAYMENT_PROVIDER` diferente de `mock`
