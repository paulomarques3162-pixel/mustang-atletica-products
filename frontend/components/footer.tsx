import Link from "next/link";
import { BrandLogo } from "./brand-logo";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-20 bg-brand-forest text-brand-cream/85">
      <div className="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <BrandLogo />
          <p className="mt-4 max-w-xs text-sm leading-relaxed">
            Loja oficial da Mustang Atlética — Medicina Veterinária, Anhanguera. Vista a sua paixão pela
            veterinária.
          </p>
        </div>

        <nav aria-label="Loja">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-brand-gold">Loja</h2>
          <ul className="space-y-2 text-sm">
            <li><Link className="hover:text-brand-gold" href="/produtos">Todos os produtos</Link></li>
            <li><Link className="hover:text-brand-gold" href="/categorias">Categorias</Link></li>
            <li><Link className="hover:text-brand-gold" href="/buscar">Buscar</Link></li>
            <li><Link className="hover:text-brand-gold" href="/minha-conta">Minha conta</Link></li>
          </ul>
        </nav>

        <nav aria-label="Institucional">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-brand-gold">Institucional</h2>
          <ul className="space-y-2 text-sm">
            <li><Link className="hover:text-brand-gold" href="/sobre">Sobre a Mustang</Link></li>
            <li><Link className="hover:text-brand-gold" href="/contato">Contato</Link></li>
            <li><Link className="hover:text-brand-gold" href="/politica-de-privacidade">Privacidade (LGPD)</Link></li>
            <li><Link className="hover:text-brand-gold" href="/termos">Termos de uso</Link></li>
          </ul>
        </nav>

        <nav aria-label="Ajuda">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-brand-gold">Ajuda</h2>
          <ul className="space-y-2 text-sm">
            <li><Link className="hover:text-brand-gold" href="/politica-de-troca">Política de troca</Link></li>
            <li><Link className="hover:text-brand-gold" href="/politica-de-entrega">Política de entrega</Link></li>
            <li>
              {/* Acesso administrativo discreto, porém encontrável */}
              <Link className="text-brand-cream/60 hover:text-brand-gold" href="/admin/login">
                Área restrita
              </Link>
            </li>
          </ul>
        </nav>
      </div>

      <div className="border-t border-white/10">
        <div className="container-page flex flex-col items-center justify-between gap-2 py-6 text-xs text-brand-cream/60 sm:flex-row">
          <p>© {year} Mustang Atlética — Medicina Veterinária Anhanguera. Todos os direitos reservados.</p>
          <p>Produtos oficiais da atlética.</p>
        </div>
      </div>
    </footer>
  );
}
