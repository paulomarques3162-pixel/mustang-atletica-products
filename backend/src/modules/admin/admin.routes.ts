import { Router } from "express";
import { z } from "zod";
import { AuditAction, OrderStatus, Prisma, Role } from "@prisma/client";
import { requireAuth, requireRole } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../lib/asyncHandler";
import { prisma } from "../../lib/prisma";
import { BadRequest, Conflict, NotFound } from "../../lib/errors";
import { slugify } from "../../lib/slug";
import { toMoneyString } from "../../lib/money";
import { audit } from "../../services/audit.service";
import { serializeProduct } from "../catalog/catalog.service";
import { setStockAbsolute } from "../../services/inventory.service";
import { hashPassword } from "../../lib/password";
import { cancelOrder } from "../../services/order.service";
import { toggleProductActive } from "./admin.service";

export const adminRouter = Router();
adminRouter.use(requireAuth, requireRole("SUPPORT"));

/** GET /api/admin/dashboard — métricas reais do banco (sem números fictícios). */
adminRouter.get(
  "/dashboard",
  asyncHandler(async (_req, res) => {
    const [
      salesAgg,
      orderCount,
      pendingOrders,
      paidOrders,
      canceledOrders,
      lowStock,
      customerCount,
      productCount,
      pendingPayments,
      recentOrders,
    ] = await Promise.all([
      prisma.order.aggregate({
        where: { status: { in: [OrderStatus.confirmed, OrderStatus.processing, OrderStatus.shipped, OrderStatus.delivered] } },
        _sum: { total: true },
        _avg: { total: true },
      }),
      prisma.order.count(),
      prisma.order.count({ where: { status: OrderStatus.awaiting_payment } }),
      prisma.order.count({ where: { status: OrderStatus.confirmed } }),
      prisma.order.count({ where: { status: OrderStatus.canceled } }),
      prisma.productVariant.findMany({
        where: { active: true, stock: { lte: 3 } },
        include: { product: { select: { name: true, slug: true } } },
        orderBy: { stock: "asc" },
        take: 10,
      }),
      prisma.user.count({ where: { role: Role.CUSTOMER } }),
      prisma.product.count(),
      prisma.payment.count({ where: { status: "pending" } }),
      prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { items: true } }),
    ]);

    res.json({
      revenue: toMoneyString(salesAgg._sum.total ?? 0),
      averageTicket: toMoneyString(salesAgg._avg.total ?? 0),
      orderCount,
      pendingOrders,
      paidOrders,
      canceledOrders,
      pendingPayments,
      customerCount,
      productCount,
      lowStock: lowStock.map((v) => ({
        variantId: v.id,
        sku: v.sku,
        productName: v.product.name,
        slug: v.product.slug,
        stock: v.stock,
      })),
      recentOrders: recentOrders.map((o) => ({
        id: o.id,
        number: o.number,
        status: o.status,
        total: toMoneyString(o.total),
        createdAt: o.createdAt,
        itemCount: o.items.length,
      })),
    });
  }),
);

/// ------------------------- Produtos -------------------------
const variantSchema = z.object({
  id: z.string().optional(),
  sku: z.string().min(1).max(60),
  size: z.string().max(20).optional(),
  color: z.string().max(40).optional(),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  stock: z.number().int().min(0).default(0),
  active: z.boolean().default(true),
});

const imageSchema = z.object({
  url: z.string().url(),
  alt: z.string().max(160).optional(),
  position: z.number().int().min(0).default(0),
});

const productSchema = z.object({
  name: z.string().min(2).max(160),
  slug: z.string().min(2).max(160).optional(),
  description: z.string().max(5000).optional(),
  shortDescription: z.string().max(300).optional(),
  sku: z.string().min(1).max(60),
  categoryId: z.string().min(1),
  basePrice: z.string().regex(/^\d+(\.\d{1,2})?$/),
  promotionalPrice: z.string().regex(/^\d+(\.\d{1,2})?$/).nullable().optional(),
  active: z.boolean().default(true),
  featured: z.boolean().default(false),
  badge: z.string().max(40).nullable().optional(),
  variants: z.array(variantSchema).min(1, "Cadastre ao menos uma variação."),
  images: z.array(imageSchema).default([]),
});

adminRouter.get(
  "/products",
  asyncHandler(async (req, res) => {
    const q = typeof req.query.q === "string" ? req.query.q : undefined;
    const products = await prisma.product.findMany({
      where: q
        ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { sku: { contains: q, mode: "insensitive" } }] }
        : {},
      orderBy: { updatedAt: "desc" },
      include: { images: { orderBy: { position: "asc" } }, variants: true, category: true },
      take: 100,
    });
    res.json({ products: products.map(serializeProduct) });
  }),
);

adminRouter.get(
  "/products/:id",
  asyncHandler(async (req, res) => {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: { images: { orderBy: { position: "asc" } }, variants: true, category: true },
    });
    if (!product) throw NotFound("Produto não encontrado.");
    res.json({ product: serializeProduct(product) });
  }),
);

adminRouter.post(
  "/products",
  requireRole("EDITOR"),
  validate({ body: productSchema }),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof productSchema>;
    const category = await prisma.category.findUnique({ where: { id: body.categoryId } });
    if (!category) throw BadRequest("Categoria inválida.");

    const baseSlug = body.slug ? slugify(body.slug) : slugify(body.name);
    let slug = baseSlug;
    if (await prisma.product.findUnique({ where: { slug } })) slug = `${baseSlug}-${Date.now().toString(36)}`;

    const product = await prisma.product.create({
      data: {
        name: body.name,
        slug,
        description: body.description,
        shortDescription: body.shortDescription,
        sku: body.sku,
        categoryId: body.categoryId,
        basePrice: body.basePrice,
        promotionalPrice: body.promotionalPrice ?? null,
        active: body.active,
        featured: body.featured,
        badge: body.badge ?? null,
        variants: {
          create: body.variants.map((v) => ({
            sku: v.sku,
            size: v.size ?? null,
            color: v.color ?? null,
            price: v.price ?? null,
            stock: v.stock,
            active: v.active,
          })),
        },
        images: { create: body.images },
      },
      include: { variants: true, images: true, category: true },
    });

    await audit({
      userId: req.auth!.sub,
      action: "PRODUCT_CREATED",
      entity: "Product",
      entityId: product.id,
      metadata: { name: product.name, sku: product.sku },
      ip: req.ip,
    });

    res.status(201).json({ product: serializeProduct(product) });
  }),
);

adminRouter.patch(
  "/products/:id",
  requireRole("EDITOR"),
  validate({ body: productSchema.partial() }),
  asyncHandler(async (req, res) => {
    const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!existing) throw NotFound("Produto não encontrado.");
    const body = req.body as Partial<z.infer<typeof productSchema>>;

    const product = await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: existing.id },
        data: {
          name: body.name,
          description: body.description,
          shortDescription: body.shortDescription,
          sku: body.sku,
          categoryId: body.categoryId,
          basePrice: body.basePrice,
          promotionalPrice: body.promotionalPrice === undefined ? undefined : body.promotionalPrice,
          active: body.active,
          featured: body.featured,
          badge: body.badge === undefined ? undefined : body.badge,
        },
      });

      if (body.images) {
        await tx.productImage.deleteMany({ where: { productId: existing.id } });
        await tx.productImage.createMany({
          data: body.images.map((i) => ({ ...i, productId: existing.id })),
        });
      }

      if (body.variants) {
        for (const v of body.variants) {
          if (v.id) {
            await tx.productVariant.update({
              where: { id: v.id },
              data: {
                sku: v.sku,
                size: v.size ?? null,
                color: v.color ?? null,
                price: v.price ?? null,
                active: v.active,
              },
            });
          } else {
            await tx.productVariant.create({
              data: {
                productId: existing.id,
                sku: v.sku,
                size: v.size ?? null,
                color: v.color ?? null,
                price: v.price ?? null,
                stock: v.stock,
                active: v.active,
              },
            });
          }
        }
      }

      return tx.product.findUnique({
        where: { id: existing.id },
        include: { variants: true, images: { orderBy: { position: "asc" } }, category: true },
      });
    });

    if (body.basePrice && body.basePrice !== existing.basePrice.toFixed(2)) {
      await audit({
        userId: req.auth!.sub,
        action: "PRICE_CHANGED",
        entity: "Product",
        entityId: existing.id,
        metadata: { from: existing.basePrice.toFixed(2), to: body.basePrice },
        ip: req.ip,
      });
    }

    await audit({
      userId: req.auth!.sub,
      action: "PRODUCT_UPDATED",
      entity: "Product",
      entityId: existing.id,
      metadata: { name: product?.name },
      ip: req.ip,
    });

    res.json({ product: serializeProduct(product) });
  }),
);

/** PATCH /api/admin/products/:id/active — ativar/desativar (soft delete). */
adminRouter.patch(
  "/products/:id/active",
  requireRole("MANAGER"),
  validate({ body: z.object({ active: z.boolean() }) }),
  asyncHandler(async (req, res) => {
    const product = await toggleProductActive(req.params.id, req.body.active, req.auth!.sub, req.ip ?? null);
    res.json({ product });
  }),
);

/// ------------------------- Categorias -------------------------
const categorySchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().max(500).optional(),
  imageUrl: z.string().url().optional(),
  position: z.number().int().min(0).default(0),
  active: z.boolean().default(true),
});

adminRouter.get(
  "/categories",
  asyncHandler(async (_req, res) => {
    const categories = await prisma.category.findMany({
      orderBy: [{ position: "asc" }, { name: "asc" }],
      include: { _count: { select: { products: true } } },
    });
    res.json({
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description,
        imageUrl: c.imageUrl,
        position: c.position,
        active: c.active,
        productCount: c._count.products,
      })),
    });
  }),
);

adminRouter.post(
  "/categories",
  requireRole("EDITOR"),
  validate({ body: categorySchema }),
  asyncHandler(async (req, res) => {
    const slug = slugify(req.body.name);
    const exists = await prisma.category.findUnique({ where: { slug } });
    if (exists) throw Conflict("Já existe uma categoria com este nome.");
    const category = await prisma.category.create({ data: { ...req.body, slug } });
    await audit({
      userId: req.auth!.sub,
      action: "CATEGORY_CREATED",
      entity: "Category",
      entityId: category.id,
      metadata: { name: category.name },
      ip: req.ip,
    });
    res.status(201).json({ category });
  }),
);

adminRouter.patch(
  "/categories/:id",
  requireRole("EDITOR"),
  validate({ body: categorySchema.partial() }),
  asyncHandler(async (req, res) => {
    const existing = await prisma.category.findUnique({ where: { id: req.params.id } });
    if (!existing) throw NotFound("Categoria não encontrada.");
    const category = await prisma.category.update({
      where: { id: existing.id },
      data: { ...req.body, ...(req.body.name ? { slug: slugify(req.body.name) } : {}) },
    });
    await audit({
      userId: req.auth!.sub,
      action: "CATEGORY_UPDATED",
      entity: "Category",
      entityId: category.id,
      ip: req.ip,
    });
    res.json({ category });
  }),
);

adminRouter.delete(
  "/categories/:id",
  requireRole("MANAGER"),
  asyncHandler(async (req, res) => {
    const existing = await prisma.category.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { products: true } } },
    });
    if (!existing) throw NotFound("Categoria não encontrada.");
    if (existing._count.products > 0) {
      throw Conflict("Não é possível excluir uma categoria com produtos. Desative-a ou mova os produtos.");
    }
    await prisma.category.delete({ where: { id: existing.id } });
    await audit({
      userId: req.auth!.sub,
      action: "CATEGORY_DELETED",
      entity: "Category",
      entityId: existing.id,
      ip: req.ip,
    });
    res.json({ ok: true });
  }),
);

/// ------------------------- Estoque -------------------------
adminRouter.get(
  "/inventory",
  asyncHandler(async (_req, res) => {
    const variants = await prisma.productVariant.findMany({
      include: { product: { select: { name: true, slug: true } } },
      orderBy: { stock: "asc" },
      take: 200,
    });
    res.json({
      variants: variants.map((v) => ({
        id: v.id,
        sku: v.sku,
        productName: v.product.name,
        slug: v.product.slug,
        size: v.size,
        color: v.color,
        stock: v.stock,
        active: v.active,
      })),
    });
  }),
);

adminRouter.post(
  "/inventory/:variantId/adjust",
  requireRole("MANAGER"),
  validate({ body: z.object({ stock: z.number().int().min(0), reason: z.string().max(200).optional() }) }),
  asyncHandler(async (req, res) => {
    await setStockAbsolute(req.params.variantId, req.body.stock, req.auth!.sub, req.body.reason);
    await audit({
      userId: req.auth!.sub,
      action: "STOCK_CHANGED",
      entity: "ProductVariant",
      entityId: req.params.variantId,
      metadata: { stock: req.body.stock, reason: req.body.reason },
      ip: req.ip,
    });
    res.json({ ok: true });
  }),
);

adminRouter.get(
  "/inventory/movements",
  asyncHandler(async (req, res) => {
    const variantId = typeof req.query.variantId === "string" ? req.query.variantId : undefined;
    const movements = await prisma.inventoryMovement.findMany({
      where: variantId ? { variantId } : {},
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { variant: { select: { sku: true } } },
    });
    res.json({ movements });
  }),
);

/// ------------------------- Pedidos -------------------------
adminRouter.get(
  "/orders",
  asyncHandler(async (req, res) => {
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const orders = await prisma.order.findMany({
      where: status ? { status: status as OrderStatus } : {},
      orderBy: { createdAt: "desc" },
      include: { items: true, payments: true },
      take: 100,
    });
    res.json({
      orders: orders.map((o) => ({
        id: o.id,
        number: o.number,
        status: o.status,
        total: toMoneyString(o.total),
        customerName: o.customerName,
        customerEmail: o.customerEmail,
        createdAt: o.createdAt,
        itemCount: o.items.length,
        paymentStatus: o.payments[0]?.status ?? null,
        paymentMethod: o.payments[0]?.method ?? null,
      })),
    });
  }),
);

adminRouter.patch(
  "/orders/:id/status",
  requireRole("MANAGER"),
  validate({
    body: z.object({
      status: z.nativeEnum(OrderStatus),
      trackingCode: z.string().max(60).optional(),
    }),
  }),
  asyncHandler(async (req, res) => {
    const existing = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!existing) throw NotFound("Pedido não encontrado.");

    if (req.body.status === OrderStatus.canceled && existing.status !== OrderStatus.canceled) {
      await cancelOrder(existing.id, "Cancelado pelo administrador");
    } else {
      await prisma.order.update({
        where: { id: existing.id },
        data: { status: req.body.status, trackingCode: req.body.trackingCode ?? existing.trackingCode },
      });
      await prisma.orderEvent.create({
        data: {
          orderId: existing.id,
          type: "ORDER_UPDATED",
          message: `Status alterado para ${req.body.status}.`,
        },
      });
    }

    await audit({
      userId: req.auth!.sub,
      action: req.body.status === OrderStatus.canceled ? "ORDER_CANCELED" : "ORDER_UPDATED",
      entity: "Order",
      entityId: existing.id,
      metadata: { status: req.body.status },
      ip: req.ip,
    });

    const updated = await prisma.order.findUnique({ where: { id: existing.id } });
    res.json({ order: { id: updated!.id, status: updated!.status } });
  }),
);

/// ------------------------- Clientes -------------------------
adminRouter.get(
  "/customers",
  asyncHandler(async (_req, res) => {
    const customers = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        active: true,
        createdAt: true,
        _count: { select: { orders: true } },
      },
      take: 200,
    });
    res.json({
      customers: customers.map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        role: c.role,
        active: c.active,
        createdAt: c.createdAt,
        orderCount: c._count.orders,
      })),
    });
  }),
);

/// ------------------------- Pagamentos -------------------------
adminRouter.get(
  "/payments",
  asyncHandler(async (_req, res) => {
    const payments = await prisma.payment.findMany({
      orderBy: { createdAt: "desc" },
      include: { order: { select: { number: true, customerName: true } } },
      take: 200,
    });
    res.json({
      payments: payments.map((p) => ({
        id: p.id,
        orderNumber: p.order.number,
        customerName: p.order.customerName,
        provider: p.provider,
        method: p.method,
        status: p.status,
        amount: toMoneyString(p.amount),
        createdAt: p.createdAt,
      })),
    });
  }),
);

adminRouter.post(
  "/payments/:id/refund",
  requireRole("MANAGER"),
  validate({ body: z.object({ amount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(), reason: z.string().max(200).optional() }) }),
  asyncHandler(async (req, res) => {
    const { refundPayment } = await import("../../payments/services/payment.service");
    const result = await refundPayment(req.params.id, req.body.amount, req.body.reason, req.auth!.sub);
    res.json({ refund: result });
  }),
);

/// ------------------------- Cupons -------------------------
const couponSchema = z.object({
  code: z.string().min(2).max(40),
  description: z.string().max(200).optional(),
  discountType: z.enum(["percentage", "fixed"]),
  discountValue: z.string().regex(/^\d+(\.\d{1,2})?$/),
  minSubtotal: z.string().regex(/^\d+(\.\d{1,2})?$/).nullable().optional(),
  maxUses: z.number().int().min(1).nullable().optional(),
  maxUsesPerCustomer: z.number().int().min(1).nullable().optional(),
  startsAt: z.coerce.date().nullable().optional(),
  expiresAt: z.coerce.date().nullable().optional(),
  active: z.boolean().default(true),
});

adminRouter.get(
  "/coupons",
  asyncHandler(async (_req, res) => {
    const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });
    res.json({
      coupons: coupons.map((c) => ({
        ...c,
        discountValue: toMoneyString(c.discountValue),
        minSubtotal: c.minSubtotal ? toMoneyString(c.minSubtotal) : null,
      })),
    });
  }),
);

adminRouter.post(
  "/coupons",
  requireRole("MANAGER"),
  validate({ body: couponSchema }),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof couponSchema>;
    const code = body.code.toUpperCase();
    if (await prisma.coupon.findUnique({ where: { code } })) throw Conflict("Código de cupom já existe.");
    const coupon = await prisma.coupon.create({
      data: {
        code,
        description: body.description,
        discountType: body.discountType,
        discountValue: body.discountValue,
        minSubtotal: body.minSubtotal ?? null,
        maxUses: body.maxUses ?? null,
        maxUsesPerCustomer: body.maxUsesPerCustomer ?? null,
        startsAt: body.startsAt ?? null,
        expiresAt: body.expiresAt ?? null,
        active: body.active,
      },
    });
    await audit({
      userId: req.auth!.sub,
      action: "COUPON_CREATED",
      entity: "Coupon",
      entityId: coupon.id,
      metadata: { code },
      ip: req.ip,
    });
    res.status(201).json({ coupon: { ...coupon, discountValue: toMoneyString(coupon.discountValue) } });
  }),
);

adminRouter.patch(
  "/coupons/:id",
  requireRole("MANAGER"),
  validate({ body: couponSchema.partial() }),
  asyncHandler(async (req, res) => {
    const existing = await prisma.coupon.findUnique({ where: { id: req.params.id } });
    if (!existing) throw NotFound("Cupom não encontrado.");
    const body = req.body as Partial<z.infer<typeof couponSchema>>;
    const coupon = await prisma.coupon.update({
      where: { id: existing.id },
      data: {
        ...body,
        code: body.code ? body.code.toUpperCase() : undefined,
      },
    });
    await audit({
      userId: req.auth!.sub,
      action: "COUPON_UPDATED",
      entity: "Coupon",
      entityId: coupon.id,
      ip: req.ip,
    });
    res.json({ coupon: { ...coupon, discountValue: toMoneyString(coupon.discountValue) } });
  }),
);

adminRouter.delete(
  "/coupons/:id",
  requireRole("MANAGER"),
  asyncHandler(async (req, res) => {
    const existing = await prisma.coupon.findUnique({ where: { id: req.params.id } });
    if (!existing) throw NotFound("Cupom não encontrado.");
    await prisma.coupon.delete({ where: { id: existing.id } });
    await audit({
      userId: req.auth!.sub,
      action: "COUPON_DELETED",
      entity: "Coupon",
      entityId: existing.id,
      ip: req.ip,
    });
    res.json({ ok: true });
  }),
);

/// ------------------------- Auditoria -------------------------
adminRouter.get(
  "/audit",
  requireRole("MANAGER"),
  asyncHandler(async (req, res) => {
    const action = typeof req.query.action === "string" ? req.query.action : undefined;
    const logs = await prisma.auditLog.findMany({
      where: action ? { action: action as AuditAction } : {},
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { user: { select: { email: true, name: true } } },
    });
    res.json({ logs });
  }),
);

/// ------------------------- Usuários administrativos -------------------------
adminRouter.get(
  "/users",
  requireRole("ADMIN"),
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({
      where: { role: { not: Role.CUSTOMER } },
      select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    res.json({ users });
  }),
);

adminRouter.post(
  "/users",
  requireRole("ADMIN"),
  validate({
    body: z.object({
      name: z.string().min(2).max(120),
      email: z.string().email(),
      password: z.string().min(8),
      role: z.enum(["SUPPORT", "EDITOR", "MANAGER", "ADMIN"]),
    }),
  }),
  asyncHandler(async (req, res) => {
    const email = req.body.email.toLowerCase();
    if (await prisma.user.findUnique({ where: { email } })) throw Conflict("E-mail já cadastrado.");
    const user = await prisma.user.create({
      data: {
        name: req.body.name,
        email,
        passwordHash: await hashPassword(req.body.password),
        role: req.body.role as Role,
      },
      select: { id: true, name: true, email: true, role: true },
    });
    await audit({
      userId: req.auth!.sub,
      action: "USER_CREATED",
      entity: "User",
      entityId: user.id,
      metadata: { role: user.role },
      ip: req.ip,
    });
    res.status(201).json({ user });
  }),
);

export { Prisma };
