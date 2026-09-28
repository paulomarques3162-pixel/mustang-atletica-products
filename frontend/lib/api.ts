/**
 * Cliente HTTP da API da Mustang Atlética.
 *
 * - Access token em memória (menor exposição a XSS).
 * - Refresh token em localStorage apenas como fallback cross-origin
 *   (Vercel → Render), quando cookies de terceiros estão bloqueados.
 * - Nenhum segredo de pagamento trafega por aqui.
 */

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const REFRESH_KEY = "ma.refresh";

let accessToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

export function setRefreshToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem(REFRESH_KEY, token);
  else localStorage.removeItem(REFRESH_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_KEY);
}

export function onSessionExpired(cb: () => void) {
  onUnauthorized = cb;
}

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  auth?: boolean;
  idempotencyKey?: string;
  cache?: RequestCache;
  /** Para requisições públicas em Server Components. */
  server?: boolean;
}

async function rawRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  if (options.idempotencyKey) headers["Idempotency-Key"] = options.idempotencyKey;

  const res = await fetch(`${API_URL}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
    credentials: "include",
    cache: options.cache ?? "no-store",
  });

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? await res.json() : null;

  if (!res.ok) {
    const err = payload?.error ?? {};
    throw new ApiError(res.status, err.code ?? "ERROR", err.message ?? "Erro na requisição.", err.details);
  }
  return payload as T;
}

async function tryRefresh(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  try {
    const result = await rawRequest<{ accessToken: string; refreshToken?: string }>("/api/auth/refresh", {
      method: "POST",
      body: refreshToken ? { refreshToken } : {},
    });
    setAccessToken(result.accessToken);
    if (result.refreshToken) setRefreshToken(result.refreshToken);
    return true;
  } catch {
    setAccessToken(null);
    setRefreshToken(null);
    onUnauthorized?.();
    return false;
  }
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  try {
    return await rawRequest<T>(path, options);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401 && !options.server) {
      const refreshed = await tryRefresh();
      if (refreshed) return rawRequest<T>(path, options);
    }
    throw err;
  }
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) => apiRequest<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>(path, { ...options, method: "POST", body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>(path, { ...options, method: "PATCH", body }),
  delete: <T>(path: string, options?: RequestOptions) =>
    apiRequest<T>(path, { ...options, method: "DELETE" }),
};

/** Busca pública segura para Server Components (sem token de usuário). */
export async function apiServer<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, { next: { revalidate: 0 } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/** Diagnóstico de ambiente exibido no admin quando algo não está conectado. */
export function apiUrlConfigured(): boolean {
  return !API_URL.includes("localhost") || process.env.NODE_ENV !== "production";
}
