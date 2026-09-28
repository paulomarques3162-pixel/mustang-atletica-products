"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "./api";
import type { Cart } from "./types";

interface CartContextValue {
  cart: Cart | null;
  loading: boolean;
  error: string | null;
  addItem: (variantId: string, quantity: number) => Promise<void>;
  updateItem: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clear: () => Promise<void>;
  reload: () => Promise<void>;
  itemCount: number;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const res = await api.get<{ cart: Cart }>("/api/cart");
      setCart(res.cart);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível carregar o carrinho.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const addItem = useCallback(async (variantId: string, quantity: number) => {
    const res = await api.post<{ cart: Cart }>("/api/cart/items", { variantId, quantity });
    setCart(res.cart);
    setError(null);
  }, []);

  const updateItem = useCallback(async (itemId: string, quantity: number) => {
    const res = await api.patch<{ cart: Cart }>(`/api/cart/items/${itemId}`, { quantity });
    setCart(res.cart);
  }, []);

  const removeItem = useCallback(async (itemId: string) => {
    const res = await api.delete<{ cart: Cart }>(`/api/cart/items/${itemId}`);
    setCart(res.cart);
  }, []);

  const clear = useCallback(async () => {
    const res = await api.delete<{ cart: Cart }>("/api/cart");
    setCart(res.cart);
  }, []);

  const value = useMemo(
    () => ({
      cart,
      loading,
      error,
      addItem,
      updateItem,
      removeItem,
      clear,
      reload,
      itemCount: cart?.itemCount ?? 0,
    }),
    [cart, loading, error, addItem, updateItem, removeItem, clear, reload],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart deve ser usado dentro de CartProvider");
  return ctx;
}
