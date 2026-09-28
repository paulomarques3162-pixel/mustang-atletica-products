import { Suspense } from "react";
import type { Metadata } from "next";
import { apiServer } from "@/lib/api";
import type { Category } from "@/lib/types";
import { ProductCatalog } from "@/components/product-catalog";
import { ProductGridSkeleton } from "@/components/states";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Produtos oficiais",
  description:
    "Catálogo completo de produtos oficiais da Mustang Atlética — Medicina Veterinária Anhanguera.",
  alternates: { canonical: "/produtos" },
};

export default async function ProductsPage() {
  const res = await apiServer<{ categories: Category[] }>("/api/categories");
  const categories = res?.categories ?? [];

  return (
    <div className="container-page py-10">
      <header className="mb-8">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-moss">Catálogo</span>
        <h1 className="mt-1 font-display text-3xl font-bold text-brand-ink sm:text-4xl">
          Produtos oficiais
        </h1>
        <p className="mt-2 max-w-2xl text-black/60">
          Todos os itens são cadastrados e gerenciados no painel administrativo e refletem aqui em tempo
          real.
        </p>
      </header>

      <Suspense fallback={<ProductGridSkeleton />}>
        <ProductCatalog categories={categories} />
      </Suspense>
    </div>
  );
}
