"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  formatBRL,
  formatDate,
  ORDER_STATUS_LABEL,
  PAYMENT_METHOD_LABEL,
  PAYMENT_STATUS_LABEL,
} from "@/lib/format";
import { ErrorState } from "@/components/states";

interface OrderDetail {
  id: string;
  number: string;
  status: string;
  subtotal: string;
  discount: string;
  shipping: string;
  total: string;
  createdAt: string;
  shippingMethod: string | null;
  trackingCode: string | null;
  items: Array<{
    id: string;
    productName: string;
    variantLabel: string | null;
    sku: string;
    unitPrice: string;
    quantity: number;
    total: string;
  }>;
  payments: Array<{ id: string; method: string; status: string; amount: string; provider: string }>;
  events?: Array<{ type: string; message: string | null; createdAt: string }>;
}

export default function OrderPage() {
  const params = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ order: OrderDetail }>(`/api/orders/${params.id}`);
      setOrder(res.order);
    } catch {
      setError("Pedido não encontrado ou você não tem acesso a ele.");
    }
  }, [params.id]);

  useEffect(() => {
    if (!authLoading) void load();
  }, [authLoading, load]);

  if (authLoading) return <div className="container-page py-14"><div className="skeleton h-64" /></div>;

  if (!user) {
    return (
      <div className="container-page py-20 text-center">
        <h1 className="font-display text-2xl font-bold">Entre para ver este pedido</h1>
        <Link href={`/login?redirect=/pedido/${params.id}`} className="btn-primary mt-4">Entrar</Link>
      </div>
    );
  }

  if (error) return <div className="container-page py-14"><ErrorState message={error} onRetry={() => void load()} /></div>;
  if (!order) return <div className="container-page py-14"><div className="skeleton h-64 w-full" /></div>;

  return (
    <div className="container-page max-w-3xl py-10">
      <nav aria-label="Você está aqui" className="mb-4 text-sm text-black/50">
        <Link href="/meus-pedidos" className="hover:text-brand-gold">Meus pedidos</Link> / {order.number}
      </nav>

      <header className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold text-brand-ink">Pedido {order.number}</h1>
            <p className="text-sm text-black/50">{formatDate(order.createdAt)}</p>
          </div>
          <span className="rounded-full bg-brand-forest/5 px-4 py-1.5 text-sm font-semibold">
            {ORDER_STATUS_LABEL[order.status] ?? order.status}
          </span>
        </div>
        {order.trackingCode && (
          <p className="mt-3 text-sm">
            Código de rastreio: <strong>{order.trackingCode}</strong>
          </p>
        )}
      </header>

      <section className="card mt-6 p-6">
        <h2 className="font-display text-lg font-semibold">Itens</h2>
        <ul className="mt-3 divide-y divide-black/5">
          {order.items.map((i) => (
            <li key={i.id} className="flex items-start justify-between gap-3 py-3 text-sm">
              <div>
                <span className="block font-medium">{i.productName}</span>
                <span className="text-black/50">
                  {i.variantLabel ?? "—"} • SKU {i.sku}
                </span>
                <span className="block text-black/50">
                  {i.quantity} × {formatBRL(i.unitPrice)}
                </span>
              </div>
              <span className="font-semibold">{formatBRL(i.total)}</span>
            </li>
          ))}
        </ul>

        <dl className="mt-4 space-y-1 border-t border-black/10 pt-4 text-sm">
          <div className="flex justify-between"><dt className="text-black/60">Subtotal</dt><dd>{formatBRL(order.subtotal)}</dd></div>
          <div className="flex justify-between"><dt className="text-black/60">Desconto</dt><dd>-{formatBRL(order.discount)}</dd></div>
          <div className="flex justify-between"><dt className="text-black/60">Frete</dt><dd>{formatBRL(order.shipping)}</dd></div>
          <div className="flex justify-between border-t border-black/10 pt-2 text-base">
            <dt className="font-semibold">Total</dt>
            <dd className="font-bold text-brand-forest">{formatBRL(order.total)}</dd>
          </div>
        </dl>
      </section>

      <section className="card mt-6 p-6">
        <h2 className="font-display text-lg font-semibold">Pagamentos</h2>
        {order.payments.length === 0 ? (
          <p className="mt-2 text-sm text-black/60">Nenhum pagamento registrado.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {order.payments.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2">
                <span>{PAYMENT_METHOD_LABEL[p.method] ?? p.method}</span>
                <span className="rounded-full bg-brand-forest/5 px-3 py-1 text-xs font-semibold">
                  {PAYMENT_STATUS_LABEL[p.status] ?? p.status}
                </span>
                <span className="font-semibold">{formatBRL(p.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {order.events && order.events.length > 0 && (
        <section className="card mt-6 p-6">
          <h2 className="font-display text-lg font-semibold">Histórico</h2>
          <ol className="mt-3 space-y-2 text-sm">
            {order.events.map((e, idx) => (
              <li key={idx} className="flex gap-3">
                <span className="text-black/40">{formatDate(e.createdAt)}</span>
                <span>{e.message ?? e.type}</span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
