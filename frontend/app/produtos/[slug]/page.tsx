import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { apiServer, API_URL } from "@/lib/api";
import type { Product } from "@/lib/types";
import { ProductDetail } from "@/components/product-detail";
import { ProductCard } from "@/components/product-card";
import { SectionTitle, EmptyState } from "@/components/states";

export const dynamic = "force-dynamic";

interface ProductResponse {
  product: Product;
  related: Product[];
}

async function getProduct(slug: string): Promise<ProductResponse | null> {
  return apiServer<ProductResponse>(`/api/products/${encodeURIComponent(slug)}`);
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const data = await getProduct(params.slug);
  if (!data) {
    return { title: "Produto não encontrado" };
  }
  const { product } = data;
  const image = product.images[0]?.url;

  return {
    title: product.name,
    description:
      product.shortDescription ??
      product.description ??
      `Produto oficial da Mustang Atlética: ${product.name}.`,
    alternates: { canonical: `/produtos/${product.slug}` },
    openGraph: {
      type: "website",
      title: product.name,
      description: product.shortDescription ?? undefined,
      url: `/produtos/${product.slug}`,
      images: image ? [{ url: image, alt: product.name }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: product.name,
      images: image ? [image] : undefined,
    },
  };
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const data = await getProduct(params.slug);
  if (!data) notFound();

  const { product, related } = data;
  const productUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/produtos/${product.slug}`;

  // Dados estruturados (Product + Breadcrumb) para SEO
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product",
        name: product.name,
        description: product.shortDescription ?? product.description ?? undefined,
        sku: product.sku,
        image: product.images.map((i) => i.url),
        category: product.category?.name,
        brand: { "@type": "Brand", name: "Mustang Atlética" },
        offers: {
          "@type": "Offer",
          url: productUrl,
          priceCurrency: "BRL",
          price: product.price,
          availability: product.available
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock",
          itemCondition: "https://schema.org/NewCondition",
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Início", item: "/" },
          { "@type": "ListItem", position: 2, name: "Produtos", item: "/produtos" },
          {
            "@type": "ListItem",
            position: 3,
            name: product.name,
            item: `/produtos/${product.slug}`,
          },
        ],
      },
    ],
  };

  return (
    <div className="container-page py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav aria-label="Você está aqui" className="mb-6 text-sm text-black/50">
        <ol className="flex flex-wrap items-center gap-2">
          <li><Link className="hover:text-brand-gold" href="/">Início</Link></li>
          <li aria-hidden>/</li>
          <li><Link className="hover:text-brand-gold" href="/produtos">Produtos</Link></li>
          <li aria-hidden>/</li>
          <li className="truncate text-brand-ink" aria-current="page">{product.name}</li>
        </ol>
      </nav>

      <ProductDetail product={product} />

      <section className="mt-16">
        <SectionTitle eyebrow="Você também pode gostar" title="Produtos relacionados" />
        {related.length === 0 ? (
          <EmptyState title="Sem produtos relacionados" description="Ainda não há itens na mesma categoria." />
        ) : (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
