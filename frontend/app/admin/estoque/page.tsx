"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";

interface InventoryRow {
  id: string;
  sku: string;
  productName: string;
  slug: string;
  size: string | null;
  color: string | null;
  stock: number;
  active: boolean;
}

interface Movement {
  id: string;
  type: string;
  quantity: number;
  reason: string | null;
  createdAt: string;
  variant: { sku: string };
}

export default function AdminInventoryPage() {
  const [rows, setRows] = useState<InventoryRow[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [inv, mov] = await Promise.all([
        api.get<{ variants: InventoryRow[] }>("/api/admin/inventory"),
        api.get<{ movements: Movement[] }>("/api/admin/inventory/movements"),
      ]);
      setRows(inv.variants);
      setMovements(mov.movements);
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "Erro ao carregar estoque.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function adjust(row: InventoryRow) {
    const value = edits[row.id];
    if (value === undefined) return;
    try {
      await api.post(`/api/admin/inventory/${row.id}/adjust`, {
        stock: Number(value),
        reason: "Ajuste pelo painel administrativo",
      });
      setMessage(`Estoque de ${row.sku} ajustado para ${value}.`);
      setEdits((e) => ({ ...e, [row.id]: "" }));
      await load();
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "Erro ao ajustar estoque.");
    }
  }

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-bold text-brand-ink">Estoque</h1>

      {message && <p role="status" className="mb-4 rounded-xl bg-brand-forest/5 px-4 py-3 text-sm">{message}</p>}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-black/10 text-xs uppercase tracking-wider text-black/50">
              <th scope="col" className="py-3">Produto</th>
              <th scope="col" className="py-3">Variação</th>
              <th scope="col" className="py-3">SKU</th>
              <th scope="col" className="py-3">Estoque</th>
              <th scope="col" className="py-3">Novo valor</th>
              <th scope="col" className="py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-black/5">
                <td className="py-3 font-medium">{r.productName}</td>
                <td className="py-3 text-black/60">{[r.size, r.color].filter(Boolean).join(" / ") || "—"}</td>
                <td className="py-3 text-xs text-black/40">{r.sku}</td>
                <td className="py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    r.stock === 0 ? "bg-red-100 text-red-700"
                    : r.stock <= 3 ? "bg-amber-100 text-amber-800"
                    : "bg-emerald-100 text-emerald-800"
                  }`}>
                    {r.stock}
                  </span>
                </td>
                <td className="py-3">
                  <label className="sr-only" htmlFor={`stock-${r.id}`}>
                    Novo estoque para {r.sku}
                  </label>
                  <input
                    id={`stock-${r.id}`}
                    type="number"
                    min={0}
                    className="input w-28"
                    value={edits[r.id] ?? ""}
                    onChange={(e) => setEdits((s) => ({ ...s, [r.id]: e.target.value }))}
                    placeholder={String(r.stock)}
                  />
                </td>
                <td className="py-3 text-right">
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={!edits[r.id]}
                    onClick={() => void adjust(r)}
                  >
                    Ajustar
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={6} className="py-8 text-center text-black/50">Nenhuma variação cadastrada.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <section className="mt-10">
        <h2 className="mb-3 font-display text-lg font-semibold">Últimas movimentações</h2>
        <ul className="card divide-y divide-black/5 p-4 text-sm">
          {movements.slice(0, 15).map((m) => (
            <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span className="text-xs text-black/50">{new Date(m.createdAt).toLocaleString("pt-BR")}</span>
              <span className="font-medium">{m.variant.sku}</span>
              <span className="rounded-full bg-brand-forest/5 px-2 py-0.5 text-xs">{m.type}</span>
              <span>{m.quantity} un.</span>
              <span className="text-xs text-black/50">{m.reason}</span>
            </li>
          ))}
          {movements.length === 0 && <li className="py-4 text-center text-black/50">Sem movimentações.</li>}
        </ul>
      </section>
    </div>
  );
}
