"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatBRL, formatDate, ORDER_STATUS_LABEL } from "@/lib/format";
import type { OrderSummary } from "@/lib/types";
import { ErrorState, EmptyState } from "@/components/states";

export default function MyOrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<OrderSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const res = await api.get<{ orders: OrderSummary[] }>("/api/orders");
        setOrders(res.orders);
      } catch {
        setError("Não foi possível carregar seus pedidos.");
      }
    })();
  }, [user]);

  if (authLoading) return <div className="container-page py-14"><div className="skeleton h-48" /></div>;

  if (!user) {
    return (
      <div className="container-page py-20 text-center">
        <h1 className="font-display text-2xl font-bold">Entre para ver seus pedidos</h1>
        <Link href="/login?redirect=/meus-pedidos" className="btn-primary mt-4">Entrar</Link>
      </div>
    );
  }

  return (
    <div className="container-page py-10">
      <h1 className="mb-6 font-display text-3xl font-bold text-brand-ink">Meus pedidos</h1>

      {error && <ErrorState message={error} />}
      {!orders && !error && <div className="skeleton h-48 w-full" />}
      {orders && orders.length === 0 && (
        <EmptyState
          title="Nenhum pedido ainda"
          description="Quando você finalizar uma compra, ela aparecerá aqui."
          action={<Link href="/produtos" className="btn-primary mt-2">Ver produtos</Link>}
        />
      )}

      {orders && orders.length > 0 && (
        <ul className="space-y-3">
          {orders.map((o) => (
            <li key={o.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <strong className="block text-sm">{o.number}</strong>
                <span className="text-xs text-black/50">{formatDate(o.createdAt)}</span>
              </div>
              <span className="rounded-full bg-brand-forest/5 px-3 py-1 text-xs font-semibold">
                {ORDER_STATUS_LABEL[o.status] ?? o.status}
              </span>
              <span className="font-semibold text-brand-forest">{formatBRL(o.total)}</span>
              <Link href={`/pedido/${o.id}`} className="text-sm font-semibold text-brand-forest underline">
                Detalhes
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
