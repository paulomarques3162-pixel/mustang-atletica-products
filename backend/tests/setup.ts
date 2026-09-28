/**
 * Ambiente mínimo para testes unitários.
 * Integrações que exigem banco real ficam em teste separado, marcados como
 * "skipped" quando TEST_DATABASE_URL não está presente — nunca fingimos um
 * teste de integração.
 */
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = process.env.JWT_SECRET ?? "test-secret-please-change-in-prod";
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL ?? "postgresql://user:pass@localhost:5432/test";
process.env.PAYMENT_PROVIDER = "mock";
process.env.PAYMENT_WEBHOOK_SECRET = "mock-webhook-secret";
process.env.LOG_LEVEL = "fatal";
