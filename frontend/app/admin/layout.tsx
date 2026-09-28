"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";

const ADMIN_NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/produtos", label: "Produtos" },
  { href: "/admin/categorias", label: "Categorias" },
  { href: "/admin/estoque", label: "Estoque" },
  { href: "/admin/pedidos", label: "Pedidos" },
  { href: "/admin/pagamentos", label: "Pagamentos" },
  { href: "/admin/clientes", label: "Clientes" },
  { href: "/admin/cupons", label: "Cupons" },
  { href: "/admin/auditoria", label: "Auditoria" },
];

const ADMIN_ROLES = ["SUPPORT", "EDITOR", "MANAGER", "ADMIN"];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isLoginPage = pathname === "/admin/login";

  useEffect(() => {
    if (isLoginPage) return;
    if (!loading && (!user || !ADMIN_ROLES.includes(user.role))) {
      router.replace("/admin/login");
    }
  }, [loading, user, isLoginPage, router]);

  if (isLoginPage) {
    return <div className="container-page py-14">{children}</div>;
  }

  if (loading) {
    return (
      <div className="container-page py-14">
        <div className="skeleton h-72 w-full" />
      </div>
    );
  }

  if (!user || !ADMIN_ROLES.includes(user.role)) {
    return (
      <div className="container-page py-14 text-sm text-black/60">
        Verificando acesso administrativo...
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[1600px] flex-col lg:flex-row">
      <aside className="border-b border-black/10 bg-brand-forest px-4 py-5 text-brand-cream lg:w-64 lg:border-b-0 lg:border-r">
        <div className="mb-4 flex items-center justify-between">
          <span className="font-display text-lg font-bold">
            MUSTANG <span className="text-brand-gold">ADMIN</span>
          </span>
          <Link href="/" className="text-xs text-brand-cream/70 hover:text-brand-gold">
            ver loja
          </Link>
        </div>
        <p className="mb-4 text-xs text-brand-cream/60">
          {user.email} • <span className="text-brand-gold">{user.role}</span>
        </p>

        <nav aria-label="Administração">
          <ul className="flex gap-1 overflow-x-auto lg:flex-col">
            {ADMIN_NAV.map((item) => {
              const active =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname?.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`block whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium ${
                      active ? "bg-brand-gold text-brand-ink" : "text-brand-cream/85 hover:bg-white/5"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <button
          type="button"
          className="mt-6 text-xs text-brand-cream/70 underline hover:text-brand-gold"
          onClick={() => void logout().then(() => router.push("/admin/login"))}
        >
          Sair
        </button>
      </aside>

      <div className="flex-1 p-4 sm:p-6 lg:p-8">{children}</div>
    </div>
  );
}
