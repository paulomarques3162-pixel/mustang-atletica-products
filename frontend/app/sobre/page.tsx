import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sobre a Mustang",
  description:
    "Conheça a Mustang Atlética: a atlética de Medicina Veterinária da Anhanguera. Identidade, propósito e produtos oficiais.",
  alternates: { canonical: "/sobre" },
};

export default function AboutPage() {
  return (
    <article className="container-page max-w-4xl py-12">
      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-moss">A Mustang</span>
      <h1 className="mt-1 font-display text-4xl font-bold text-brand-ink">
        Força, tradição e pertencimento
      </h1>
      <p className="mt-4 text-lg text-black/70">
        A Mustang Atlética representa a Medicina Veterinária da Anhanguera. Nossa identidade une a
        energia da atlética à seriedade da formação veterinária — o cavalo, a águia e a fauna
        brasileira traduzem a força de quem cuida de vidas.
      </p>

      <div className="mt-8 overflow-hidden rounded-3xl border border-brand-gold/30">
        <Image
          src="/brand-reference.png"
          alt="Identidade visual da Mustang Atlética"
          width={1024}
          height={1024}
          className="h-auto w-full object-contain"
        />
      </div>

      <div className="prose prose-neutral mt-10 max-w-none text-black/75">
        <h2 className="font-display text-2xl font-bold text-brand-ink">Nossa identidade</h2>
        <p>
          O verde profundo e o dourado carregam a tradição e a exclusividade da atlética. Cada peça da
          loja oficial é pensada para representar o curso dentro e fora da universidade, com qualidade de
          produto oficial e orgulho de pertencimento.
        </p>

        <h2 className="mt-8 font-display text-2xl font-bold text-brand-ink">Compromisso</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>Produtos oficiais da Mustang Atlética.</li>
          <li>Valorização da comunidade acadêmica de Medicina Veterinária.</li>
          <li>Transparência em preços, estoque e disponibilidade.</li>
        </ul>

        <h2 className="mt-8 font-display text-2xl font-bold text-brand-ink">Apoie a atlética</h2>
        <p>
          Cada compra fortalece a representação do curso em competições, eventos e ações da atlética.
        </p>
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/produtos" className="btn-primary">Ver produtos oficiais</Link>
        <Link href="/contato" className="btn-secondary">Falar com a atlética</Link>
      </div>
    </article>
  );
}
