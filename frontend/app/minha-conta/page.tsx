"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import { formatBRL, formatDate, ORDER_STATUS_LABEL } from "@/lib/format";
import type { OrderSummary } from "@/lib/types";

interface Address {
  id: string;
  label: string | null;
  recipient: string;
  line1: string;
  number: string | null;
  district: string | null;
  city: string;
  state: string;
  postalCode: string;
  isDefault: boolean;
}

interface WishlistItem {
  id: string;
  product: { id: string; name: string; slug: string; price: string; image: string | null };
}

const TABS = ["dados", "enderecos", "favoritos", "pedidos", "senha"] as const;
type Tab = (typeof TABS)[number];

export default function AccountPage() {
  const { user, loading, logout, refresh } = useAuth();
  const [tab, setTab] = useState<Tab>("dados");

  if (loading) {
    return (
      <div className="container-page py-14">
        <div className="skeleton h-64 w-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container-page py-20 text-center">
        <h1 className="font-display text-2xl font-bold">Você precisa entrar</h1>
        <p className="mt-2 text-black/60">Faça login para acessar sua conta.</p>
        <Link href="/login?redirect=/minha-conta" className="btn-primary mt-4">
          Entrar
        </Link>
      </div>
    );
  }

  return (
    <div className="container-page py-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-brand-ink">Minha conta</h1>
          <p className="text-sm text-black/60">
            {user.name} • {user.email}
          </p>
        </div>
        <button
          type="button"
          className="btn-ghost border border-black/10"
          onClick={() => void logout()}
        >
          Sair
        </button>
      </header>

      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        <nav aria-label="Seções da conta">
          <ul className="flex gap-2 overflow-x-auto lg:flex-col">
            {TABS.map((t) => (
              <li key={t}>
                <button
                  type="button"
                  onClick={() => setTab(t)}
                  aria-current={tab === t ? "page" : undefined}
                  className={`w-full whitespace-nowrap rounded-xl px-4 py-2 text-left text-sm font-medium ${
                    tab === t ? "bg-brand-forest text-brand-cream" : "text-brand-ink hover:bg-black/5"
                  }`}
                >
                  {
                    {
                      dados: "Dados pessoais",
                      enderecos: "Endereços",
                      favoritos: "Favoritos",
                      pedidos: "Pedidos",
                      senha: "Alterar senha",
                    }[t]
                  }
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          {tab === "dados" && <ProfileTab onSaved={refresh} />}
          {tab === "enderecos" && <AddressesTab />}
          {tab === "favoritos" && <WishlistTab />}
          {tab === "pedidos" && <OrdersTab />}
          {tab === "senha" && <PasswordTab />}
        </div>
      </div>
    </div>
  );
}

function ProfileTab({ onSaved }: { onSaved: () => Promise<void> }) {
  const { user } = useAuth();
  const [form, setForm] = useState({ name: user?.name ?? "", phone: "", document: "" });
  const [status, setStatus] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.patch("/api/account/profile", form);
      await onSaved();
      setStatus("Dados atualizados com sucesso.");
    } catch (err) {
      setStatus(err instanceof ApiError ? err.message : "Erro ao salvar.");
    }
  }

  return (
    <form onSubmit={save} className="card space-y-4 p-6">
      <h2 className="font-display text-xl font-semibold">Dados pessoais</h2>
      {status && <p className="rounded-xl bg-brand-forest/5 px-4 py-3 text-sm">{status}</p>}
      <div>
        <label htmlFor="nome" className="label">Nome</label>
        <input id="nome" className="input" value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="telefone" className="label">Telefone</label>
          <input id="telefone" className="input" value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div>
          <label htmlFor="doc" className="label">CPF</label>
          <input id="doc" className="input" value={form.document}
            onChange={(e) => setForm({ ...form, document: e.target.value })} />
        </div>
      </div>
      <button type="submit" className="btn-primary">Salvar alterações</button>
    </form>
  );
}

function AddressesTab() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [form, setForm] = useState({
    recipient: "", line1: "", number: "", district: "", city: "", state: "", postalCode: "",
  });
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ addresses: Address[] }>("/api/account/addresses");
      setAddresses(res.addresses);
    } catch {
      setAddresses([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.post("/api/account/addresses", form);
      setForm({ recipient: "", line1: "", number: "", district: "", city: "", state: "", postalCode: "" });
      setMessage("Endereço adicionado.");
      await load();
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "Erro ao adicionar endereço.");
    }
  }

  async function remove(id: string) {
    await api.delete(`/api/account/addresses/${id}`);
    await load();
  }

  return (
    <div className="space-y-6">
      <form onSubmit={add} className="card space-y-4 p-6">
        <h2 className="font-display text-xl font-semibold">Novo endereço</h2>
        {message && <p className="rounded-xl bg-brand-forest/5 px-4 py-3 text-sm">{message}</p>}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="dest" className="label">Destinatário</label>
            <input id="dest" required className="input" value={form.recipient}
              onChange={(e) => setForm({ ...form, recipient: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="logradouro" className="label">Endereço</label>
            <input id="logradouro" required className="input" value={form.line1}
              onChange={(e) => setForm({ ...form, line1: e.target.value })} />
          </div>
          <div>
            <label htmlFor="numero" className="label">Número</label>
            <input id="numero" className="input" value={form.number}
              onChange={(e) => setForm({ ...form, number: e.target.value })} />
          </div>
          <div>
            <label htmlFor="bairro" className="label">Bairro</label>
            <input id="bairro" className="input" value={form.district}
              onChange={(e) => setForm({ ...form, district: e.target.value })} />
          </div>
          <div>
            <label htmlFor="cidade" className="label">Cidade</label>
            <input id="cidade" required className="input" value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </div>
          <div>
            <label htmlFor="uf" className="label">UF</label>
            <input id="uf" required maxLength={2} className="input uppercase" value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase() })} />
          </div>
          <div>
            <label htmlFor="cep" className="label">CEP</label>
            <input id="cep" required className="input" value={form.postalCode}
              onChange={(e) => setForm({ ...form, postalCode: e.target.value })} />
          </div>
        </div>
        <button type="submit" className="btn-primary">Adicionar endereço</button>
      </form>

      {addresses.length > 0 && (
        <ul className="space-y-3">
          {addresses.map((a) => (
            <li key={a.id} className="card flex items-start justify-between gap-4 p-4">
              <span className="text-sm">
                <strong className="block">{a.recipient}</strong>
                {a.line1}, {a.number} — {a.district}
                <br />
                {a.city}/{a.state} • CEP {a.postalCode}
              </span>
              <button type="button" className="text-xs text-black/50 underline hover:text-red-600"
                onClick={() => void remove(a.id)}>
                Remover
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function WishlistTab() {
  const [items, setItems] = useState<WishlistItem[]>([]);

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ items: WishlistItem[] }>("/api/account/wishlist");
      setItems(res.items);
    } catch {
      setItems([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (items.length === 0) {
    return <p className="card p-6 text-sm text-black/60">Você ainda não tem favoritos.</p>;
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((w) => (
        <li key={w.id} className="card overflow-hidden">
          <Link href={`/produtos/${w.product.slug}`} className="relative block aspect-square bg-brand-forest/5">
            {w.product.image && (
              <Image src={w.product.image} alt={w.product.name} fill sizes="33vw" className="object-cover" />
            )}
          </Link>
          <div className="p-3">
            <Link href={`/produtos/${w.product.slug}`} className="text-sm font-medium hover:text-brand-gold">
              {w.product.name}
            </Link>
            <p className="mt-1 font-semibold text-brand-forest">{formatBRL(w.product.price)}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function OrdersTab() {
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<{ orders: OrderSummary[] }>("/api/orders");
        setOrders(res.orders);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="skeleton h-48 w-full" />;
  if (orders.length === 0) {
    return (
      <div className="card p-6 text-sm text-black/60">
        Você ainda não fez pedidos.{" "}
        <Link href="/produtos" className="font-semibold text-brand-forest underline">
          Ver produtos
        </Link>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {orders.map((o) => (
        <li key={o.id} className="card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <strong className="block text-sm">{o.number}</strong>
              <span className="text-xs text-black/50">{formatDate(o.createdAt)}</span>
            </div>
            <span className="rounded-full bg-brand-forest/5 px-3 py-1 text-xs font-semibold">
              {ORDER_STATUS_LABEL[o.status] ?? o.status}
            </span>
            <span className="font-semibold text-brand-forest">{formatBRL(o.total)}</span>
            <Link href={`/pedido/${o.id}`} className="text-sm font-semibold text-brand-forest underline">
              Detalhes
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}

function PasswordTab() {
  const { user } = useAuth();

  async function request() {
    if (!user) return;
    await api.post("/api/auth/forgot-password", { email: user.email });
  }

  return (
    <div className="card space-y-4 p-6">
      <h2 className="font-display text-xl font-semibold">Alterar senha</h2>
      <p className="text-sm text-black/60">
        Por segurança, enviaremos um link de redefinição para o e-mail da sua conta (
        <strong>{user?.email}</strong>). O envio automático depende da integração de e-mail configurada no
        backend.
      </p>
      <button type="button" className="btn-primary" onClick={() => void request()}>
        Enviar link de redefinição
      </button>
      <Link href="/esqueci-senha" className="block text-sm text-brand-forest underline">
        Ir para a tela de recuperação
      </Link>
    </div>
  );
}
