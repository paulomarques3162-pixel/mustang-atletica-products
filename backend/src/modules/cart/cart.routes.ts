import { Router, Request, Response } from "express";
import { z } from "zod";
import { optionalAuth, requireAuth } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../lib/asyncHandler";
import { isProd } from "../../config/env";
import * as cartService from "./cart.service";

export const cartRouter = Router();
const CART_COOKIE = "ma_cart";

async function resolveCart(req: Request, res: Response) {
  const userId = req.auth?.sub ?? null;
  const guestToken = (req.cookies?.[CART_COOKIE] as string | undefined) ?? null;
  const cart = await cartService.getOrCreateCart({ userId, guestToken });

  if (!userId && cart.guestToken) {
    res.cookie(CART_COOKIE, cart.guestToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/api",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
  }
  return cart;
}

/** GET /api/cart — carrinho atual com itens e totais. */
cartRouter.get(
  "/cart",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const cart = await resolveCart(req, res);
    res.json({ cart: await cartService.getCartView(cart.id) });
  }),
);

cartRouter.post(
  "/cart/items",
  optionalAuth,
  validate({
    body: z.object({ variantId: z.string().min(1), quantity: z.number().int().positive().max(50) }),
  }),
  asyncHandler(async (req, res) => {
    const cart = await resolveCart(req, res);
    const result = await cartService.addItem(cart.id, req.body.variantId, req.body.quantity);
    res.status(201).json({ cart: result });
  }),
);

cartRouter.patch(
  "/cart/items/:itemId",
  optionalAuth,
  validate({
    params: z.object({ itemId: z.string().min(1) }),
    body: z.object({ quantity: z.number().int().min(0).max(50) }),
  }),
  asyncHandler(async (req, res) => {
    const cart = await resolveCart(req, res);
    const result = await cartService.updateItem(cart.id, req.params.itemId, req.body.quantity);
    res.json({ cart: result });
  }),
);

cartRouter.delete(
  "/cart/items/:itemId",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const cart = await resolveCart(req, res);
    const result = await cartService.removeItem(cart.id, req.params.itemId);
    res.json({ cart: result });
  }),
);

cartRouter.delete(
  "/cart",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const cart = await resolveCart(req, res);
    res.json({ cart: await cartService.clearCart(cart.id) });
  }),
);

/** POST /api/cart/merge — sincroniza carrinho do visitante após login. */
cartRouter.post(
  "/cart/merge",
  requireAuth,
  asyncHandler(async (req, res) => {
    const guestToken = (req.cookies?.[CART_COOKIE] as string | undefined) ?? null;
    if (!guestToken) {
      const cart = await cartService.getOrCreateCart({ userId: req.auth!.sub });
      res.json({ cart: await cartService.getCartView(cart.id) });
      return;
    }
    const merged = await cartService.mergeGuestCart(guestToken, req.auth!.sub);
    res.clearCookie(CART_COOKIE, { path: "/api" });
    if (merged) {
      res.json({ cart: merged });
      return;
    }
    const cart = await cartService.getOrCreateCart({ userId: req.auth!.sub });
    res.json({ cart: await cartService.getCartView(cart.id) });
  }),
);
