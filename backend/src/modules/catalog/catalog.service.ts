import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { NotFound } from "../../lib/errors";
import { parsePagination, paginated } from "../../lib/pagination";
import { toMoneyString } from "../../lib/money";

/** Serializa Decimal para string e normaliza disponibilidade — nunca expõe float. */
export function serializeProduct(p: any) {
  const variants = (p.variants ?? []).map((v: any) => ({
    id: v.id,
    sku: v.sku,
    size: v.size,
    color: v.color,
    price: v.price ? toMoneyString(v.price) : null,
    stock: v.stock,
    active: v.active,
    available: v.active && v.stock > 0,
  }));

  const totalStock = variants.reduce((acc: number, v: any) => acc + v.stock, 0);
  const price = toMoneyString(p.promotionalPrice ?? p.basePrice);
  const compareAt = p.promotionalPrice ? toMoneyString(p.basePrice) : null;

  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    shortDescription: p.shortDescription,
    sku: p.sku,
    category: p.category
      ? { id: p.category.id, name: p.category.name, slug: p.category.slug }
      : null,
    price,
    compareAtPrice: compareAt,
    onSale: Boolean(p.promotionalPrice),
    badge: p.badge,
    featured: p.featured,
    active: p.active,
    images: (p.images ?? []).map((i: any) => ({ id: i.id, url: i.url, alt: i.alt, position: i.position })),
    variants,
    totalStock,
    available: p.active && totalStock > 0,
    stockLevel: totalStock === 0 ? "out" : totalStock <= 3 ? "low" : "in",
    createdAt: p.createdAt,
  };
}

export interface ProductListQuery {
  page?: string;
  perPage?: string;
  category?: string;
  q?: string;
  featured?: string;
  sort?: string;
  includeInactive?: boolean;
}

export async function listProducts(query: ProductListQuery, includeInactive = false) {
  const params = parsePagination(query as Record<string, unknown>, 12);

  const where: Prisma.ProductWhereInput = {
    ...(includeInactive ? {} : { active: true }),
    ...(query.category ? { category: { slug: query.category } } : {}),
    ...(query.featured === "true" ? { featured: true } : {}),
    ...(query.q
      ? {
          OR: [
            { name: { contains: query.q, mode: "insensitive" } },
            { shortDescription: { contains: query.q, mode: "insensitive" } },
            { sku: { contains: query.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const orderBy: Prisma.ProductOrderByWithRelationInput[] = [
    { featured: "desc" },
    { createdAt: "desc" },
  ];
  if (query.sort === "price_asc") orderBy.unshift({ basePrice: "asc" });
  if (query.sort === "price_desc") orderBy.unshift({ basePrice: "desc" });
  if (query.sort === "name_asc") orderBy.unshift({ name: "asc" });

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      skip: params.skip,
      take: params.take,
      include: { images: { orderBy: { position: "asc" } }, variants: true, category: true },
    }),
    prisma.product.count({ where }),
  ]);

  return paginated(items.map(serializeProduct), total, params);
}

export async function getProductBySlug(slug: string, includeInactive = false) {
  const product = await prisma.product.findFirst({
    where: { slug, ...(includeInactive ? {} : { active: true }) },
    include: {
      images: { orderBy: { position: "asc" } },
      variants: { orderBy: [{ size: "asc" }, { color: "asc" }] },
      category: true,
      reviews: { where: { approved: true }, include: { user: { select: { name: true } } } },
    },
  });
  if (!product) throw NotFound("Produto não encontrado.");
  return {
    ...serializeProduct(product),
    reviews: product.reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      author: r.user.name ?? "Cliente",
      createdAt: r.createdAt,
    })),
  };
}

export async function getRelatedProducts(productId: string, categoryId: string, limit = 4) {
  const items = await prisma.product.findMany({
    where: { active: true, categoryId, id: { not: productId } },
    include: { images: { orderBy: { position: "asc" } }, variants: true, category: true },
    take: limit,
    orderBy: { featured: "desc" },
  });
  return items.map(serializeProduct);
}

export async function listCategories(includeInactive = false) {
  const categories = await prisma.category.findMany({
    where: includeInactive ? {} : { active: true },
    orderBy: [{ position: "asc" }, { name: "asc" }],
    include: { _count: { select: { products: { where: { active: true } } } } },
  });
  return categories.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    imageUrl: c.imageUrl,
    productCount: c._count.products,
  }));
}
