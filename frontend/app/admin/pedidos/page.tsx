"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { formatBRL, formatDate, ORDER_STATUS_LABEL } from "@/lib/format";

interface AdminOrder {
  id: string;
  number: string;
  status: string;
  total: string;
  customerName: string;
  customerEmail: string;
  createdAt: string;
  itemCount: number;
  paymentStatus: string | null;
  paymentMethod: string | null;
}

const STATUSES = [
  "pending",
  "awaiting_payment",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "canceled",
  "refunded",
];

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [filter, setFilter] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ orders: AdminOrder[] }>(
        `/api/admin/orders${filter ? `?status=${filter}` : ""}`,
      );
      setOrders(res.orders);
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "Erro ao carregar pedidos.");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function updateStatus(id: string, status: string) {
    try {
      await api.patch(`/api/admin/orders/${id}/status`, { status });
      setMessage("Status atualizado.");
      await load();
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "Erro ao atualizar status.");
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold text-brand-ink">Pedidos</h1>
        <div>
          <label htmlFor="filtro" className="sr-only">Filtrar por status</label>
          <select id="filtro" className="input" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">Todos os status</option>
            {STATUSES.map((s) => <option key={s} value={s}>{ORDER_STATUS_LABEL[s] ?? s}</option>)}
          </select>
        </div>
      </div>

      {message && <p role="status" className="mb-4 rounded-xl bg-brand-forest/5 px-4 py-3 text-sm">{message}</p>}

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-16" />)}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="border-b border-black/10 text-xs uppercase tracking-wider text-black/50">
                <th scope="col" className="py-3">Pedido</th>
                <th scope="col" className="py-3">Cliente</th>
                <th scope="col" className="py-3">Data</th>
                <th scope="col" className="py-3">Total</th>
                <th scope="col" className="py-3">Pagamento</th>
                <th scope="col" className="py-3">Status</th>
                <th scope="col" className="py-3">Alterar</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-black/5">
                  <td className="py-3 font-medium">{o.number}</td>
                  <td className="py-3">
                    <span className="block">{o.customerName}</span>
                    <span className="text-xs text-black/40">{o.customerEmail}</span>
                  </td>
                  <td className="py-3 text-black/60">{formatDate(o.createdAt)}</td>
                  <td className="py-3 font-semibold">{formatBRL(o.total)}</td>
                  <td className="py-3 text-xs">
                    {o.paymentMethod ? `${o.paymentMethod} • ${o.paymentStatus}` : "—"}
                  </td>
                  <td className="py-3">{ORDER_STATUS_LABEL[o.status] ?? o.status}</td>
                  <td className="py-3">
                    <label className="sr-only" htmlFor={`status-${o.id}`}>Alterar status do pedido {o.number}</label>
                    <select
                      id={`status-${o.id}`}
                      className="input"
                      value={o.status}
                      onChange={(e) => void updateStatus(o.id, e.target.value)}
                    >
                      {STATUSES.map((s) => <option key={s} value={s}>{ORDER_STATUS_LABEL[s] ?? s}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr><td colSpan={7} className="py-8 text-center text-black/50">Nenhum pedido.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
