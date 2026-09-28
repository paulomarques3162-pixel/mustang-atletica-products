"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { track } from "@/lib/analytics";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "" });
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await register({
        name: form.name,
        email: form.email,
        password: form.password,
        phone: form.phone || undefined,
      });
      track("signup");
      router.push("/minha-conta");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível criar a conta.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container-page flex min-h-[70vh] max-w-md flex-col justify-center py-14">
      <h1 className="font-display text-3xl font-bold text-brand-ink">Criar conta</h1>
      <p className="mt-2 text-sm text-black/60">
        Cadastre-se para acompanhar pedidos, salvar endereços e favoritos.
      </p>

      <form onSubmit={handleSubmit} className="card mt-6 space-y-4 p-6" noValidate>
        {error && (
          <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}
        <div>
          <label htmlFor="nome" className="label">Nome completo</label>
          <input id="nome" required className="input" autoComplete="name"
            value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <label htmlFor="email" className="label">E-mail</label>
          <input id="email" type="email" required className="input" autoComplete="email"
            value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div>
          <label htmlFor="telefone" className="label">Telefone (opcional)</label>
          <input id="telefone" className="input" autoComplete="tel"
            value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div>
          <label htmlFor="senha" className="label">Senha</label>
          <input id="senha" type="password" required minLength={8} className="input"
            autoComplete="new-password"
            value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <p className="mt-1 text-xs text-black/50">Mínimo de 8 caracteres, com letras e números.</p>
        </div>

        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" required checked={terms} onChange={(e) => setTerms(e.target.checked)}
            className="mt-1" />
          <span>
            Li e aceito os{" "}
            <Link href="/termos" className="text-brand-forest underline">termos de uso</Link> e a{" "}
            <Link href="/politica-de-privacidade" className="text-brand-forest underline">
              política de privacidade
            </Link>.
          </span>
        </label>

        <button type="submit" className="btn-primary w-full" disabled={loading || !terms}>
          {loading ? "Criando..." : "Criar conta"}
        </button>

        <p className="text-center text-sm">
          Já tem conta?{" "}
          <Link href="/login" className="font-semibold text-brand-forest hover:text-brand-gold">
            Entrar
          </Link>
        </p>
      </form>
    </div>
  );
}
