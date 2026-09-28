"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { formatBRL } from "@/lib/format";

interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discountType: "percentage" | "fixed";
  discountValue: string;
  minSubtotal: string | null;
  maxUses: number | null;
  maxUsesPerCustomer: number | null;
  usedCount: number;
  expiresAt: string | null;
  active: boolean;
}

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    code: "",
    discountType: "percentage" as "percentage" | "fixed",
    discountValue: "",
    minSubtotal: "",
    maxUses: "",
    expiresAt: "",
    active: true,
  });

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ coupons: Coupon[] }>("/api/admin/coupons");
      setCoupons(res.coupons);
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "Erro ao carregar cupons.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    try {
      await api.post("/api/admin/coupons", {
        code: form.code,
        discountType: form.discountType,
        discountValue: form.discountValue,
        minSubtotal: form.minSubtotal || null,
        maxUses: form.maxUses ? Number(form.maxUses) : null,
        expiresAt: form.expiresAt ? new Date(form.expiresAt) : null,
        active: form.active,
      });
      setForm({
        code: "", discountType: "percentage", discountValue: "",
        minSubtotal: "", maxUses: "", expiresAt: "", active: true,
      });
      setMessage("Cupom criado. Validação acontece no servidor.");
      await load();
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "Erro ao criar cupom.");
    }
  }

  async function toggle(c: Coupon) {
    await api.patch(`/api/admin/coupons/${c.id}`, { active: !c.active });
    await load();
  }

  async function remove(id: string) {
    await api.delete(`/api/admin/coupons/${id}`);
    await load();
  }

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-bold text-brand-ink">Cupons</h1>

      {message && <p role="status" className="mb-4 rounded-xl bg-brand-forest/5 px-4 py-3 text-sm">{message}</p>}

      <form onSubmit={create} className="card mb-8 grid gap-4 p-5 sm:grid-cols-3">
        <div>
          <label htmlFor="codigo" className="label">Código *</label>
          <input id="codigo" required className="input uppercase" value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
        </div>
        <div>
          <label htmlFor="tipo" className="label">Tipo *</label>
          <select id="tipo" className="input" value={form.discountType}
            onChange={(e) => setForm({ ...form, discountType: e.target.value as "percentage" | "fixed" })}>
            <option value="percentage">Percentual (%)</option>
            <option value="fixed">Valor fixo (R$)</option>
          </select>
        </div>
        <div>
          <label htmlFor="valor" className="label">Valor *</label>
          <input id="valor" required inputMode="decimal" className="input" value={form.discountValue}
            onChange={(e) => setForm({ ...form, discountValue: e.target.value })} />
        </div>
        <div>
          <label htmlFor="minimo" className="label">Compra mínima (R$)</label>
          <input id="minimo" inputMode="decimal" className="input" value={form.minSubtotal}
            onChange={(e) => setForm({ ...form, minSubtotal: e.target.value })} />
        </div>
        <div>
          <label htmlFor="limite" className="label">Limite de usos</label>
          <input id="limite" type="number" min={1} className="input" value={form.maxUses}
            onChange={(e) => setForm({ ...form, maxUses: e.target.value })} />
        </div>
        <div>
          <label htmlFor="validade" className="label">Validade</label>
          <input id="validade" type="date" className="input" value={form.expiresAt}
            onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
        </div>
        <div className="sm:col-span-3">
          <button type="submit" className="btn-primary">Criar cupom</button>
        </div>
      </form>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-black/10 text-xs uppercase tracking-wider text-black/50">
              <th scope="col" className="py-3">Código</th>
              <th scope="col" className="py-3">Desconto</th>
              <th scope="col" className="py-3">Usos</th>
              <th scope="col" className="py-3">Validade</th>
              <th scope="col" className="py-3">Status</th>
              <th scope="col" className="py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {coupons.map((c) => (
              <tr key={c.id} className="border-b border-black/5">
                <td className="py-3 font-medium">{c.code}</td>
                <td className="py-3">
                  {c.discountType === "percentage" ? `${c.discountValue}%` : formatBRL(c.discountValue)}
                  {c.minSubtotal && (
                    <span className="ml-2 text-xs text-black/40">mín. {formatBRL(c.minSubtotal)}</span>
                  )}
                </td>
                <td className="py-3">{c.usedCount}{c.maxUses ? ` / ${c.maxUses}` : ""}</td>
                <td className="py-3 text-black/60">
                  {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString("pt-BR") : "—"}
                </td>
                <td className="py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    c.active ? "bg-emerald-100 text-emerald-800" : "bg-black/10 text-black/60"
                  }`}>
                    {c.active ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td className="py-3 text-right">
                  <button type="button" className="text-brand-forest underline" onClick={() => void toggle(c)}>
                    {c.active ? "Desativar" : "Ativar"}
                  </button>
                  <button type="button" className="ml-3 text-black/60 underline hover:text-red-600"
                    onClick={() => void remove(c.id)}>
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
            {coupons.length === 0 && (
              <tr><td colSpan={6} className="py-8 text-center text-black/50">Nenhum cupom cadastrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
