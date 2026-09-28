import { NextFunction, Request, Response } from "express";
import { verifyToken, AccessTokenPayload } from "../lib/jwt";
import { Forbidden, Unauthorized } from "../lib/errors";
import type { Role } from "@prisma/client";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AccessTokenPayload;
    }
  }
}

function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice(7).trim();
  return null;
}

/** Exige autenticação válida (JWT de acesso). */
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) return next(Unauthorized("Token de acesso ausente."));
  try {
    const payload = verifyToken<AccessTokenPayload>(token);
    if (payload.type !== "access") return next(Unauthorized("Token inválido."));
    req.auth = payload;
    return next();
  } catch {
    return next(Unauthorized("Token inválido ou expirado."));
  }
}

/** Autenticação opcional: popula req.auth quando houver token válido. */
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (token) {
    try {
      const payload = verifyToken<AccessTokenPayload>(token);
      if (payload.type === "access") req.auth = payload;
    } catch {
      /* token opcional inválido é ignorado */
    }
  }
  return next();
}

const ROLE_RANK: Record<Role, number> = {
  CUSTOMER: 0,
  SUPPORT: 1,
  EDITOR: 2,
  MANAGER: 3,
  ADMIN: 4,
};

/** Autoriza por papéis. ADMIN sempre tem acesso. */
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) return next(Unauthorized());
    if (req.auth.role === "ADMIN") return next();
    if (!roles.includes(req.auth.role)) return next(Forbidden("Permissão insuficiente."));
    return next();
  };
}

/** Exige nível hierárquico mínimo (SUPPORT < EDITOR < MANAGER < ADMIN). */
export function requireMinRole(min: Role) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) return next(Unauthorized());
    if (ROLE_RANK[req.auth.role] < ROLE_RANK[min]) {
      return next(Forbidden("Permissão insuficiente."));
    }
    return next();
  };
}

export { ROLE_RANK };
