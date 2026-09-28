import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contato",
  description: "Fale com a Mustang Atlética — Medicina Veterinária Anhanguera.",
  alternates: { canonical: "/contato" },
};

export default function ContactPage() {
  return (
    <article className="container-page max-w-2xl py-12">
      <h1 className="font-display text-4xl font-bold text-brand-ink">Contato</h1>
      <p className="mt-3 text-black/70">
        Dúvidas sobre pedidos, tamanhos, prazos ou produtos oficiais? Fale com a atlética.
      </p>

      {/*
        IMPORTANTE: o canal oficial (e-mail/WhatsApp/redes) depende de configuração
        da atlética. Não inventamos contatos. Assim que definidos, eles devem ser
        cadastrados no painel administrativo (StoreSettings).
      */}
      <div className="mt-8 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-900">
        <p className="font-semibold">Canal de atendimento em configuração</p>
        <p className="mt-1">
          Os dados oficiais de contato (e-mail, telefone e redes da atlética) ainda não foram
          cadastrados no sistema. Por isso não exibimos nenhum contato fictício.
        </p>
        <p className="mt-1">
          O administrador pode configurar esses dados em{" "}
          <strong>Configurações da loja</strong>, no painel administrativo.
        </p>
      </div>

      <div className="mt-8 rounded-2xl border border-black/10 bg-white p-5">
        <h2 className="font-display text-lg font-semibold text-brand-ink">Atendimento</h2>
        <p className="mt-2 text-sm text-black/60">
          Horário de atendimento: a definir pela atlética. Para assuntos de pedido, informe sempre o
          número do pedido (padrão <code>MA-AAAAMMDD-XXXXXX</code>).
        </p>
      </div>
    </article>
  );
}
