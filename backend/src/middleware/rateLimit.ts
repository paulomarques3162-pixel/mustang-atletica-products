import rateLimit from "express-rate-limit";
import { env } from "../config/env";

/** Limite global de requisições por IP. */
export const globalLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: { code: "TOO_MANY_REQUESTS", message: "Muitas requisições. Tente novamente em instantes." },
  },
});

/** Limite agressivo para autenticação (anti brute-force). */
export const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    error: { code: "TOO_MANY_REQUESTS", message: "Muitas tentativas. Aguarde alguns minutos." },
  },
});

/** Limite para criação de pagamentos / checkout. */
export const checkoutLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: { code: "TOO_MANY_REQUESTS", message: "Muitas operações de checkout. Tente novamente." },
  },
});
