import { prisma } from "../../lib/prisma";
import { NotFound } from "../../lib/errors";
import { audit } from "../../services/audit.service";
import { serializeProduct } from "../catalog/catalog.service";
import { toMoneyString } from "../../lib/money";

/**
 * Ativa/desativa (soft delete) um produto.
 * Regra admin → site: qualquer alteração reflete imediatamente no catálogo,
 * pois o site público lê sempre do banco (nunca de arquivos estáticos).
 */
export async function toggleProductActive(
  productId: string,
  active: boolean,
  actorId: string,
  ip: string | null,
) {
  const existing = await prisma.product.findUnique({ where: { id: productId } });
  if (!existing) throw NotFound("Produto não encontrado.");

  const product = await prisma.product.update({
    where: { id: productId },
    data: { active },
    include: { variants: true, images: { orderBy: { position: "asc" } }, category: true },
  });

  await audit({
    userId: actorId,
    action: active ? "PRODUCT_UPDATED" : "PRODUCT_DELETED",
    entity: "Product",
    entityId: productId,
    metadata: { active, name: product.name, price: toMoneyString(product.basePrice) },
    ip,
  });

  return serializeProduct(product);
}
