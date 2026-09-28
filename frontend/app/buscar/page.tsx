import { Suspense } from "react";
import type { Metadata } from "next";
import { apiServer } from "@/lib/api";
import type { Category } from "@/lib/types";
import { ProductCatalog } from "@/components/product-catalog";
import { ProductGridSkeleton } from "@/components/states";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Buscar produtos",
  description: "Busque produtos oficiais da Mustang Atlética.",
  robots: { index: false, follow: true },
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const res = await apiServer<{ categories: Category[] }>("/api/categories");
  const categories = res?.categories ?? [];

  return (
    <div className="container-page py-10">
      <h1 className="mb-6 font-display text-3xl font-bold text-brand-ink">Buscar</h1>
      <Suspense fallback={<ProductGridSkeleton />}>
        <ProductCatalog categories={categories} initialQuery={searchParams.q ?? ""} />
      </Suspense>
    </div>
  );
}
