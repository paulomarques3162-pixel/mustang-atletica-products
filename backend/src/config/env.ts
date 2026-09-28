import { z } from "zod";

/**
 * Validação de variáveis de ambiente.
 * Falha rápido (fail-fast) em produção quando faltam segredos obrigatórios,
 * para nunca subir um ambiente inseguro silenciosamente.
 */
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  PUBLIC_URL: z.string().url().default("http://localhost:4000"),
  CORS_ORIGINS: z.string().default("http://localhost:3000"),

  DATABASE_URL: z.string().min(1, "DATABASE_URL é obrigatória"),
  DIRECT_URL: z.string().optional(),

  JWT_SECRET: z.string().min(16, "JWT_SECRET deve ter ao menos 16 caracteres"),
  JWT_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("30d"),

  PAYMENT_PROVIDER: z.enum(["mock", "mercadopago", "pagarme", "asaas", "stripe"]).default("mock"),
  PAYMENT_API_KEY: z.string().optional(),
  PAYMENT_SECRET: z.string().optional(),
  PAYMENT_WEBHOOK_SECRET: z.string().optional(),
  PAYMENT_ENVIRONMENT: z.enum(["sandbox", "production"]).default("sandbox"),

  // Frete: enquanto não houver integração real de transportadora configurada,
  // uma taxa fixa opcional pode ser definida pelo lojista. Sem ela, entrega
  // por transportadora é recusada com mensagem clara (nunca inventamos frete).
  SHIPPING_FLAT_FEE: z.string().optional(),

  STORAGE_PROVIDER: z.enum(["local", "s3", "cloudinary", "r2", "supabase"]).default("local"),
  STORAGE_BUCKET: z.string().optional(),
  STORAGE_PUBLIC_URL: z.string().optional(),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),

  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
});

export type Env = z.infer<typeof schema>;

function loadEnv(): Env {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    // eslint-disable-next-line no-console
    console.error(`Configuração de ambiente inválida:\n${issues}`);
    process.exit(1);
  }
  return parsed.data;
}

export const env = loadEnv();

export const isProd = env.NODE_ENV === "production";
export const isTest = env.NODE_ENV === "test";

export const corsOrigins = env.CORS_ORIGINS.split(",")
  .map((o) => o.trim())
  .filter(Boolean);
