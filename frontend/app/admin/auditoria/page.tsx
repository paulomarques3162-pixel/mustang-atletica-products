"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";

interface AuditEntry {
  id: string;
  action: string;
  entity: string | null;
  entityId: string | null;
  result: string;
  ip: string | null;
  createdAt: string;
  user: { email: string; name: string | null } | null;
}

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [action, setAction] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<{ logs: AuditEntry[] }>(
          `/api/admin/audit${action ? `?action=${action}` : ""}`,
        );
        setLogs(res.logs);
      } catch {
        setLogs([]);
      }
    })();
  }, [action]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold text-brand-ink">Auditoria</h1>
        <div>
          <label htmlFor="acao" className="sr-only">Filtrar por ação</label>
          <input id="acao" className="input" placeholder="Filtrar por ação (ex.: PRODUCT_UPDATED)"
            value={action} onChange={(e) => setAction(e.target.value.toUpperCase())} />
        </div>
      </div>

      <p className="mb-4 text-xs text-black/50">
        Registro de operações administrativas e de negócio. Nenhum dado sensível (senha, token, CVV) é
        gravado.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead>
            <tr className="border-b border-black/10 text-xs uppercase tracking-wider text-black/50">
              <th scope="col" className="py-3">Data</th>
              <th scope="col" className="py-3">Ação</th>
              <th scope="col" className="py-3">Entidade</th>
              <th scope="col" className="py-3">ID</th>
              <th scope="col" className="py-3">Usuário</th>
              <th scope="col" className="py-3">Resultado</th>
              <th scope="col" className="py-3">IP</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-b border-black/5">
                <td className="py-3 text-black/50">{formatDate(l.createdAt)}</td>
                <td className="py-3 font-medium">{l.action}</td>
                <td className="py-3 text-black/60">{l.entity ?? "—"}</td>
                <td className="py-3 text-xs text-black/40">{l.entityId ?? "—"}</td>
                <td className="py-3 text-black/60">{l.user?.email ?? "—"}</td>
                <td className="py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    l.result === "success" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-700"
                  }`}>
                    {l.result}
                  </span>
                </td>
                <td className="py-3 text-xs text-black/40">{l.ip ?? "—"}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr><td colSpan={7} className="py-8 text-center text-black/50">Nenhum registro.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
