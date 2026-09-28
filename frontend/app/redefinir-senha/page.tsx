"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import Link from "next/link";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="container-page py-20"><div className="skeleton mx-auto h-72 max-w-md" /></div>}>
      <ResetForm />
    </Suspense>
  );
}

function ResetForm() {
  const params = useSearchParams();
  const router = useRouter();
  const [token, setToken] = useState(params.get("token") ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.post("/api/auth/reset-password", { token, password });
      setDone(true);
      setTimeout(() => router.push("/login"), 2000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível redefinir a senha.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container-page flex min-h-[70vh] max-w-md flex-col justify-center py-14">
      <h1 className="font-display text-3xl font-bold text-brand-ink">Redefinir senha</h1>

      <form onSubmit={handleSubmit} className="card mt-6 space-y-4 p-6">
        {error && (
          <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        )}
        {done && (
          <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Senha redefinida. Redirecionando para o login...
          </p>
        )}

        <div>
          <label htmlFor="token" className="label">Token de redefinição</label>
          <input id="token" required className="input font-mono text-xs"
            value={token} onChange={(e) => setToken(e.target.value)} />
        </div>
        <div>
          <label htmlFor="senha" className="label">Nova senha</label>
          <input id="senha" type="password" required minLength={8} className="input"
            value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>

        <button type="submit" className="btn-primary w-full" disabled={loading || done}>
          {loading ? "Salvando..." : "Redefinir senha"}
        </button>
        <Link href="/login" className="block text-center text-sm text-brand-forest hover:text-brand-gold">
          Voltar para o login
        </Link>
      </form>
    </div>
  );
}
