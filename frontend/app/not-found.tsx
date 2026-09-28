import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      <span className="font-display text-6xl font-bold text-brand-gold">404</span>
      <h1 className="mt-4 font-display text-3xl font-bold text-brand-ink">Página não encontrada</h1>
      <p className="mt-2 max-w-md text-black/60">
        O endereço que você tentou acessar não existe ou o produto não está mais disponível.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href="/" className="btn-primary">Voltar ao início</Link>
        <Link href="/produtos" className="btn-secondary">Ver produtos</Link>
      </div>
    </div>
  );
}
