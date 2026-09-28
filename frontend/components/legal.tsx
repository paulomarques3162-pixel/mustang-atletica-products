export function LegalPage({
  title,
  updatedAt,
  intro,
  children,
}: {
  title: string;
  updatedAt: string;
  intro?: string;
  children: React.ReactNode;
}) {
  return (
    <article className="container-page max-w-3xl py-12">
      <h1 className="font-display text-4xl font-bold text-brand-ink">{title}</h1>
      <p className="mt-2 text-sm text-black/50">Última atualização: {updatedAt}</p>
      {intro && <p className="mt-4 text-black/70">{intro}</p>}

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-black/75">{children}</div>

      <p className="mt-10 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900">
        Este documento é um modelo inicial e deve ser revisado pela Mustang Atlética e por assessoria
        jurídica antes de ser considerado definitivo.
      </p>
    </article>
  );
}
