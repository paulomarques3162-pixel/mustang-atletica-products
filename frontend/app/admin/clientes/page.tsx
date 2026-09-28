"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";

interface Customer {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  role: string;
  active: boolean;
  createdAt: string;
  orderCount: number;
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<{ customers: Customer[] }>("/api/admin/customers");
        setCustomers(res.customers);
      } catch {
        setCustomers([]);
      }
    })();
  }, []);

  const filtered = customers.filter(
    (c) =>
      !query ||
      c.email.toLowerCase().includes(query.toLowerCase()) ||
      (c.name ?? "").toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold text-brand-ink">Clientes</h1>
        <div>
          <label htmlFor="busca-cliente" className="sr-only">Buscar cliente</label>
          <input id="busca-cliente" type="search" className="input" placeholder="Buscar por nome ou e-mail"
            value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-black/10 text-xs uppercase tracking-wider text-black/50">
              <th scope="col" className="py-3">Nome</th>
              <th scope="col" className="py-3">E-mail</th>
              <th scope="col" className="py-3">Telefone</th>
              <th scope="col" className="py-3">Papel</th>
              <th scope="col" className="py-3">Pedidos</th>
              <th scope="col" className="py-3">Cadastro</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className="border-b border-black/5">
                <td className="py-3 font-medium">{c.name ?? "—"}</td>
                <td className="py-3 text-black/70">{c.email}</td>
                <td className="py-3 text-black/60">{c.phone ?? "—"}</td>
                <td className="py-3"><span className="rounded-full bg-brand-forest/5 px-2 py-0.5 text-xs">{c.role}</span></td>
                <td className="py-3">{c.orderCount}</td>
                <td className="py-3 text-black/50">{formatDate(c.createdAt)}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="py-8 text-center text-black/50">Nenhum cliente encontrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
