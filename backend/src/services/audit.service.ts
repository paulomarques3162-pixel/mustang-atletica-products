import { AuditAction, Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { logger } from "../lib/logger";

interface AuditInput {
  userId?: string | null;
  action: AuditAction;
  entity?: string;
  entityId?: string;
  metadata?: Prisma.InputJsonValue;
  ip?: string | null;
  result?: "success" | "failure";
}

/**
 * Registra eventos de auditoria administrativa e operacional.
 * Nunca gravar senhas, tokens, CVV ou segredos em metadata.
 */
export async function audit(input: AuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: input.userId ?? null,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        metadata: input.metadata,
        ip: input.ip ?? null,
        result: input.result ?? "success",
      },
    });
  } catch (err) {
    // Auditoria nunca deve derrubar a operação principal.
    logger.error({ err, action: input.action }, "Falha ao registrar auditoria");
  }
}
