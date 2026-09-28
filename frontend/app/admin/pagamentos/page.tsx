"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { formatBRL, formatDate } from "@/lib/format";

interface PaymentRow {
  id: string;
  orderNumber: string;
  customerName: string;
  provider: string;
  method: string;
  status: string;
  amount: string;
  createdAt: string;
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ payments: PaymentRow[] }>("/api/admin/payments");
      setPayments(res.payments);
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "Erro ao carregar pagamentos.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function refund(id: string) {
    const amount = window.prompt("Valor do estorno (deixe vazio para estorno total):") ?? undefined;
    try {
      await api.post(`/api/admin/payments/${id}/refund`, amount ? { amount } : {});
      setMessage("Estorno solicitado ao provedor.");
      await load();
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "Erro ao estornar.");
    }
  }

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-bold text-brand-ink">Pagamentos</h1>

      {message && <p role="status" className="mb-4 rounded-xl bg-brand-forest/5 px-4 py-3 text-sm">{message}</p>}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead>
            <tr className="border-b border-black/10 text-xs uppercase tracking-wider text-black/50">
              <th scope="col" className="py-3">Pedido</th>
              <th scope="col" className="py-3">Cliente</th>
              <th scope="col" className="py-3">Provedor</th>
              <th scope="col" className="py-3">Método</th>
              <th scope="col" className="py-3">Status</th>
              <th scope="col" className="py-3">Valor</th>
              <th scope="col" className="py-3">Data</th>
              <th scope="col" className="py-3 text-right">Ação</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id} className="border-b border-black/5">
                <td className="py-3 font-medium">{p.orderNumber}</td>
                <td className="py-3 text-black/70">{p.customerName}</td>
                <td className="py-3 text-black/60">{p.provider}</td>
                <td className="py-3">{p.method}</td>
                <td className="py-3">{p.status}</td>
                <td className="py-3 font-semibold">{formatBRL(p.amount)}</td>
                <td className="py-3 text-black/50">{formatDate(p.createdAt)}</td>
                <td className="py-3 text-right">
                  {p.status === "paid" && (
                    <button type="button" className="text-black/60 underline hover:text-red-600"
                      onClick={() => void refund(p.id)}>
                      Estornar
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {payments.length === 0 && (
              <tr><td colSpan={8} className="py-8 text-center text-black/50">Nenhum pagamento registrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
