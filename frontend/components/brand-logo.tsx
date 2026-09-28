import Image from "next/image";

/**
 * Marca textual da Mustang Atlética.
 * A imagem oficial é usada como selo; o texto garante legibilidade e SEO.
 */
export function BrandLogo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-3">
      <span className="relative block h-10 w-10 overflow-hidden rounded-full border border-brand-gold/60 bg-brand-forest">
        <Image
          src="/brand-reference.png"
          alt="Selo Mustang Atlética — Medicina Veterinária Anhanguera"
          fill
          sizes="40px"
          className="object-cover object-center"
          priority
        />
      </span>
      {!compact && (
        <span className="leading-tight">
          <span className="block font-display text-lg font-bold tracking-wide text-brand-cream">
            MUSTANG
          </span>
          <span className="block text-[10px] font-semibold uppercase tracking-[0.28em] text-brand-gold">
            Atlética
          </span>
        </span>
      )}
    </span>
  );
}
