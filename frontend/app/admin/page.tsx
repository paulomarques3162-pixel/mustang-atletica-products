"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { formatBRL, formatDate, ORDER_STATUS_LABEL } from "@/lib/format";
import { ErrorState, EmptyState } from "@/components/states";

interface Dashboard {
  revenue: string;
  averageTicket: string;
  orderCount: number;
  pendingOrders: number;
  paidOrders: number;
  canceledOrders: number;
  pendingPayments: number;
  customerCount: number;
  productCount: number;
  lowStock: Array<{ variantId: string; sku: string; productName: string; stock: number }>;
  recentOrders: Array<{
    id: string;
    number: string;
    status: string;
    total: string;
    createdAt: string;
    itemCount: number;
  }>;
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setData(await api.get<Dashboard>("/api/admin/dashboard"));
    } catch {
      setError("Não foi possível carregar o dashboard. Verifique a conexão com a API.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!data) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton h-28" />)}
      </div>
    );
  }

  const metrics = [
    { label: "Receita confirmada", value: formatBRL(data.revenue) },
    { label: "Ticket médio", value: formatBRL(data.averageTicket) },
    { label: "Pedidos totais", value: String(data.orderCount) },
    { label: "Aguardando pagamento", value: String(data.pendingOrders) },
    { label: "Confirmados", value: String(data.paidOrders) },
    { label: "Cancelados", value: String(data.canceledOrders) },
    { label: "Clientes", value: String(data.customerCount) },
    { label: "Produtos", value: String(data.productCount) },
  ];

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-bold text-brand-ink">Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m) => (
          <div key={m.label} className="card p-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-black/50">{m.label}</span>
            <p className="mt-2 font-display text-2xl font-bold text-brand-forest">{m.value}</p>
          </div>
        ))}
      </div>

      <p className="mt-3 text-xs text-black/50">
        Dados calculados diretamente do banco. Sem números fictícios.
        {data.pendingPayments > 0 && ` ${data.pendingPayments} pagamento(s) pendente(s).`}
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="font-display text-lg font-semibold">Estoque baixo</h2>
          {data.lowStock.length === 0 ? (
            <p className="mt-2 text-sm text-black/60">Nenhuma variação com estoque crítico.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {data.lowStock.map((l) => (
                <li key={l.variantId} className="flex items-center justify-between gap-3">
                  <span>
                    {l.productName} <span className="text-black/40">({l.sku})</span>
                  </span>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                    {l.stock} un.
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Link href="/admin/estoque" className="mt-4 inline-block text-sm font-semibold text-brand-forest underline">
            Gerenciar estoque
          </Link>
        </section>

        <section className="card p-5">
          <h2 className="font-display text-lg font-semibold">Pedidos recentes</h2>
          {data.recentOrders.length === 0 ? (
            <EmptyState title="Nenhum pedido ainda" />
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {data.recentOrders.map((o) => (
                <li key={o.id} className="flex flex-wrap items-center justify-between gap-2">
                  <Link href="/admin/pedidos" className="font-medium hover:text-brand-gold">
                    {o.number}
                  </Link>
                  <span className="text-xs text-black/50">{formatDate(o.createdAt)}</span>
                  <span className="text-xs">{ORDER_STATUS_LABEL[o.status] ?? o.status}</span>
                  <span className="font-semibold">{formatBRL(o.total)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
