"use client";

import { useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [devToken, setDevToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await api.post<{ message: string; devResetToken?: string }>(
        "/api/auth/forgot-password",
        { email },
      );
      setMessage(res.message);
      // Em desenvolvimento a API pode devolver o token para facilitar o teste.
      if (res.devResetToken) setDevToken(res.devResetToken);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível solicitar a redefinição.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container-page flex min-h-[70vh] max-w-md flex-col justify-center py-14">
      <h1 className="font-display text-3xl font-bold text-brand-ink">Recuperar senha</h1>
      <p className="mt-2 text-sm text-black/60">
        Informe seu e-mail. Se existir uma conta, enviaremos as instruções de redefinição.
      </p>

      <form onSubmit={handleSubmit} className="card mt-6 space-y-4 p-6">
        {error && (
          <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        )}
        {message && (
          <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {message}
          </p>
        )}
        {devToken && (
          <div className="rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-900">
            <p className="font-semibold">Modo desenvolvimento</p>
            <p className="mt-1 break-all">Token: {devToken}</p>
            <Link
              href={`/redefinir-senha?token=${devToken}`}
              className="mt-2 inline-block font-semibold underline"
            >
              Abrir tela de redefinição
            </Link>
          </div>
        )}

        <div>
          <label htmlFor="email" className="label">E-mail</label>
          <input id="email" type="email" required className="input"
            value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>

        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? "Enviando..." : "Enviar instruções"}
        </button>
        <Link href="/login" className="block text-center text-sm text-brand-forest hover:text-brand-gold">
          Voltar para o login
        </Link>
      </form>
    </div>
  );
}
