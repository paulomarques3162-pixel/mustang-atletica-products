import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { BadRequest, Conflict, NotFound } from "../../lib/errors";
import { money, round2, toMoneyString } from "../../lib/money";
import { effectiveUnitPrice } from "../../services/order.service";

type CartWithItems = Prisma.CartGetPayload<{
  include: {
    items: {
      include: {
        product: { include: { images: true } };
        variant: true;
      };
    };
  };
}>;

const cartInclude = {
  items: {
    include: {
      product: { include: { images: { orderBy: { position: "asc" as const }, take: 1 } } },
      variant: true,
    },
  },
} satisfies Prisma.CartInclude;

async function loadCart(cartId: string): Promise<CartWithItems> {
  const cart = await prisma.cart.findUnique({ where: { id: cartId }, include: cartInclude });
  if (!cart) throw NotFound("Carrinho não encontrado.");
  return cart;
}

/** Calcula totais do carrinho no servidor — o frontend nunca decide o preço. */
export function serializeCart(cart: CartWithItems) {
  const items = cart.items.map((item) => {
    const unit = effectiveUnitPrice(item.variant, item.product);
    const total = round2(money(unit).times(item.quantity));
    return {
      id: item.id,
      productId: item.productId,
      variantId: item.variantId,
      name: item.product.name,
      slug: item.product.slug,
      size: item.variant.size,
      color: item.variant.color,
      sku: item.variant.sku,
      image: item.product.images[0]?.url ?? null,
      unitPrice: toMoneyString(unit),
      quantity: item.quantity,
      total: total.toFixed(2),
      availableStock: item.variant.stock,
      active: item.product.active && item.variant.active,
    };
  });

  const subtotal = items.reduce((acc, i) => acc.plus(money(i.total)), money(0));
  const itemCount = items.reduce((acc, i) => acc + i.quantity, 0);

  return {
    id: cart.id,
    items,
    itemCount,
    subtotal: subtotal.toFixed(2),
    currency: "BRL",
  };
}

/** Retorna a visão serializada do carrinho (itens + totais). */
export async function getCartView(cartId: string) {
  return serializeCart(await loadCart(cartId));
}

/** Obtém ou cria o carrinho do usuário/visitante. */
export async function getOrCreateCart(opts: { userId?: string | null; guestToken?: string | null }) {
  if (opts.userId) {
    const existing = await prisma.cart.findFirst({
      where: { userId: opts.userId, status: "active" },
      orderBy: { createdAt: "desc" },
    });
    if (existing) return existing;
    return prisma.cart.create({ data: { userId: opts.userId, status: "active" } });
  }

  if (opts.guestToken) {
    const existing = await prisma.cart.findUnique({ where: { guestToken: opts.guestToken } });
    if (existing) return existing;
  }

  const guestToken = opts.guestToken ?? randomUUID();
  return prisma.cart.create({ data: { guestToken, status: "active" } });
}

export async function addItem(
  cartId: string,
  variantId: string,
  quantity: number,
) {
  if (quantity <= 0) throw BadRequest("Quantidade deve ser positiva.");

  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    include: { product: true },
  });
  if (!variant) throw NotFound("Variação de produto não encontrada.");
  if (!variant.active || !variant.product.active) throw Conflict("Produto indisponível.");

  const existing = await prisma.cartItem.findUnique({
    where: { cartId_variantId: { cartId, variantId } },
  });
  const desired = (existing?.quantity ?? 0) + quantity;
  if (desired > variant.stock) {
    throw Conflict(`Estoque insuficiente. Disponível: ${variant.stock}.`);
  }

  if (existing) {
    await prisma.cartItem.update({ where: { id: existing.id }, data: { quantity: desired } });
  } else {
    await prisma.cartItem.create({ data: { cartId, productId: variant.productId, variantId, quantity } });
  }

  return serializeCart(await loadCart(cartId));
}

export async function updateItem(cartId: string, itemId: string, quantity: number) {
  const item = await prisma.cartItem.findFirst({ where: { id: itemId, cartId } });
  if (!item) throw NotFound("Item do carrinho não encontrado.");

  if (quantity <= 0) {
    await prisma.cartItem.delete({ where: { id: itemId } });
    return serializeCart(await loadCart(cartId));
  }

  const variant = await prisma.productVariant.findUnique({ where: { id: item.variantId } });
  if (!variant) throw NotFound("Variação não encontrada.");
  if (quantity > variant.stock) throw Conflict(`Estoque insuficiente. Disponível: ${variant.stock}.`);

  await prisma.cartItem.update({ where: { id: itemId }, data: { quantity } });
  return serializeCart(await loadCart(cartId));
}

export async function removeItem(cartId: string, itemId: string) {
  const item = await prisma.cartItem.findFirst({ where: { id: itemId, cartId } });
  if (!item) throw NotFound("Item do carrinho não encontrado.");
  await prisma.cartItem.delete({ where: { id: itemId } });
  return serializeCart(await loadCart(cartId));
}

export async function clearCart(cartId: string) {
  await prisma.cartItem.deleteMany({ where: { cartId } });
  return serializeCart(await loadCart(cartId));
}

/** Sincroniza carrinho do visitante com o carrinho do usuário após login. */
export async function mergeGuestCart(guestToken: string, userId: string) {
  const guestCart = await prisma.cart.findUnique({
    where: { guestToken },
    include: { items: true },
  });
  if (!guestCart) return null;

  const userCart = await getOrCreateCart({ userId });

  for (const item of guestCart.items) {
    const variant = await prisma.productVariant.findUnique({ where: { id: item.variantId } });
    if (!variant || !variant.active) continue;

    const existing = await prisma.cartItem.findUnique({
      where: { cartId_variantId: { cartId: userCart.id, variantId: item.variantId } },
    });
    const desired = Math.min((existing?.quantity ?? 0) + item.quantity, variant.stock);
    if (desired <= 0) continue;

    if (existing) {
      await prisma.cartItem.update({ where: { id: existing.id }, data: { quantity: desired } });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: userCart.id,
          productId: item.productId,
          variantId: item.variantId,
          quantity: desired,
        },
      });
    }
  }

  await prisma.cart.update({ where: { id: guestCart.id }, data: { status: "converted" } });
  await prisma.cartItem.deleteMany({ where: { cartId: guestCart.id } });

  return serializeCart(await loadCart(userCart.id));
}
