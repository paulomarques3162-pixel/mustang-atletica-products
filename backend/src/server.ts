import { createApp } from "./app";
import { env } from "./config/env";
import { logger } from "./lib/logger";
import { prisma } from "./lib/prisma";

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(
    { port: env.PORT, env: env.NODE_ENV, payment: env.PAYMENT_PROVIDER },
    "Mustang Atlética API iniciada",
  );
});

/**
 * Graceful shutdown: fecha o servidor HTTP e a conexão Prisma.
 * Necessário no Render para não derrubar requisições em andamento em deploys.
 */
async function shutdown(signal: string) {
  logger.info({ signal }, "Encerrando servidor...");
  server.close(async (err) => {
    if (err) {
      logger.error({ err }, "Erro ao fechar servidor");
      process.exit(1);
    }
    await prisma.$disconnect();
    logger.info("Servidor encerrado com sucesso");
    process.exit(0);
  });

  // força saída após 10s se algo travar
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "unhandledRejection");
});
process.on("uncaughtException", (err) => {
  logger.error({ err }, "uncaughtException");
  void shutdown("uncaughtException");
});
