import type { Metadata } from "next";
import { apiServer } from "@/lib/api";
import type { Category } from "@/lib/types";
import { CategoryCard } from "@/components/category-card";
import { EmptyState } from "@/components/states";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Categorias",
  description: "Explore as categorias de produtos oficiais da Mustang Atlética.",
  alternates: { canonical: "/categorias" },
};

export default async function CategoriesPage() {
  const res = await apiServer<{ categories: Category[] }>("/api/categories");
  const categories = res?.categories ?? [];

  return (
    <div className="container-page py-10">
      <header className="mb-8">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-moss">Explore</span>
        <h1 className="mt-1 font-display text-3xl font-bold text-brand-ink sm:text-4xl">Categorias</h1>
      </header>

      {categories.length === 0 ? (
        <EmptyState
          title="Nenhuma categoria disponível"
          description="As categorias são criadas no painel administrativo e aparecem aqui automaticamente."
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {categories.map((c) => (
            <CategoryCard key={c.id} category={c} />
          ))}
        </div>
      )}
    </div>
  );
}
