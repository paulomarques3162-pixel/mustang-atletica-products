"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/lib/cart-context";
import { formatBRL } from "@/lib/format";
import { ApiError } from "@/lib/api";
import { EmptyState, ErrorState } from "@/components/states";
import { track } from "@/lib/analytics";

export default function CartPage() {
  const { cart, loading, error, updateItem, removeItem, clear, reload } = useCart();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function safe(action: () => Promise<void>, id: string) {
    setBusy(id);
    setMessage(null);
    try {
      await action();
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "Não foi possível atualizar o carrinho.");
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <div className="container-page py-10">
        <h1 className="mb-6 font-display text-3xl font-bold">Carrinho</h1>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-28 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-page py-10">
        <ErrorState message={error} onRetry={() => void reload()} />
      </div>
    );
  }

  const items = cart?.items ?? [];

  return (
    <div className="container-page py-10">
      <h1 className="mb-6 font-display text-3xl font-bold text-brand-ink">Carrinho</h1>

      {message && (
        <p role="alert" className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {message}
        </p>
      )}

      {items.length === 0 ? (
        <EmptyState
          title="Seu carrinho está vazio"
          description="Explore o catálogo e adicione produtos oficiais da Mustang Atlética."
          action={
            <Link href="/produtos" className="btn-primary mt-2">
              Ver produtos
            </Link>
          }
        />
      ) : (
        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <ul className="space-y-3">
            {items.map((item) => (
              <li key={item.id} className="card flex gap-4 p-4">
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-brand-forest/5">
                  {item.image ? (
                    <Image src={item.image} alt={item.name} fill sizes="96px" className="object-cover" />
                  ) : (
                    <span className="flex h-full items-center justify-center text-[10px] text-black/40">
                      Sem imagem
                    </span>
                  )}
                </div>

                <div className="flex flex-1 flex-col">
                  <Link href={`/produtos/${item.slug}`} className="font-semibold text-brand-ink hover:text-brand-gold">
                    {item.name}
                  </Link>
                  <span className="mt-0.5 text-xs text-black/50">
                    {[item.size, item.color].filter(Boolean).join(" / ") || "—"} • SKU {item.sku}
                  </span>
                  {!item.active && (
                    <span className="mt-1 text-xs font-semibold text-red-600">Indisponível</span>
                  )}

                  <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-3">
                    <div className="flex items-center rounded-lg border border-black/10">
                      <button
                        type="button"
                        className="min-h-10 w-10 text-lg"
                        disabled={busy === item.id}
                        onClick={() => void safe(() => updateItem(item.id, item.quantity - 1), item.id)}
                        aria-label={`Diminuir quantidade de ${item.name}`}
                      >
                        −
                      </button>
                      <span className="w-10 text-center text-sm" aria-live="polite">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        className="min-h-10 w-10 text-lg"
                        disabled={busy === item.id || item.quantity >= item.availableStock}
                        onClick={() => void safe(() => updateItem(item.id, item.quantity + 1), item.id)}
                        aria-label={`Aumentar quantidade de ${item.name}`}
                      >
                        +
                      </button>
                    </div>

                    <div className="text-right">
                      <span className="block font-bold text-brand-forest">{formatBRL(item.total)}</span>
                      <button
                        type="button"
                        className="text-xs text-black/50 underline hover:text-red-600"
                        disabled={busy === item.id}
                        onClick={() => void safe(() => removeItem(item.id), item.id)}
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <aside className="card h-fit p-5">
            <h2 className="font-display text-xl font-semibold text-brand-ink">Resumo</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-black/60">Itens</dt>
                <dd>{cart?.itemCount}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-black/60">Subtotal</dt>
                <dd className="font-semibold">{formatBRL(cart?.subtotal ?? "0")}</dd>
              </div>
              <div className="flex justify-between border-t border-black/10 pt-2">
                <dt className="text-black/60">Frete e descontos</dt>
                <dd className="text-black/50">calculados no checkout</dd>
              </div>
            </dl>

            <Link
              href="/checkout"
              className="btn-primary mt-5 w-full"
              onClick={() => track("begin_checkout", { value: Number(cart?.subtotal ?? 0) })}
            >
              Finalizar compra
            </Link>
            <Link href="/produtos" className="btn-ghost mt-2 w-full">
              Continuar comprando
            </Link>
            <button
              type="button"
              className="mt-2 w-full text-xs text-black/50 underline hover:text-red-600"
              onClick={() => void safe(() => clear(), "clear")}
            >
              Esvaziar carrinho
            </button>
          </aside>
        </div>
      )}
    </div>
  );
}
