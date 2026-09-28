import express, { Request } from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import { corsOrigins, env, isProd } from "./config/env";
import { logger } from "./lib/logger";
import { globalLimiter } from "./middleware/rateLimit";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { authRouter } from "./modules/auth/auth.routes";
import { catalogRouter } from "./modules/catalog/catalog.routes";
import { cartRouter } from "./modules/cart/cart.routes";
import { checkoutRouter } from "./modules/checkout/checkout.routes";
import { ordersRouter } from "./modules/orders/orders.routes";
import { accountRouter } from "./modules/account/account.routes";
import { adminRouter } from "./modules/admin/admin.routes";
import { paymentWebhookRouter } from "./payments/webhooks/payment.webhook.routes";
import { healthRouter } from "./modules/health/health.routes";

export function createApp() {
  const app = express();

  // Necessário no Render/Vercel (proxy reverso) para IP correto e rate limit.
  app.set("trust proxy", 1);

  // ---- Segurança de cabeçalhos ----
  app.use(
    helmet({
      contentSecurityPolicy: isProd ? undefined : false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
      hsts: isProd ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
    }),
  );

  // ---- CORS ----
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) return callback(null, true); // curl/SSR/webhooks
        if (corsOrigins.includes(origin)) return callback(null, true);
        return callback(new Error(`Origem não permitida pelo CORS: ${origin}`));
      },
      credentials: true,
      methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "Idempotency-Key", "X-Mock-Signature"],
      maxAge: 86400,
    }),
  );

  // Guarda o corpo cru para validação de assinatura de webhook.
  app.use(
    express.json({
      limit: "1mb",
      verify: (req: Request & { rawBody?: string }, _res, buf) => {
        req.rawBody = buf.toString("utf8");
      },
    }),
  );
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));
  app.use(cookieParser());

  if (!isProd) {
    app.use(pinoHttp({ logger }));
  }

  // ---- Rate limit global ----
  app.use("/api", globalLimiter);

  // ---- Health checks (sem rate limit pesado) ----
  app.use("/", healthRouter);

  // ---- Webhooks (raw body já disponível) ----
  app.use("/api/webhooks", paymentWebhookRouter);

  // ---- Rotas públicas/autenticadas ----
  app.use("/api/auth", authRouter);
  app.use("/api", catalogRouter);
  app.use("/api", cartRouter);
  app.use("/api", checkoutRouter);
  app.use("/api", ordersRouter);
  app.use("/api", accountRouter);
  app.use("/api/admin", adminRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export { env };
