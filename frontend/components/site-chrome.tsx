"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "./navbar";
import { Footer } from "./footer";

/**
 * Decide a "moldura" da página. O painel administrativo tem layout próprio
 * (sem o cabeçalho/rodapé da loja pública), mas segue usando o layout raiz.
 */
export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");

  if (isAdmin) {
    return <div className="min-h-dvh bg-brand-cream">{children}</div>;
  }

  return (
    <>
      <Navbar />
      <main id="conteudo" className="flex-1">
        {children}
      </main>
      <Footer />
    </>
  );
}
