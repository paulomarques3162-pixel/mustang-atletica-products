"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { formatBRL } from "@/lib/format";
import type { Category, Product } from "@/lib/types";
import { ErrorState } from "@/components/states";

interface VariantForm {
  id?: string;
  sku: string;
  size: string;
  color: string;
  price: string;
  stock: number;
  active: boolean;
}

interface ProductForm {
  id?: string;
  name: string;
  sku: string;
  categoryId: string;
  shortDescription: string;
  description: string;
  basePrice: string;
  promotionalPrice: string;
  badge: string;
  active: boolean;
  featured: boolean;
  variants: VariantForm[];
  images: Array<{ url: string; alt: string; position: number }>;
}

const emptyForm = (categoryId: string): ProductForm => ({
  name: "",
  sku: "",
  categoryId,
  shortDescription: "",
  description: "",
  basePrice: "",
  promotionalPrice: "",
  badge: "",
  active: true,
  featured: false,
  variants: [{ sku: "", size: "", color: "", price: "", stock: 0, active: true }],
  images: [],
});

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<ProductForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, c] = await Promise.all([
        api.get<{ products: Product[] }>("/api/admin/products"),
        api.get<{ categories: Category[] }>("/api/admin/categories"),
      ]);
      setProducts(p.products);
      setCategories(c.categories);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Falha ao carregar produtos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setMessage(null);
    try {
      const payload = {
        name: form.name,
        sku: form.sku,
        categoryId: form.categoryId,
        shortDescription: form.shortDescription || undefined,
        description: form.description || undefined,
        basePrice: form.basePrice,
        promotionalPrice: form.promotionalPrice || null,
        badge: form.badge || null,
        active: form.active,
        featured: form.featured,
        variants: form.variants.map((v) => ({
          id: v.id,
          sku: v.sku,
          size: v.size || undefined,
          color: v.color || undefined,
          price: v.price || undefined,
          stock: Number(v.stock) || 0,
          active: v.active,
        })),
        images: form.images.filter((i) => i.url),
      };

      if (form.id) {
        await api.patch(`/api/admin/products/${form.id}`, payload);
        setMessage("Produto atualizado. As alterações já refletem na loja.");
      } else {
        await api.post("/api/admin/products", payload);
        setMessage("Produto criado. Ele já aparece no site público.");
      }
      setForm(null);
      await load();
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "Erro ao salvar produto.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(product: Product) {
    try {
      await api.patch(`/api/admin/products/${product.id}/active`, { active: !product.active });
      await load();
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "Erro ao alterar status.");
    }
  }

  function startEdit(p: Product) {
    setForm({
      id: p.id,
      name: p.name,
      sku: p.sku,
      categoryId: p.category?.id ?? categories[0]?.id ?? "",
      shortDescription: p.shortDescription ?? "",
      description: p.description ?? "",
      basePrice: p.price,
      promotionalPrice: p.compareAtPrice ?? "",
      badge: p.badge ?? "",
      active: p.active,
      featured: p.featured,
      variants: p.variants.map((v) => ({
        id: v.id,
        sku: v.sku,
        size: v.size ?? "",
        color: v.color ?? "",
        price: v.price ?? "",
        stock: v.stock,
        active: v.active,
      })),
      images: p.images.map((i) => ({ url: i.url, alt: i.alt ?? "", position: i.position })),
    });
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold text-brand-ink">Produtos</h1>
        <button
          type="button"
          className="btn-primary"
          onClick={() => setForm(emptyForm(categories[0]?.id ?? ""))}
          disabled={categories.length === 0}
        >
          Novo produto
        </button>
      </div>

      {categories.length === 0 && (
        <p className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Crie ao menos uma categoria antes de cadastrar produtos.
        </p>
      )}

      {message && (
        <p role="status" className="mb-4 rounded-xl bg-brand-forest/5 px-4 py-3 text-sm">{message}</p>
      )}
      {error && <ErrorState message={error} onRetry={() => void load()} />}

      {form && (
        <form onSubmit={save} className="card mb-8 space-y-4 p-5">
          <h2 className="font-display text-lg font-semibold">
            {form.id ? "Editar produto" : "Novo produto"}
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="nome" className="label">Nome *</label>
              <input id="nome" required className="input" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label htmlFor="sku" className="label">SKU do produto *</label>
              <input id="sku" required className="input" value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            </div>
            <div>
              <label htmlFor="cat" className="label">Categoria *</label>
              <select id="cat" required className="input" value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                <option value="">Selecione</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="badge" className="label">Selo</label>
              <input id="badge" className="input" value={form.badge} placeholder="Ex.: Novo, Oficial"
                onChange={(e) => setForm({ ...form, badge: e.target.value })} />
            </div>
            <div>
              <label htmlFor="preco" className="label">Preço base (R$) *</label>
              <input id="preco" required inputMode="decimal" className="input" value={form.basePrice}
                onChange={(e) => setForm({ ...form, basePrice: e.target.value })} placeholder="0.00" />
            </div>
            <div>
              <label htmlFor="promo" className="label">Preço promocional (R$)</label>
              <input id="promo" inputMode="decimal" className="input" value={form.promotionalPrice}
                onChange={(e) => setForm({ ...form, promotionalPrice: e.target.value })} placeholder="opcional" />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="resumo" className="label">Descrição curta</label>
              <input id="resumo" className="input" value={form.shortDescription}
                onChange={(e) => setForm({ ...form, shortDescription: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="desc" className="label">Descrição completa</label>
              <textarea id="desc" rows={4} className="input" value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
          </div>

          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })} />
              Produto ativo (visível na loja)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.featured}
                onChange={(e) => setForm({ ...form, featured: e.target.checked })} />
              Destacar na home
            </label>
          </div>

          {/* Variações */}
          <fieldset className="rounded-xl border border-black/10 p-4">
            <legend className="px-2 text-sm font-semibold">Variações (tamanho / cor / estoque)</legend>
            <div className="space-y-3">
              {form.variants.map((v, idx) => (
                <div key={idx} className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_1fr_auto_auto]">
                  <input aria-label="SKU da variação" className="input" placeholder="SKU" value={v.sku}
                    onChange={(e) => {
                      const variants = [...form.variants];
                      variants[idx] = { ...v, sku: e.target.value };
                      setForm({ ...form, variants });
                    }} />
                  <input aria-label="Tamanho" className="input" placeholder="Tamanho" value={v.size}
                    onChange={(e) => {
                      const variants = [...form.variants];
                      variants[idx] = { ...v, size: e.target.value };
                      setForm({ ...form, variants });
                    }} />
                  <input aria-label="Cor" className="input" placeholder="Cor" value={v.color}
                    onChange={(e) => {
                      const variants = [...form.variants];
                      variants[idx] = { ...v, color: e.target.value };
                      setForm({ ...form, variants });
                    }} />
                  <input aria-label="Preço da variação" className="input" placeholder="Preço (opcional)" value={v.price}
                    onChange={(e) => {
                      const variants = [...form.variants];
                      variants[idx] = { ...v, price: e.target.value };
                      setForm({ ...form, variants });
                    }} />
                  <input aria-label="Estoque" type="number" min={0} className="input w-24" value={v.stock}
                    onChange={(e) => {
                      const variants = [...form.variants];
                      variants[idx] = { ...v, stock: Number(e.target.value) };
                      setForm({ ...form, variants });
                    }} />
                  <button type="button" className="btn-ghost px-3 text-red-600"
                    aria-label="Remover variação"
                    onClick={() => setForm({ ...form, variants: form.variants.filter((_, i) => i !== idx) })}>
                    ×
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="btn-secondary mt-3"
              onClick={() =>
                setForm({
                  ...form,
                  variants: [...form.variants, { sku: "", size: "", color: "", price: "", stock: 0, active: true }],
                })
              }
            >
              Adicionar variação
            </button>
          </fieldset>

          {/* Imagens (URLs — storage externo) */}
          <fieldset className="rounded-xl border border-black/10 p-4">
            <legend className="px-2 text-sm font-semibold">Imagens (URLs)</legend>
            <p className="mb-2 text-xs text-black/50">
              Use URLs de storage externo (S3/Cloudinary/R2). Não use arquivos locais do servidor.
            </p>
            <div className="space-y-3">
              {form.images.map((img, idx) => (
                <div key={idx} className="grid gap-2 sm:grid-cols-[2fr_1fr_auto]">
                  <input aria-label="URL da imagem" className="input" placeholder="https://..." value={img.url}
                    onChange={(e) => {
                      const images = [...form.images];
                      images[idx] = { ...img, url: e.target.value, position: idx };
                      setForm({ ...form, images });
                    }} />
                  <input aria-label="Texto alternativo" className="input" placeholder="Alt" value={img.alt}
                    onChange={(e) => {
                      const images = [...form.images];
                      images[idx] = { ...img, alt: e.target.value, position: idx };
                      setForm({ ...form, images });
                    }} />
                  <button type="button" className="btn-ghost px-3 text-red-600"
                    aria-label="Remover imagem"
                    onClick={() => setForm({ ...form, images: form.images.filter((_, i) => i !== idx) })}>
                    ×
                  </button>
                </div>
              ))}
            </div>
            <button type="button" className="btn-secondary mt-3"
              onClick={() => setForm({ ...form, images: [...form.images, { url: "", alt: "", position: form.images.length }] })}>
              Adicionar imagem
            </button>
          </fieldset>

          <div className="flex gap-3">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Salvando..." : "Salvar produto"}
            </button>
            <button type="button" className="btn-ghost" onClick={() => setForm(null)}>Cancelar</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-16" />)}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <caption className="sr-only">Lista de produtos</caption>
            <thead>
              <tr className="border-b border-black/10 text-xs uppercase tracking-wider text-black/50">
                <th scope="col" className="py-3">Produto</th>
                <th scope="col" className="py-3">Categoria</th>
                <th scope="col" className="py-3">Preço</th>
                <th scope="col" className="py-3">Estoque</th>
                <th scope="col" className="py-3">Status</th>
                <th scope="col" className="py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b border-black/5">
                  <td className="py-3">
                    <span className="block font-medium">{p.name}</span>
                    <span className="text-xs text-black/40">{p.sku}</span>
                  </td>
                  <td className="py-3">{p.category?.name ?? "—"}</td>
                  <td className="py-3">{formatBRL(p.price)}</td>
                  <td className="py-3">{p.totalStock}</td>
                  <td className="py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      p.active ? "bg-emerald-100 text-emerald-800" : "bg-black/10 text-black/60"
                    }`}>
                      {p.active ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <button type="button" className="text-brand-forest underline" onClick={() => startEdit(p)}>
                      Editar
                    </button>
                    <button type="button" className="ml-3 text-black/60 underline hover:text-red-600"
                      onClick={() => void toggleActive(p)}>
                      {p.active ? "Desativar" : "Ativar"}
                    </button>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-black/50">
                    Nenhum produto cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
