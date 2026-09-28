import { Router } from "express";
import { prisma } from "../../lib/prisma";
import { getPaymentProvider } from "../../payments/providers/registry";
import { env } from "../../config/env";

export const healthRouter = Router();

/** GET /health — liveness (não expõe segredos). */
healthRouter.get("/health", (_req, res) => {
  res.json({ status: "ok", uptime: Math.round(process.uptime()) });
});

/** GET /health/db — verifica conexão real com o PostgreSQL (Neon). */
healthRouter.get("/health/db", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", database: "connected", provider: "postgresql" });
  } catch {
    res.status(503).json({ status: "error", database: "unreachable" });
  }
});

/** GET /health/payment — informa se há provedor de pagamento configurado. */
healthRouter.get("/health/payment", (_req, res) => {
  const provider = getPaymentProvider();
  res.json({
    status: provider.isConfigured() ? "ok" : "not_configured",
    provider: provider.name,
    environment: env.PAYMENT_ENVIRONMENT,
    enabledMethods: provider.enabledMethods(),
    productionReady: provider.name !== "mock" && provider.isConfigured(),
  });
});
