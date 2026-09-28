import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../lib/asyncHandler";
import { prisma } from "../../lib/prisma";
import { NotFound } from "../../lib/errors";
import { resolveCoupon } from "../../services/coupon.service";
import { optionalAuth } from "../../middleware/auth";

export const accountRouter = Router();

/** PATCH /api/account/profile — o cliente só altera seus próprios dados básicos. */
accountRouter.patch(
  "/account/profile",
  requireAuth,
  validate({
    body: z.object({
      name: z.string().min(2).max(120).optional(),
      phone: z.string().max(20).optional(),
      document: z.string().max(20).optional(),
    }),
  }),
  asyncHandler(async (req, res) => {
    const user = await prisma.user.update({
      where: { id: req.auth!.sub },
      data: {
        name: req.body.name,
        phone: req.body.phone,
        document: req.body.document,
      },
      select: { id: true, name: true, email: true, phone: true, document: true, role: true },
    });
    res.json({ user });
  }),
);

const addressSchema = z.object({
  label: z.string().max(40).optional(),
  recipient: z.string().min(2).max(120),
  line1: z.string().min(3).max(160),
  line2: z.string().max(160).optional(),
  number: z.string().max(20).optional(),
  district: z.string().max(80).optional(),
  city: z.string().min(2).max(80),
  state: z.string().min(2).max(2),
  postalCode: z.string().min(8).max(9),
  country: z.string().length(2).default("BR"),
  isDefault: z.boolean().optional(),
});

accountRouter.get(
  "/account/addresses",
  requireAuth,
  asyncHandler(async (req, res) => {
    const addresses = await prisma.address.findMany({
      where: { userId: req.auth!.sub },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });
    res.json({ addresses });
  }),
);

accountRouter.post(
  "/account/addresses",
  requireAuth,
  validate({ body: addressSchema }),
  asyncHandler(async (req, res) => {
    const address = await prisma.address.create({
      data: { ...req.body, userId: req.auth!.sub },
    });
    res.status(201).json({ address });
  }),
);

accountRouter.patch(
  "/account/addresses/:id",
  requireAuth,
  validate({ body: addressSchema.partial() }),
  asyncHandler(async (req, res) => {
    const existing = await prisma.address.findFirst({
      where: { id: req.params.id, userId: req.auth!.sub },
    });
    if (!existing) throw NotFound("Endereço não encontrado.");
    const address = await prisma.address.update({ where: { id: existing.id }, data: req.body });
    res.json({ address });
  }),
);

accountRouter.delete(
  "/account/addresses/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const existing = await prisma.address.findFirst({
      where: { id: req.params.id, userId: req.auth!.sub },
    });
    if (!existing) throw NotFound("Endereço não encontrado.");
    await prisma.address.delete({ where: { id: existing.id } });
    res.json({ ok: true });
  }),
);

/** Favoritos (wishlist) do cliente. */
accountRouter.get(
  "/account/wishlist",
  requireAuth,
  asyncHandler(async (req, res) => {
    const items = await prisma.wishlist.findMany({
      where: { userId: req.auth!.sub },
      include: { product: { include: { images: { orderBy: { position: "asc" }, take: 1 } } } },
      orderBy: { createdAt: "desc" },
    });
    res.json({
      items: items.map((w) => ({
        id: w.id,
        product: {
          id: w.product.id,
          name: w.product.name,
          slug: w.product.slug,
          price: (w.product.promotionalPrice ?? w.product.basePrice).toFixed(2),
          image: w.product.images[0]?.url ?? null,
        },
      })),
    });
  }),
);

accountRouter.post(
  "/account/wishlist/:productId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const product = await prisma.product.findUnique({ where: { id: req.params.productId } });
    if (!product) throw NotFound("Produto não encontrado.");
    const item = await prisma.wishlist.upsert({
      where: { userId_productId: { userId: req.auth!.sub, productId: product.id } },
      update: {},
      create: { userId: req.auth!.sub, productId: product.id },
    });
    res.status(201).json({ item });
  }),
);

accountRouter.delete(
  "/account/wishlist/:productId",
  requireAuth,
  asyncHandler(async (req, res) => {
    await prisma.wishlist.deleteMany({
      where: { userId: req.auth!.sub, productId: req.params.productId },
    });
    res.json({ ok: true });
  }),
);

/** POST /api/coupons/validate — valida cupom no servidor (preview de desconto). */
accountRouter.post(
  "/coupons/validate",
  optionalAuth,
  validate({
    body: z.object({
      code: z.string().min(2).max(40),
      items: z
        .array(
          z.object({
            productId: z.string(),
            categoryId: z.string(),
            unitPrice: z.string(),
            quantity: z.number().int().positive(),
          }),
        )
        .min(1),
    }),
  }),
  asyncHandler(async (req, res) => {
    const { coupon, discount } = await resolveCoupon(
      req.body.code,
      req.body.items,
      req.auth?.sub ?? null,
    );
    res.json({
      coupon: { code: coupon.code, discountType: coupon.discountType, discountValue: coupon.discountValue.toFixed(2) },
      discount,
    });
  }),
);
