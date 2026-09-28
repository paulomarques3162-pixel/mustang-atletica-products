"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import type { Product } from "@/lib/types";
import { formatBRL, installmentLabel, stockLabel } from "@/lib/format";
import { useCart } from "@/lib/cart-context";
import { track } from "@/lib/analytics";
import { ApiError } from "@/lib/api";

export function ProductCard({ product }: { product: Product }) {
  const { addItem, reload } = useCart();
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const image = product.images[0]?.url ?? null;

  async function handleAdd(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!product.available) return;

    const variant = product.variants.find((v) => v.available);
    if (!variant) {
      setStatus("error");
      setMessage("Nenhuma variação disponível.");
      return;
    }
    // produtos com múltiplas opções devem ser configurados na página do produto
    const needsChoice = product.variants.length > 1;
    if (needsChoice) {
      window.location.href = `/produtos/${product.slug}`;
      return;
    }

    setStatus("loading");
    setMessage(null);
    try {
      await addItem(variant.id, 1);
      track("add_to_cart", { product: product.slug, price: product.price });
      setStatus("done");
      await reload();
      setTimeout(() => setStatus("idle"), 1800);
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof ApiError ? err.message : "Não foi possível adicionar.");
    }
  }

  return (
    <article className="card group flex flex-col overflow-hidden">
      <Link href={`/produtos/${product.slug}`} className="relative block aspect-square overflow-hidden bg-brand-forest/5">
        {image ? (
          <Image
            src={image}
            alt={product.images[0]?.alt ?? product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-black/40">
            Sem imagem
          </div>
        )}

        <div className="absolute left-3 top-3 flex flex-col gap-1">
          {product.badge && (
            <span className="rounded-full bg-brand-gold px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-ink">
              {product.badge}
            </span>
          )}
          {product.onSale && (
            <span className="rounded-full bg-brand-forest px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-gold">
              Oferta
            </span>
          )}
        </div>

        {product.stockLevel === "out" && (
          <span className="absolute right-3 top-3 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-semibold text-white">
            Esgotado
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-4">
        {product.category && (
          <span className="text-[11px] font-semibold uppercase tracking-wider text-brand-moss">
            {product.category.name}
          </span>
        )}
        <h3 className="mt-1 line-clamp-2 font-display text-base font-semibold leading-snug text-brand-ink">
          <Link href={`/produtos/${product.slug}`}>{product.name}</Link>
        </h3>

        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-lg font-bold text-brand-forest">{formatBRL(product.price)}</span>
          {product.compareAtPrice && (
            <span className="text-sm text-black/40 line-through">{formatBRL(product.compareAtPrice)}</span>
          )}
        </div>
        {!product.onSale && (
          <span className="mt-0.5 text-xs text-black/50">{installmentLabel(product.price)}</span>
        )}

        <span
          className={`mt-2 inline-flex items-center gap-1 text-xs font-medium ${
            product.stockLevel === "out"
              ? "text-red-600"
              : product.stockLevel === "low"
                ? "text-amber-600"
                : "text-emerald-700"
          }`}
        >
          {stockLabel(product.stockLevel)}
        </span>

        <div className="mt-4 flex flex-col gap-2">
          <Link href={`/produtos/${product.slug}`} className="btn-secondary w-full">
            Ver detalhes
          </Link>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!product.available || status === "loading"}
            className="btn-primary w-full"
            aria-label={`Adicionar ${product.name} ao carrinho`}
          >
            {status === "loading" ? "Adicionando..." : status === "done" ? "Adicionado ✓" : "Adicionar"}
          </button>
        </div>

        {message && (
          <p role="alert" className="mt-2 text-xs text-red-600">
            {message}
          </p>
        )}
      </div>
    </article>
  );
}
