"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";

interface AdminCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  position: number;
  active: boolean;
  productCount: number;
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [form, setForm] = useState({ id: "", name: "", description: "", position: 0, active: true });
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ categories: AdminCategory[] }>("/api/admin/categories");
      setCategories(res.categories);
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "Erro ao carregar categorias.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    try {
      const payload = {
        name: form.name,
        description: form.description || undefined,
        position: Number(form.position) || 0,
        active: form.active,
      };
      if (form.id) await api.patch(`/api/admin/categories/${form.id}`, payload);
      else await api.post("/api/admin/categories", payload);
      setForm({ id: "", name: "", description: "", position: 0, active: true });
      setMessage("Categoria salva. Já disponível no site.");
      await load();
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "Erro ao salvar categoria.");
    }
  }

  async function remove(id: string) {
    try {
      await api.delete(`/api/admin/categories/${id}`);
      await load();
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "Erro ao excluir categoria.");
    }
  }

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-bold text-brand-ink">Categorias</h1>

      {message && <p role="status" className="mb-4 rounded-xl bg-brand-forest/5 px-4 py-3 text-sm">{message}</p>}

      <form onSubmit={save} className="card mb-8 grid gap-4 p-5 sm:grid-cols-4">
        <div className="sm:col-span-2">
          <label htmlFor="nome" className="label">Nome *</label>
          <input id="nome" required className="input" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <label htmlFor="posicao" className="label">Posição</label>
          <input id="posicao" type="number" className="input" value={form.position}
            onChange={(e) => setForm({ ...form, position: Number(e.target.value) })} />
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })} />
            Ativa
          </label>
        </div>
        <div className="sm:col-span-4">
          <label htmlFor="desc" className="label">Descrição</label>
          <input id="desc" className="input" value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="sm:col-span-4 flex gap-3">
          <button type="submit" className="btn-primary">{form.id ? "Atualizar" : "Criar categoria"}</button>
          {form.id && (
            <button type="button" className="btn-ghost"
              onClick={() => setForm({ id: "", name: "", description: "", position: 0, active: true })}>
              Cancelar edição
            </button>
          )}
        </div>
      </form>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-black/10 text-xs uppercase tracking-wider text-black/50">
              <th scope="col" className="py-3">Categoria</th>
              <th scope="col" className="py-3">Slug</th>
              <th scope="col" className="py-3">Produtos</th>
              <th scope="col" className="py-3">Status</th>
              <th scope="col" className="py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.id} className="border-b border-black/5">
                <td className="py-3 font-medium">{c.name}</td>
                <td className="py-3 text-black/50">{c.slug}</td>
                <td className="py-3">{c.productCount}</td>
                <td className="py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    c.active ? "bg-emerald-100 text-emerald-800" : "bg-black/10 text-black/60"
                  }`}>
                    {c.active ? "Ativa" : "Inativa"}
                  </span>
                </td>
                <td className="py-3 text-right">
                  <button type="button" className="text-brand-forest underline"
                    onClick={() => setForm({
                      id: c.id, name: c.name, description: c.description ?? "",
                      position: c.position, active: c.active,
                    })}>
                    Editar
                  </button>
                  <button type="button" className="ml-3 text-black/60 underline hover:text-red-600"
                    onClick={() => void remove(c.id)}>
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
            {categories.length === 0 && (
              <tr><td colSpan={5} className="py-8 text-center text-black/50">Nenhuma categoria.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
