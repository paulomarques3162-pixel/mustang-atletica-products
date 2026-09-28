import crypto from "node:crypto";
import { Role } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { Conflict, NotFound, Unauthorized, BadRequest } from "../../lib/errors";
import { hashPassword, verifyPassword, passwordIssues } from "../../lib/password";
import { signAccessToken, signRefreshToken, verifyToken, RefreshTokenPayload } from "../../lib/jwt";
import { audit } from "../../services/audit.service";
import { env } from "../../config/env";

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  phone?: string;
  document?: string;
}

export interface AuthResult {
  user: { id: string; name: string | null; email: string; role: Role };
  accessToken: string;
  refreshToken: string;
}

function refreshExpiryMs(): number {
  const raw = env.JWT_REFRESH_EXPIRES_IN; // ex "30d"
  const match = /^(\d+)([smhd])$/.exec(raw);
  if (!match) return 30 * 24 * 60 * 60 * 1000;
  const value = Number(match[1]);
  const unit = match[2];
  const factor = unit === "s" ? 1000 : unit === "m" ? 60_000 : unit === "h" ? 3_600_000 : 86_400_000;
  return value * factor;
}

async function issueTokens(user: {
  id: string;
  email: string;
  role: Role;
}, meta: { ip?: string | null; userAgent?: string | null }): Promise<AuthResult> {
  const accessToken = signAccessToken({ sub: user.id, email: user.email, role: user.role });
  const jti = crypto.randomUUID();
  const refreshToken = signRefreshToken({ sub: user.id, jti });

  await prisma.session.create({
    data: {
      userId: user.id,
      refreshToken,
      ip: meta.ip ?? null,
      userAgent: meta.userAgent ?? null,
      expiresAt: new Date(Date.now() + refreshExpiryMs()),
    },
  });

  return {
    user: { id: user.id, name: null, email: user.email, role: user.role },
    accessToken,
    refreshToken,
  };
}

export async function register(input: RegisterInput, meta: { ip?: string | null }) {
  const email = input.email.toLowerCase().trim();
  const issues = passwordIssues(input.password);
  if (issues.length) throw BadRequest("Senha fraca.", issues);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw Conflict("E-mail já cadastrado.");

  const user = await prisma.user.create({
    data: {
      email,
      name: input.name,
      phone: input.phone ?? null,
      document: input.document ?? null,
      passwordHash: await hashPassword(input.password),
      role: Role.CUSTOMER,
    },
  });

  await audit({
    userId: user.id,
    action: "USER_CREATED",
    entity: "User",
    entityId: user.id,
    ip: meta.ip,
    metadata: { email },
  });

  const result = await issueTokens(user, { ip: meta.ip });
  result.user.name = user.name;
  return result;
}

export async function login(
  email: string,
  password: string,
  meta: { ip?: string | null; userAgent?: string | null },
): Promise<AuthResult> {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!user || !user.passwordHash || !user.active) {
    await audit({
      action: "LOGIN_FAILED",
      entity: "User",
      ip: meta.ip,
      metadata: { email },
      result: "failure",
    });
    throw Unauthorized("Credenciais inválidas.");
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    await audit({
      userId: user.id,
      action: "LOGIN_FAILED",
      entity: "User",
      entityId: user.id,
      ip: meta.ip,
      result: "failure",
    });
    throw Unauthorized("Credenciais inválidas.");
  }

  await audit({
    userId: user.id,
    action: user.role === Role.ADMIN ? "ADMIN_LOGIN" : "LOGIN_SUCCESS",
    entity: "User",
    entityId: user.id,
    ip: meta.ip,
  });

  const result = await issueTokens(user, meta);
  result.user.name = user.name;
  return result;
}

export async function refresh(refreshToken: string, meta: { ip?: string | null; userAgent?: string | null }) {
  let payload: RefreshTokenPayload;
  try {
    payload = verifyToken<RefreshTokenPayload>(refreshToken);
  } catch {
    throw Unauthorized("Refresh token inválido.");
  }
  if (payload.type !== "refresh") throw Unauthorized("Token inválido.");

  const session = await prisma.session.findUnique({
    where: { refreshToken },
    include: { user: true },
  });
  if (!session || session.revokedAt || session.expiresAt < new Date()) {
    throw Unauthorized("Sessão expirada. Faça login novamente.");
  }

  // rotação de refresh token
  await prisma.session.update({
    where: { id: session.id },
    data: { revokedAt: new Date() },
  });
  return issueTokens(session.user, meta);
}

export async function logout(refreshToken: string) {
  await prisma.session.updateMany({
    where: { refreshToken, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function requestPasswordReset(email: string) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  // resposta genérica para não revelar existência de conta
  if (!user) return { token: null };

  const raw = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(raw).digest("hex");
  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
  });
  // Em produção o token deve ser enviado por e-mail (integração pendente).
  return { token: raw };
}

export async function resetPassword(rawToken: string, newPassword: string) {
  const issues = passwordIssues(newPassword);
  if (issues.length) throw BadRequest("Senha fraca.", issues);

  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw BadRequest("Token de redefinição inválido ou expirado.");
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash: await hashPassword(newPassword) },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    prisma.session.updateMany({
      where: { userId: record.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);
}

export async function getProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      document: true,
      role: true,
      createdAt: true,
    },
  });
  if (!user) throw NotFound("Usuário não encontrado.");
  return user;
}
