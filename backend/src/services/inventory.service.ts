import { InventoryMovementType, Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { Conflict, NotFound } from "../lib/errors";
import { logger } from "../lib/logger";

type Tx = Prisma.TransactionClient;

/**
 * Baixa/devolução de estoque SEMPRE via transação e update condicional,
 * impedindo estoque negativo sob concorrência (Cliente A x Cliente B).
 */
export async function decrementStock(
  tx: Tx,
  variantId: string,
  quantity: number,
  type: InventoryMovementType,
  orderId?: string,
  reason?: string,
): Promise<void> {
  if (quantity <= 0) throw Conflict("Quantidade inválida para baixa de estoque.");

  // updateMany condicional garante atomicidade: só decrementa se houver saldo.
  const result = await tx.productVariant.updateMany({
    where: { id: variantId, stock: { gte: quantity }, active: true },
    data: { stock: { decrement: quantity } },
  });

  if (result.count === 0) {
    const variant = await tx.productVariant.findUnique({ where: { id: variantId } });
    if (!variant) throw NotFound("Variação de produto não encontrada.");
    throw Conflict(
      `Estoque insuficiente para ${variant.sku}. Disponível: ${variant.stock}.`,
    );
  }

  await tx.inventoryMovement.create({
    data: { variantId, type, quantity, orderId, reason },
  });
}

/** Devolve estoque (cancelamento, estorno, devolução). */
export async function incrementStock(
  tx: Tx,
  variantId: string,
  quantity: number,
  type: InventoryMovementType,
  orderId?: string,
  reason?: string,
): Promise<void> {
  if (quantity <= 0) throw Conflict("Quantidade inválida para entrada de estoque.");

  await tx.productVariant.update({
    where: { id: variantId },
    data: { stock: { increment: quantity } },
  });

  await tx.inventoryMovement.create({
    data: { variantId, type, quantity, orderId, reason },
  });
}

/** Ajuste administrativo — define o estoque absoluto e registra a diferença. */
export async function setStockAbsolute(
  variantId: string,
  newStock: number,
  performedById: string,
  reason?: string,
): Promise<void> {
  if (newStock < 0) throw Conflict("Estoque não pode ser negativo.");

  await prisma.$transaction(async (tx) => {
    const variant = await tx.productVariant.findUnique({ where: { id: variantId } });
    if (!variant) throw NotFound("Variação não encontrada.");
    const delta = newStock - variant.stock;
    if (delta === 0) return;

    await tx.productVariant.update({ where: { id: variantId }, data: { stock: newStock } });
    await tx.inventoryMovement.create({
      data: {
        variantId,
        type: "adjustment",
        quantity: Math.abs(delta),
        reason: reason ?? `Ajuste administrativo (${delta > 0 ? "+" : "-"}${Math.abs(delta)})`,
        performedById,
      },
    });
    logger.info({ variantId, from: variant.stock, to: newStock, performedById }, "stock_adjusted");
  });
}
