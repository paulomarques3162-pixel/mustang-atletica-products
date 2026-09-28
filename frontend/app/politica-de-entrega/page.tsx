import type { Metadata } from "next";
import { LegalPage } from "@/components/legal";

export const metadata: Metadata = {
  title: "Política de Entrega",
  description: "Modalidades de entrega e retirada dos produtos oficiais da Mustang Atlética.",
  alternates: { canonical: "/politica-de-entrega" },
};

export default function DeliveryPolicyPage() {
  return (
    <LegalPage
      title="Política de Entrega"
      updatedAt="documento inicial"
      intro="Como os produtos oficiais chegam até você."
    >
      <section>
        <h2 className="font-display text-lg font-semibold text-brand-ink">1. Retirada</h2>
        <p className="mt-2">
          A retirada na Mustang Atlética não possui custo de frete. Local, dias e horários de retirada
          são definidos pela atlética e informados ao cliente após a confirmação do pedido.
        </p>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold text-brand-ink">2. Envio por transportadora</h2>
        <p className="mt-2">
          O envio depende de integração ativa com uma transportadora. Enquanto essa integração não estiver
          configurada, o checkout libera apenas a retirada — ou uma taxa fixa definida explicitamente pela
          atlética. Não exibimos valores de frete estimados que não venham de uma fonte real.
        </p>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold text-brand-ink">3. Prazos</h2>
        <p className="mt-2">
          Os prazos de produção, postagem e entrega são definidos pela atlética e pela transportadora
          contratada, sendo informados no momento da compra.
        </p>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold text-brand-ink">4. Rastreamento</h2>
        <p className="mt-2">
          Quando houver código de rastreio, ele aparece na página do pedido em{" "}
          <em>Minha conta → Pedidos</em>.
        </p>
      </section>
    </LegalPage>
  );
}
