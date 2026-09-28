"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Product } from "@/lib/types";
import { formatBRL, installmentLabel, stockLabel } from "@/lib/format";
import { useCart } from "@/lib/cart-context";
import { ApiError } from "@/lib/api";
import { track } from "@/lib/analytics";
import { ShareButtons } from "./share-buttons";

export function ProductDetail({ product }: { product: Product }) {
  const router = useRouter();
  const { addItem, reload } = useCart();

  const sizes = useMemo(
    () => Array.from(new Set(product.variants.map((v) => v.size).filter(Boolean))) as string[],
    [product.variants],
  );
  const colors = useMemo(
    () => Array.from(new Set(product.variants.map((v) => v.color).filter(Boolean))) as string[],
    [product.variants],
  );

  const [size, setSize] = useState<string | null>(sizes[0] ?? null);
  const [color, setColor] = useState<string | null>(colors[0] ?? null);
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [zoom, setZoom] = useState(false);

  const selectedVariant = useMemo(() => {
    return (
      product.variants.find(
        (v) =>
          (sizes.length === 0 || v.size === size) && (colors.length === 0 || v.color === color),
      ) ??
      product.variants.find((v) => v.available) ??
      null
    );
  }, [product.variants, size, color, sizes.length, colors.length]);

  const maxQty = selectedVariant?.stock ?? 0;
  const price = selectedVariant?.price ?? product.price;
  const canBuy = Boolean(selectedVariant?.available) && maxQty > 0;

  async function addToCart(goToCheckout = false) {
    if (!selectedVariant) return;
    setStatus("loading");
    setMessage(null);
    try {
      await addItem(selectedVariant.id, quantity);
      track("add_to_cart", { product: product.slug, price, quantity });
      setStatus("done");
      await reload();
      if (goToCheckout) {
        router.push("/checkout");
        return;
      }
      setTimeout(() => setStatus("idle"), 2000);
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof ApiError ? err.message : "Não foi possível adicionar ao carrinho.");
    }
  }

  return (
    <div className="grid gap-10 lg:grid-cols-2">
      {/* --------- Galeria --------- */}
      <div>
        <div className="relative overflow-hidden rounded-2xl border border-black/5 bg-white">
          <button
            type="button"
            className="relative block aspect-square w-full cursor-zoom-in"
            onClick={() => setZoom((z) => !z)}
            aria-label={zoom ? "Reduzir imagem" : "Ampliar imagem"}
          >
            {product.images[activeImage] ? (
              <Image
                src={product.images[activeImage].url}
                alt={product.images[activeImage].alt ?? product.name}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className={`object-cover transition-transform duration-300 ${
                  zoom ? "scale-[1.6]" : "scale-100"
                }`}
                priority
              />
            ) : (
              <span className="flex aspect-square items-center justify-center text-sm text-black/40">
                Sem imagem cadastrada
              </span>
            )}
          </button>
          {product.onSale && (
            <span className="absolute left-4 top-4 rounded-full bg-brand-gold px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand-ink">
              Oferta
            </span>
          )}
        </div>

        {product.images.length > 1 && (
          <ul className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="Miniaturas">
            {product.images.map((img, i) => (
              <li key={img.id}>
                <button
                  type="button"
                  onClick={() => setActiveImage(i)}
                  aria-label={`Ver imagem ${i + 1}`}
                  aria-current={i === activeImage}
                  className={`relative h-16 w-16 overflow-hidden rounded-lg border-2 ${
                    i === activeImage ? "border-brand-gold" : "border-transparent"
                  }`}
                >
                  <Image src={img.url} alt="" fill sizes="64px" className="object-cover" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* --------- Informações --------- */}
      <div>
        {product.category && (
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-moss">
            {product.category.name}
          </span>
        )}
        <h1 className="mt-1 font-display text-3xl font-bold leading-tight text-brand-ink">
          {product.name}
        </h1>

        <div className="mt-4 flex flex-wrap items-baseline gap-3">
          <span className="text-3xl font-bold text-brand-forest">{formatBRL(price)}</span>
          {product.compareAtPrice && (
            <span className="text-lg text-black/40 line-through">{formatBRL(product.compareAtPrice)}</span>
          )}
        </div>
        <p className="mt-1 text-sm text-black/60">{installmentLabel(price)}</p>

        <p
          className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
            product.stockLevel === "out"
              ? "bg-red-100 text-red-700"
              : product.stockLevel === "low"
                ? "bg-amber-100 text-amber-800"
                : "bg-emerald-100 text-emerald-800"
          }`}
        >
          {stockLabel(product.stockLevel)}
          {canBuy && product.stockLevel === "low" ? ` — ${maxQty} restantes` : ""}
        </p>

        {product.shortDescription && (
          <p className="mt-5 text-black/70">{product.shortDescription}</p>
        )}

        {/* Variações */}
        {sizes.length > 0 && (
          <fieldset className="mt-6">
            <legend className="label">Tamanho</legend>
            <div className="flex flex-wrap gap-2">
              {sizes.map((s) => {
                const variant = product.variants.find((v) => v.size === s && (colors.length === 0 || v.color === color));
                const disabled = !variant?.available;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSize(s)}
                    disabled={disabled}
                    aria-pressed={size === s}
                    className={`min-h-11 min-w-11 rounded-lg border px-3 text-sm font-medium transition-colors ${
                      size === s
                        ? "border-brand-gold bg-brand-gold/15 text-brand-forest"
                        : "border-black/10 text-brand-ink hover:border-brand-gold"
                    } ${disabled ? "cursor-not-allowed opacity-40 line-through" : ""}`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}

        {colors.length > 0 && (
          <fieldset className="mt-5">
            <legend className="label">Cor</legend>
            <div className="flex flex-wrap gap-2">
              {colors.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-pressed={color === c}
                  className={`min-h-11 rounded-lg border px-4 text-sm font-medium transition-colors ${
                    color === c
                      ? "border-brand-gold bg-brand-gold/15 text-brand-forest"
                      : "border-black/10 text-brand-ink hover:border-brand-gold"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        {/* Quantidade */}
        <div className="mt-5 max-w-40">
          <label htmlFor="qtd" className="label">
            Quantidade
          </label>
          <div className="flex items-center rounded-xl border border-black/10">
            <button
              type="button"
              className="min-h-11 w-11 text-lg font-semibold"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              aria-label="Diminuir quantidade"
            >
              −
            </button>
            <input
              id="qtd"
              type="number"
              min={1}
              max={maxQty || 1}
              value={quantity}
              onChange={(e) =>
                setQuantity(Math.min(Math.max(1, Number(e.target.value) || 1), Math.max(1, maxQty)))
              }
              className="w-full border-x border-black/10 py-2 text-center"
            />
            <button
              type="button"
              className="min-h-11 w-11 text-lg font-semibold"
              onClick={() => setQuantity((q) => Math.min(Math.max(1, maxQty), q + 1))}
              aria-label="Aumentar quantidade"
            >
              +
            </button>
          </div>
        </div>

        {/* Ações */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            className="btn-primary flex-1"
            disabled={!canBuy || status === "loading"}
            onClick={() => addToCart(false)}
          >
            {status === "loading" ? "Processando..." : status === "done" ? "Adicionado ✓" : "Adicionar ao carrinho"}
          </button>
          <button
            type="button"
            className="btn-secondary flex-1"
            disabled={!canBuy || status === "loading"}
            onClick={() => addToCart(true)}
          >
            Comprar agora
          </button>
        </div>

        {!canBuy && (
          <p className="mt-2 text-sm text-red-600">
            Esta variação está esgotada. Selecione outra opção.
          </p>
        )}
        {message && (
          <p role="alert" className="mt-2 text-sm text-red-600">
            {message}
          </p>
        )}

        <div className="mt-6">
          <ShareButtons product={{ name: product.name, slug: product.slug, price }} />
        </div>

        {/* Políticas */}
        <dl className="mt-8 grid gap-3 border-t border-black/10 pt-6 text-sm sm:grid-cols-2">
          <div>
            <dt className="font-semibold text-brand-ink">Entrega</dt>
            <dd className="text-black/60">
              Retirada na atlética ou envio conforme política de entrega vigente.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-brand-ink">Troca</dt>
            <dd className="text-black/60">
              Consulte a política de troca para prazos e condições.
            </dd>
          </div>
        </dl>

        {product.description && (
          <section className="mt-8 border-t border-black/10 pt-6">
            <h2 className="font-display text-lg font-semibold text-brand-ink">Descrição</h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-black/70">
              {product.description}
            </p>
            <p className="mt-3 text-xs text-black/40">SKU: {selectedVariant?.sku ?? product.sku}</p>
          </section>
        )}
      </div>
    </div>
  );
}
