import type { MetadataRoute } from "next";
import { apiServer } from "@/lib/api";
import type { Paginated, Product } from "@/lib/types";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    "",
    "/produtos",
    "/categorias",
    "/sobre",
    "/contato",
    "/politica-de-privacidade",
    "/termos",
    "/politica-de-troca",
    "/politica-de-entrega",
  ].map((path) => ({
    url: `${APP_URL}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : 0.6,
  }));

  const res = await apiServer<Paginated<Product>>("/api/products?perPage=60");
  const productRoutes: MetadataRoute.Sitemap = (res?.items ?? []).map((p) => ({
    url: `${APP_URL}/produtos/${p.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticRoutes, ...productRoutes];
}
