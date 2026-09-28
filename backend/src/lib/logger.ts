import pino from "pino";
import { env, isProd } from "../config/env";

/**
 * Logger estruturado. Nunca registramos senhas, tokens, CVV ou segredos —
 * apenas identificadores e eventos operacionais.
 */
export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "password",
      "passwordHash",
      "token",
      "refreshToken",
      "card.number",
      "card.cvv",
      "*.apiKey",
      "*.secret",
      "*.webhookSecret",
    ],
    censor: "[REDACTED]",
  },
  transport: isProd
    ? undefined
    : { target: "pino-pretty", options: { colorize: true, translateTime: "SYS:standard" } },
});
