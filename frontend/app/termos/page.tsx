import type { Metadata } from "next";
import { LegalPage } from "@/components/legal";

export const metadata: Metadata = {
  title: "Termos de Uso",
  description: "Termos de uso da loja oficial da Mustang Atlética.",
  alternates: { canonical: "/termos" },
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Termos de Uso"
      updatedAt="documento inicial"
      intro="Ao utilizar a loja oficial da Mustang Atlética, você concorda com os termos abaixo."
    >
      <section>
        <h2 className="font-display text-lg font-semibold text-brand-ink">1. Objeto</h2>
        <p className="mt-2">
          Esta loja destina-se à divulgação e venda de produtos oficiais da Mustang Atlética, ligada à
          Medicina Veterinária da Anhanguera.
        </p>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold text-brand-ink">2. Cadastro</h2>
        <p className="mt-2">
          O usuário é responsável pela veracidade das informações fornecidas e pela guarda de suas
          credenciais de acesso.
        </p>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold text-brand-ink">3. Preços e disponibilidade</h2>
        <p className="mt-2">
          Preços, promoções e disponibilidade são exibidos conforme os dados cadastrados pela atlética.
          Pedidos estão sujeitos à confirmação de estoque e de pagamento.
        </p>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold text-brand-ink">4. Pagamento</h2>
        <p className="mt-2">
          O pagamento é processado por provedor especializado. O pedido é confirmado somente após a
          confirmação do pagamento pelo provedor, por meio de validação segura.
        </p>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold text-brand-ink">5. Propriedade intelectual</h2>
        <p className="mt-2">
          A identidade visual, marca, imagens e materiais da Mustang Atlética não podem ser reproduzidos
          sem autorização.
        </p>
      </section>
    </LegalPage>
  );
}
