"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import type { Category, Paginated, Product } from "@/lib/types";
import { ProductCard } from "./product-card";
import { ProductGridSkeleton, EmptyState, ErrorState } from "./states";
import { track } from "@/lib/analytics";

interface Props {
  categories: Category[];
  initialQuery?: string;
}

const SORTS = [
  { value: "featured", label: "Destaques" },
  { value: "price_asc", label: "Menor preço" },
  { value: "price_desc", label: "Maior preço" },
  { value: "name_asc", label: "Nome (A–Z)" },
];

export function ProductCatalog({ categories, initialQuery = "" }: Props) {
  const router = useRouter();
  const params = useSearchParams();

  const [query, setQuery] = useState(params.get("q") ?? initialQuery);
  const [category, setCategory] = useState(params.get("categoria") ?? "");
  const [sort, setSort] = useState(params.get("sort") ?? "featured");
  const [page, setPage] = useState(Number(params.get("page") ?? 1));

  const [data, setData] = useState<Paginated<Product> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({
        page: String(page),
        perPage: "12",
        ...(query ? { q: query } : {}),
        ...(category ? { category } : {}),
        ...(sort ? { sort } : {}),
      });
      const res = await api.get<Paginated<Product>>(`/api/products?${qs.toString()}`);
      setData(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Falha ao carregar o catálogo.");
    } finally {
      setLoading(false);
    }
  }, [page, query, category, sort]);

  useEffect(() => {
    void fetchProducts();
  }, [fetchProducts]);

  // mantém a URL sincronizada (URLs amigáveis e compartilháveis)
  useEffect(() => {
    const qs = new URLSearchParams();
    if (query) qs.set("q", query);
    if (category) qs.set("categoria", category);
    if (sort && sort !== "featured") qs.set("sort", sort);
    if (page > 1) qs.set("page", String(page));
    const base = initialQuery || query ? "/buscar" : "/produtos";
    const next = qs.toString() ? `${base}?${qs.toString()}` : base;
    window.history.replaceState(null, "", next);
  }, [query, category, sort, page, initialQuery]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    track("search", { term: query });
    void fetchProducts();
  }

  const meta = data?.meta;
  const items = useMemo(() => data?.items ?? [], [data]);

  return (
    <div>
      {/* Filtros */}
      <form onSubmit={handleSubmit} className="card mb-8 grid gap-3 p-4 sm:grid-cols-[1fr_auto_auto]">
        <div>
          <label htmlFor="busca" className="label">
            Buscar produto
          </label>
          <input
            id="busca"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Camiseta, moletom, boné..."
            className="input"
          />
        </div>

        <div>
          <label htmlFor="categoria" className="label">
            Categoria
          </label>
          <select
            id="categoria"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
            className="input"
          >
            <option value="">Todas</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="ordem" className="label">
            Ordenar
          </label>
          <select
            id="ordem"
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              setPage(1);
            }}
            className="input"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </form>

      {/* Estados */}
      {loading && <ProductGridSkeleton />}

      {!loading && error && <ErrorState message={error} onRetry={() => void fetchProducts()} />}

      {!loading && !error && items.length === 0 && (
        <EmptyState
          title="Nenhum produto encontrado"
          description={
            query || category
              ? "Tente ajustar a busca ou remover os filtros."
              : "Ainda não há produtos publicados no catálogo."
          }
          action={
            (query || category) && (
              <button
                type="button"
                className="btn-secondary mt-2"
                onClick={() => {
                  setQuery("");
                  setCategory("");
                  setPage(1);
                }}
              >
                Limpar filtros
              </button>
            )
          }
        />
      )}

      {!loading && !error && items.length > 0 && (
        <>
          <p className="mb-4 text-sm text-black/60" aria-live="polite">
            {meta?.total} {meta?.total === 1 ? "produto" : "produtos"} encontrados
          </p>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>

          {meta && meta.totalPages > 1 && (
            <nav className="mt-10 flex items-center justify-center gap-2" aria-label="Paginação">
              <button
                type="button"
                className="btn-ghost"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Anterior
              </button>
              <span className="px-3 text-sm text-black/60">
                Página {meta.page} de {meta.totalPages}
              </span>
              <button
                type="button"
                className="btn-ghost"
                disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Próxima
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
