/** Componentes de estado reutilizáveis: loading, skeleton, vazio, erro, retry. */

export function ProductCardSkeleton() {
  return (
    <div className="card overflow-hidden">
      <div className="skeleton aspect-square rounded-none" />
      <div className="space-y-3 p-4">
        <div className="skeleton h-3 w-16" />
        <div className="skeleton h-4 w-full" />
        <div className="skeleton h-4 w-2/3" />
        <div className="skeleton h-6 w-24" />
        <div className="skeleton h-10 w-full rounded-full" />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-16 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-forest/10 text-brand-forest">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      </span>
      <h2 className="font-display text-xl font-semibold text-brand-ink">{title}</h2>
      {description && <p className="max-w-md text-sm text-black/60">{description}</p>}
      {action}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div role="alert" className="card flex flex-col items-center gap-3 px-6 py-16 text-center">
      <h2 className="font-display text-xl font-semibold text-brand-ink">Algo deu errado</h2>
      <p className="max-w-md text-sm text-black/60">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-primary mt-2">
          Tentar novamente
        </button>
      )}
    </div>
  );
}

export function SectionTitle({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-moss">{eyebrow}</span>
        )}
        <h2 className="mt-1 font-display text-2xl font-bold text-brand-ink sm:text-3xl">{title}</h2>
      </div>
      {action}
    </div>
  );
}
