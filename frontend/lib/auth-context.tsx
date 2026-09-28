"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, onSessionExpired, setAccessToken, setRefreshToken } from "./api";
import type { AuthUser } from "./types";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { name: string; email: string; password: string; phone?: string }) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const result = await api.get<{ user: AuthUser }>("/api/auth/me");
      setUser(result.user);
    } catch {
      setUser(null);
    }
  }, []);

  // Restaura a sessão na primeira carga (usa refresh token, se houver).
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const result = await api.post<{ user: AuthUser; accessToken: string; refreshToken?: string }>(
          "/api/auth/refresh",
          {},
        );
        if (!mounted) return;
        setAccessToken(result.accessToken);
        if (result.refreshToken) setRefreshToken(result.refreshToken);
        setUser(result.user);
        // sincroniza carrinho do visitante, se existir
        try {
          await api.post("/api/cart/merge", {});
        } catch {
          /* sem carrinho de visitante */
        }
      } catch {
        if (mounted) setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    onSessionExpired(() => setUser(null));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await api.post<{ user: AuthUser; accessToken: string; refreshToken?: string }>(
      "/api/auth/login",
      { email, password },
    );
    setAccessToken(result.accessToken);
    if (result.refreshToken) setRefreshToken(result.refreshToken);
    setUser(result.user);
    try {
      await api.post("/api/cart/merge", {});
    } catch {
      /* carrinho sem itens de visitante */
    }
  }, []);

  const register = useCallback(
    async (data: { name: string; email: string; password: string; phone?: string }) => {
      const result = await api.post<{ user: AuthUser; accessToken: string; refreshToken?: string }>(
        "/api/auth/register",
        data,
      );
      setAccessToken(result.accessToken);
      if (result.refreshToken) setRefreshToken(result.refreshToken);
      setUser(result.user);
      try {
        await api.post("/api/cart/merge", {});
      } catch {
        /* carrinho sem itens de visitante */
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await api.post("/api/auth/logout", {});
    } catch {
      /* sessão já inválida */
    }
    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout, refresh }),
    [user, loading, login, register, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}
