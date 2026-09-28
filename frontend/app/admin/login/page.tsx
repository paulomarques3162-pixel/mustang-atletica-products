"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";

/**
 * Login administrativo. Acesso protegido — o backend valida o papel (RBAC)
 * em toda rota /api/admin. Aqui é apenas a porta de entrada discreta.
 */
export default function AdminLoginPage() {
  const router = useRouter();
  const { login, user } = useAuth();
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
      router.push("/admin");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Falha ao entrar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="card p-8">
        <h1 className="font-display text-2xl font-bold text-brand-ink">Área restrita</h1>
        <p className="mt-1 text-sm text-black/60">
          Acesso exclusivo da equipe da Mustang Atlética.
        </p>

        {user && (
          <p className="mt-4 rounded-xl bg-brand-forest/5 px-4 py-3 text-sm">
            Sessão ativa: {user.email} ({user.role})
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {error && (
            <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
          )}
          <div>
            <label htmlFor="email" className="label">E-mail</label>
            <input id="email" type="email" required autoComplete="email" className="input"
              value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label htmlFor="senha" className="label">Senha</label>
            <input id="senha" type="password" required autoComplete="current-password" className="input"
              value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? "Entrando..." : "Entrar no painel"}
          </button>
        </form>

        <p className="mt-4 text-xs text-black/50">
          As credenciais administrativas são criadas no seed de desenvolvimento ou pelo próprio
          administrador no backend. Não há usuário ou senha fixos no código.
        </p>
      </div>
    </div>
  );
}
