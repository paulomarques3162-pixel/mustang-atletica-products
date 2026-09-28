"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { track } from "@/lib/analytics";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="container-page py-20"><div className="skeleton mx-auto h-72 max-w-md" /></div>}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      track("login");
      router.push(params.get("redirect") ?? "/minha-conta");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível entrar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container-page flex min-h-[70vh] max-w-md flex-col justify-center py-14">
      <h1 className="font-display text-3xl font-bold text-brand-ink">Entrar</h1>
      <p className="mt-2 text-sm text-black/60">
        Acesse sua conta para acompanhar pedidos e finalizar compras mais rápido.
      </p>

      <form onSubmit={handleSubmit} className="card mt-6 space-y-4 p-6" noValidate>
        {error && (
          <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}
        <div>
          <label htmlFor="email" className="label">E-mail</label>
          <input id="email" type="email" autoComplete="email" required className="input"
            value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label htmlFor="senha" className="label">Senha</label>
          <input id="senha" type="password" autoComplete="current-password" required className="input"
            value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? "Entrando..." : "Entrar"}
        </button>
        <div className="flex justify-between text-sm">
          <Link href="/esqueci-senha" className="text-brand-forest hover:text-brand-gold">
            Esqueci minha senha
          </Link>
          <Link href="/cadastro" className="font-semibold text-brand-forest hover:text-brand-gold">
            Criar conta
          </Link>
        </div>
      </form>
    </div>
  );
}
