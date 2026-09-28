"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { API_URL, ApiError, api } from "@/lib/api";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { formatBRL, PAYMENT_METHOD_LABEL } from "@/lib/format";
import type { Cart, PaymentView } from "@/lib/types";
import { track } from "@/lib/analytics";

interface ShippingQuote {
  method: "pickup" | "delivery";
  cost: string;
  label: string;
  estimated: boolean;
}

interface CheckoutResult {
  order: { id: string; number: string; total: string };
  payment: PaymentView | null;
  paymentPending: boolean;
  paymentError: string | null;
}

const STEPS = [
  { id: 1, label: "Identificação" },
  { id: 2, label: "Entrega" },
  { id: 3, label: "Pagamento" },
  { id: 4, label: "Revisão" },
] as const;

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, loading: cartLoading, reload } = useCart();
  const { user } = useAuth();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    document: "",
    couponCode: "",
    notes: "",
    method: "pix" as string,
  });
  const [shippingMethod, setShippingMethod] = useState<"pickup" | "delivery">("pickup");
  const [quote, setQuote] = useState<ShippingQuote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [enabledMethods, setEnabledMethods] = useState<string[]>([]);
  const [providerSandbox, setProviderSandbox] = useState(false);
  const [providerName, setProviderName] = useState<string>("");
  const [result, setResult] = useState<CheckoutResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setForm((f) => ({ ...f, name: user.name ?? "", email: user.email }));
    }
  }, [user]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/health/payment`);
        const data = await res.json();
        setEnabledMethods(data.enabledMethods ?? []);
        setProviderSandbox(data.provider === "mock");
        setProviderName(data.provider ?? "");
        if (data.enabledMethods?.length) setForm((f) => ({ ...f, method: data.enabledMethods[0] }));
      } catch {
        setEnabledMethods([]);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      setQuoteError(null);
      try {
        const res = await api.get<{ quote: ShippingQuote }>(
          `/api/checkout/shipping?method=${shippingMethod}`,
        );
        setQuote(res.quote);
      } catch (err) {
        setQuote(null);
        setQuoteError(
          err instanceof ApiError ? err.message : "Não foi possível calcular o frete.",
        );
      }
    })();
  }, [shippingMethod]);

  const subtotal = useMemo(() => Number(cart?.subtotal ?? 0), [cart]);
  const shippingCost = Number(quote?.cost ?? 0);
  const total = subtotal + shippingCost;

  async function submit() {
    if (!cart || cart.items.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.post<CheckoutResult>(
        "/api/checkout",
        {
          items: cart.items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
          shippingMethod,
          couponCode: form.couponCode || undefined,
          notes: form.notes || undefined,
          ...(user
            ? {}
            : {
                customer: {
                  name: form.name,
                  email: form.email,
                  phone: form.phone || undefined,
                  document: form.document || undefined,
                },
              }),
          payment: { method: form.method },
        },
        {
          idempotencyKey:
            typeof crypto !== "undefined" && "randomUUID" in crypto
              ? crypto.randomUUID()
              : `chk-${Date.now()}`,
        },
      );
      setResult(res);
      track("purchase", { value: Number(res.order.total), order: res.order.number });
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível concluir o pedido.");
    } finally {
      setSubmitting(false);
    }
  }

  if (cartLoading) {
    return (
      <div className="container-page py-10">
        <div className="skeleton h-64 w-full" />
      </div>
    );
  }

  if (result) {
    return <Confirmation result={result} providerName={providerName} />;
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="container-page py-16 text-center">
        <h1 className="font-display text-2xl font-bold">Seu carrinho está vazio</h1>
        <Link href="/produtos" className="btn-primary mt-4">
          Ver produtos
        </Link>
      </div>
    );
  }

  return (
    <div className="container-page py-10">
      <h1 className="mb-2 font-display text-3xl font-bold text-brand-ink">Checkout</h1>
      <p className="mb-8 text-sm text-black/60">
        Todos os valores são recalculados no servidor antes de gerar o pedido.
      </p>

      {/* Stepper */}
      <ol className="mb-8 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Etapas do checkout">
        {STEPS.map((s) => (
          <li
            key={s.id}
            aria-current={step === s.id ? "step" : undefined}
            className={`rounded-xl border px-3 py-2 text-sm font-medium ${
              step === s.id
                ? "border-brand-gold bg-brand-gold/15 text-brand-forest"
                : step > s.id
                  ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                  : "border-black/10 text-black/50"
            }`}
          >
            {s.id}. {s.label}
          </li>
        ))}
      </ol>

      {error && (
        <p role="alert" className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="card p-6">
          {step === 1 && (
            <section aria-labelledby="step1">
              <h2 id="step1" className="font-display text-xl font-semibold">
                Identificação
              </h2>
              {user ? (
                <p className="mt-3 text-sm text-black/70">
                  Você está logado como <strong>{user.email}</strong>. Os dados da conta serão usados no
                  pedido.
                </p>
              ) : (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label htmlFor="nome" className="label">Nome completo *</label>
                    <input id="nome" className="input" value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                  </div>
                  <div>
                    <label htmlFor="email" className="label">E-mail *</label>
                    <input id="email" type="email" className="input" value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                  </div>
                  <div>
                    <label htmlFor="telefone" className="label">Telefone</label>
                    <input id="telefone" className="input" value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="doc" className="label">CPF</label>
                    <input id="doc" className="input" value={form.document}
                      onChange={(e) => setForm({ ...form, document: e.target.value })} />
                  </div>
                </div>
              )}
            </section>
          )}

          {step === 2 && (
            <section aria-labelledby="step2">
              <h2 id="step2" className="font-display text-xl font-semibold">Entrega</h2>
              <div className="mt-4 space-y-3">
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-black/10 p-4">
                  <input type="radio" name="ship" checked={shippingMethod === "pickup"}
                    onChange={() => setShippingMethod("pickup")} className="mt-1" />
                  <span>
                    <span className="block font-medium">Retirada na Mustang Atlética</span>
                    <span className="text-sm text-black/60">Sem custo de frete.</span>
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-black/10 p-4">
                  <input type="radio" name="ship" checked={shippingMethod === "delivery"}
                    onChange={() => setShippingMethod("delivery")} className="mt-1" />
                  <span>
                    <span className="block font-medium">Entrega (transportadora)</span>
                    <span className="text-sm text-black/60">
                      {quote ? formatBRL(quote.cost) : "calculando..."}
                    </span>
                  </span>
                </label>
              </div>
              {quoteError && (
                <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">{quoteError}</p>
              )}
            </section>
          )}

          {step === 3 && (
            <section aria-labelledby="step3">
              <h2 id="step3" className="font-display text-xl font-semibold">Pagamento</h2>
              {providerSandbox && (
                <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  Ambiente de <strong>teste</strong>: o provedor ativo não processa pagamentos reais.
                  Configure um provedor oficial para vendas em produção.
                </p>
              )}
              {enabledMethods.length === 0 ? (
                <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                  Nenhum método de pagamento está habilitado. Configure o provedor de pagamento no backend.
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {enabledMethods.map((m) => (
                    <label key={m} className="flex cursor-pointer items-center gap-3 rounded-xl border border-black/10 p-4">
                      <input type="radio" name="pay" checked={form.method === m}
                        onChange={() => setForm({ ...form, method: m })} />
                      <span className="font-medium">{PAYMENT_METHOD_LABEL[m] ?? m}</span>
                    </label>
                  ))}
                </div>
              )}
              <div className="mt-5">
                <label htmlFor="cupom" className="label">Cupom de desconto</label>
                <input id="cupom" className="input" value={form.couponCode}
                  onChange={(e) => setForm({ ...form, couponCode: e.target.value.toUpperCase() })}
                  placeholder="Opcional" />
                <p className="mt-1 text-xs text-black/50">
                  O cupom é validado no servidor no momento de finalizar o pedido.
                </p>
              </div>
            </section>
          )}

          {step === 4 && (
            <section aria-labelledby="step4">
              <h2 id="step4" className="font-display text-xl font-semibold">Revisão</h2>
              <ul className="mt-4 divide-y divide-black/5">
                {cart.items.map((i) => (
                  <li key={i.id} className="flex items-center gap-3 py-3">
                    <div className="relative h-14 w-14 overflow-hidden rounded-lg bg-brand-forest/5">
                      {i.image && <Image src={i.image} alt="" fill sizes="56px" className="object-cover" />}
                    </div>
                    <div className="flex-1 text-sm">
                      <span className="block font-medium">{i.name}</span>
                      <span className="text-black/50">
                        {[i.size, i.color].filter(Boolean).join(" / ")} × {i.quantity}
                      </span>
                    </div>
                    <span className="text-sm font-semibold">{formatBRL(i.total)}</span>
                  </li>
                ))}
              </ul>
              <textarea
                aria-label="Observações do pedido"
                className="input mt-4"
                rows={3}
                placeholder="Observações (opcional)"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </section>
          )}

          <div className="mt-8 flex justify-between gap-3">
            <button
              type="button"
              className="btn-ghost"
              disabled={step === 1}
              onClick={() => setStep((s) => Math.max(1, s - 1))}
            >
              Voltar
            </button>
            {step < 4 ? (
              <button
                type="button"
                className="btn-primary"
                onClick={() => setStep((s) => Math.min(4, s + 1))}
                disabled={step === 1 && !user && (!form.name || !form.email)}
              >
                Continuar
              </button>
            ) : (
              <button
                type="button"
                className="btn-primary"
                disabled={submitting || enabledMethods.length === 0}
                onClick={() => void submit()}
              >
                {submitting ? "Processando..." : "Finalizar pedido"}
              </button>
            )}
          </div>
        </div>

        <aside className="card h-fit p-5">
          <h2 className="font-display text-lg font-semibold">Resumo</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-black/60">Subtotal</dt>
              <dd>{formatBRL(cart.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-black/60">Frete</dt>
              <dd>{quote ? formatBRL(quote.cost) : "—"}</dd>
            </div>
            <div className="flex justify-between border-t border-black/10 pt-2 text-base">
              <dt className="font-semibold">Total estimado</dt>
              <dd className="font-bold text-brand-forest">{formatBRL(total)}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-black/50">
            Descontos de cupom são aplicados no servidor e podem alterar o total final.
          </p>
        </aside>
      </div>
    </div>
  );
}

function Confirmation({ result, providerName }: { result: CheckoutResult; providerName: string }) {
  const [payment, setPayment] = useState<PaymentView | null>(result.payment);
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);

  async function refresh() {
    if (!payment) return;
    setRefreshing(true);
    try {
      const res = await api.post<{ payment: PaymentView }>(`/api/payments/${payment.id}/refresh`, {});
      setPayment(res.payment);
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="container-page max-w-2xl py-14" id="conteudo">
      <div className="card p-8 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-700">
          ✓
        </span>
        <h1 className="mt-4 font-display text-2xl font-bold text-brand-ink">Pedido registrado</h1>
        <p className="mt-2 text-sm text-black/60">
          Número do pedido: <strong>{result.order.number}</strong>
        </p>

        {payment ? (
          <div className="mt-6 text-left">
            <h2 className="font-display text-lg font-semibold">
              Pagamento via {PAYMENT_METHOD_LABEL[payment.method] ?? payment.method}
            </h2>
            <p className="mt-3 text-sm">
              Valor: <strong>{formatBRL(payment.amount)}</strong> • Status:{" "}
              <strong>{payment.status}</strong>
            </p>

            {payment.sandbox && (
              <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Este é um pagamento de <strong>teste</strong> ({providerName}). Nenhuma cobrança real foi
                feita.
              </p>
            )}

            {payment.qrCodeImage && (
              <div className="mt-4 text-center">
                {/* QR real é fornecido pelo provedor; aqui exibimos o que a API retornar */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={payment.qrCodeImage} alt="QR Code PIX" className="mx-auto h-52 w-52 rounded-xl border" />
              </div>
            )}

            {(payment.qrCodeText ?? payment.boletoLine) && (
              <div className="mt-4">
                <label htmlFor="codigo" className="label">
                  {payment.qrCodeText ? "PIX copia e cola" : "Linha digitável"}
                </label>
                <textarea id="codigo" readOnly rows={3} className="input font-mono text-xs"
                  value={(payment.qrCodeText ?? payment.boletoLine) as string} />
                <button
                  type="button"
                  className="btn-secondary mt-2"
                  onClick={async () => {
                    await navigator.clipboard.writeText((payment.qrCodeText ?? payment.boletoLine) as string);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                >
                  {copied ? "Copiado ✓" : "Copiar código"}
                </button>
              </div>
            )}

            <button type="button" className="btn-primary mt-5 w-full" onClick={() => void refresh()}
              disabled={refreshing}>
              {refreshing ? "Consultando..." : "Atualizar status do pagamento"}
            </button>
            <p className="mt-2 text-center text-xs text-black/50">
              A confirmação do pagamento depende do provedor (webhook). Abrir esta tela não confirma o
              pagamento.
            </p>
          </div>
        ) : (
          <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-left text-sm text-amber-900">
            O pedido foi criado, mas a cobrança não pôde ser gerada: {result.paymentError}
          </p>
        )}

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link href={`/pedido/${result.order.id}`} className="btn-secondary">
            Ver pedido
          </Link>
          <Link href="/produtos" className="btn-ghost">
            Continuar comprando
          </Link>
        </div>
      </div>
    </div>
  );
}
