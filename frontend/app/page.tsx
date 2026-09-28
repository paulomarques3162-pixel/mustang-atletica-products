import Image from "next/image";
import Link from "next/link";
import { apiServer } from "@/lib/api";
import type { Category, Paginated, Product } from "@/lib/types";
import { ProductCard } from "@/components/product-card";
import { CategoryCard } from "@/components/category-card";
import { SectionTitle, EmptyState } from "@/components/states";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [productsRes, categoriesRes] = await Promise.all([
    apiServer<Paginated<Product>>("/api/products?perPage=8&sort=featured"),
    apiServer<{ categories: Category[] }>("/api/categories"),
  ]);

  const products = productsRes?.items ?? [];
  const categories = categoriesRes?.categories ?? [];
  const apiOffline = !productsRes && !categoriesRes;

  return (
    <>
      {/* ---------------- HERO ---------------- */}
      <section className="bg-brand-radial">
        <div className="container-page grid items-center gap-10 py-14 lg:grid-cols-[1.05fr_.95fr] lg:py-20">
          <div className="text-brand-cream">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-gold/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-gold">
              Produtos oficiais
            </span>
            <h1 className="mt-5 font-display text-4xl font-bold leading-[1.05] sm:text-5xl lg:text-6xl">
              MUSTANG
              <span className="block text-brand-gold">ATLÉTICA</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-brand-cream/85">
              Vista sua paixão pela Medicina Veterinária. Produtos oficiais da Mustang Atlética —
              Anhanguera.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/produtos" className="btn-primary">
                Comprar agora
              </Link>
              <Link href="/sobre" className="btn-secondary">
                Conhecer a Mustang
              </Link>
            </div>

            <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4 border-t border-white/10 pt-6 text-sm">
              <div>
                <dt className="text-brand-cream/60">Cursos</dt>
                <dd className="font-display text-lg font-semibold text-brand-gold">Veterinária</dd>
              </div>
              <div>
                <dt className="text-brand-cream/60">Identidade</dt>
                <dd className="font-display text-lg font-semibold text-brand-gold">Atlética</dd>
              </div>
              <div>
                <dt className="text-brand-cream/60">Origem</dt>
                <dd className="font-display text-lg font-semibold text-brand-gold">Anhanguera</dd>
              </div>
            </dl>
          </div>

          {/* Composição visual: card com selo oficial + elementos dourados */}
          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <div className="relative overflow-hidden rounded-3xl border border-brand-gold/30 bg-brand-forest shadow-gold">
              <div className="relative aspect-square">
                <Image
                  src="/brand-reference.png"
                  alt="Identidade visual da Mustang Atlética: cavalo branco, águia e animais da Medicina Veterinária em verde e dourado"
                  fill
                  sizes="(max-width: 1024px) 90vw, 45vw"
                  className="object-cover object-center"
                  priority
                />
                <div
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-t from-brand-forest/85 via-transparent to-transparent"
                />
                <div className="absolute inset-x-0 bottom-0 p-5">
                  <p className="font-display text-sm font-semibold uppercase tracking-[0.25em] text-brand-gold">
                    Mustang • Veterinária • Anhanguera
                  </p>
                </div>
              </div>
            </div>
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-3 -z-10 rounded-[2rem] border border-brand-gold/20"
            />
          </div>
        </div>
      </section>

      {/* ---------------- AVISO DE API ---------------- */}
      {apiOffline && (
        <div className="container-page mt-8">
          <div
            role="status"
            className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          >
            A API ainda não está respondendo neste ambiente. Configure{" "}
            <code className="rounded bg-amber-100 px-1">NEXT_PUBLIC_API_URL</code> e suba o backend para
            ver o catálogo real. Nenhum dado fictício é exibido.
          </div>
        </div>
      )}

      {/* ---------------- CATEGORIAS ---------------- */}
      <section className="container-page py-14">
        <SectionTitle
          eyebrow="Explore"
          title="Categorias"
          action={
            <Link href="/categorias" className="text-sm font-semibold text-brand-forest hover:text-brand-gold">
              Ver todas →
            </Link>
          }
        />
        {categories.length === 0 ? (
          <EmptyState
            title="Nenhuma categoria cadastrada"
            description="As categorias aparecem aqui assim que forem criadas no painel administrativo."
          />
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {categories.slice(0, 8).map((c) => (
              <CategoryCard key={c.id} category={c} />
            ))}
          </div>
        )}
      </section>

      {/* ---------------- DESTAQUES ---------------- */}
      <section className="bg-white/60 py-14">
        <div className="container-page">
          <SectionTitle
            eyebrow="Loja"
            title="Destaques oficiais"
            action={
              <Link href="/produtos" className="text-sm font-semibold text-brand-forest hover:text-brand-gold">
                Ver catálogo →
              </Link>
            }
          />
          {products.length === 0 ? (
            <EmptyState
              title="Nenhum produto publicado ainda"
              description="Cadastre produtos no painel administrativo. Eles aparecem aqui automaticamente, sem dados fictícios."
              action={
                <Link href="/produtos" className="btn-secondary mt-2">
                  Ver catálogo
                </Link>
              }
            />
          ) : (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ---------------- VALORES ---------------- */}
      <section className="container-page py-14">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { t: "Produto oficial", d: "Itens licenciados da atlética de Veterinária." },
            { t: "Feito para o curso", d: "Identidade construída com quem vive a rotina da veterinária." },
            { t: "Compra segura", d: "Checkout com validação no servidor e pagamento por provedor." },
            { t: "Comunidade", d: "Cada compra fortalece a atlética e a representação do curso." },
          ].map((v) => (
            <div key={v.t} className="card p-5">
              <span className="block h-px w-8 bg-brand-gold" aria-hidden />
              <h3 className="mt-3 font-display text-lg font-semibold text-brand-ink">{v.t}</h3>
              <p className="mt-1 text-sm text-black/60">{v.d}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
