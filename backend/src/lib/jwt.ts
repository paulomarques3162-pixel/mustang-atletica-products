import jwt, { SignOptions } from "jsonwebtoken";
import { env } from "../config/env";
import type { Role } from "@prisma/client";

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: Role;
  type: "access";
}

export interface RefreshTokenPayload {
  sub: string;
  jti: string;
  type: "refresh";
}

export function signAccessToken(payload: Omit<AccessTokenPayload, "type">): string {
  const options: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"],
  };
  return jwt.sign({ ...payload, type: "access" }, env.JWT_SECRET, options);
}

export function signRefreshToken(payload: Omit<RefreshTokenPayload, "type">): string {
  const options: SignOptions = {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as SignOptions["expiresIn"],
  };
  return jwt.sign({ ...payload, type: "refresh" }, env.JWT_SECRET, options);
}

export function verifyToken<T extends object>(token: string): T {
  return jwt.verify(token, env.JWT_SECRET) as T;
}
