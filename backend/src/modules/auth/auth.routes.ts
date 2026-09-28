import { Router } from "express";
import { z } from "zod";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../lib/asyncHandler";
import { authLimiter } from "../../middleware/rateLimit";
import { requireAuth } from "../../middleware/auth";
import * as authService from "./auth.service";
import { env, isProd } from "../../config/env";

export const authRouter = Router();

const REFRESH_COOKIE = "ma_refresh";

function cookieOptions() {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax" as const,
    path: "/api/auth",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  };
}

const registerSchema = z.object({
  name: z.string().min(2, "Informe seu nome.").max(120),
  email: z.string().email("E-mail inválido."),
  password: z.string().min(8, "A senha deve ter ao menos 8 caracteres."),
  phone: z.string().max(20).optional(),
  document: z.string().max(20).optional(),
});

authRouter.post(
  "/register",
  authLimiter,
  validate({ body: registerSchema }),
  asyncHandler(async (req, res) => {
    const result = await authService.register(req.body, { ip: req.ip });
    res.cookie(REFRESH_COOKIE, result.refreshToken, cookieOptions());
    // refreshToken também no corpo para deploys cross-origin (Vercel → Render),
    // onde cookies de terceiros podem ser bloqueados pelo navegador.
    res.status(201).json({ user: result.user, accessToken: result.accessToken, refreshToken: result.refreshToken });
  }),
);

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post(
  "/login",
  authLimiter,
  validate({ body: loginSchema }),
  asyncHandler(async (req, res) => {
    const result = await authService.login(req.body.email, req.body.password, {
      ip: req.ip,
      userAgent: req.header("user-agent"),
    });
    res.cookie(REFRESH_COOKIE, result.refreshToken, cookieOptions());
    res.json({ user: result.user, accessToken: result.accessToken, refreshToken: result.refreshToken });
  }),
);

authRouter.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const token = (req.cookies?.[REFRESH_COOKIE] as string | undefined) ?? req.body?.refreshToken;
    if (!token) return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Sessão ausente." } });
    const result = await authService.refresh(token, {
      ip: req.ip,
      userAgent: req.header("user-agent"),
    });
    res.cookie(REFRESH_COOKIE, result.refreshToken, cookieOptions());
    return res.json({ user: result.user, accessToken: result.accessToken });
  }),
);

authRouter.post(
  "/logout",
  asyncHandler(async (req, res) => {
    const token = (req.cookies?.[REFRESH_COOKIE] as string | undefined) ?? req.body?.refreshToken;
    if (token) await authService.logout(token);
    res.clearCookie(REFRESH_COOKIE, { ...cookieOptions(), maxAge: undefined });
    res.json({ ok: true });
  }),
);

const forgotSchema = z.object({ email: z.string().email() });
authRouter.post(
  "/forgot-password",
  authLimiter,
  validate({ body: forgotSchema }),
  asyncHandler(async (req, res) => {
    const result = await authService.requestPasswordReset(req.body.email);
    // Em produção nunca devolvemos o token na resposta. Em dev, facilita o teste.
    res.json({
      ok: true,
      message: "Se o e-mail existir, enviaremos instruções de redefinição.",
      ...(isProd || !result.token ? {} : { devResetToken: result.token }),
    });
  }),
);

const resetSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(8),
});
authRouter.post(
  "/reset-password",
  authLimiter,
  validate({ body: resetSchema }),
  asyncHandler(async (req, res) => {
    await authService.resetPassword(req.body.token, req.body.password);
    res.json({ ok: true, message: "Senha redefinida com sucesso." });
  }),
);

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const profile = await authService.getProfile(req.auth!.sub);
    res.json({ user: profile });
  }),
);

export { REFRESH_COOKIE, env };
