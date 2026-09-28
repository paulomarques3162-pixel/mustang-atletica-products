import type { Metadata } from "next";
import { LegalPage } from "@/components/legal";

export const metadata: Metadata = {
  title: "Política de Troca",
  description: "Condições de troca e devolução de produtos da Mustang Atlética.",
  alternates: { canonical: "/politica-de-troca" },
};

export default function ExchangePolicyPage() {
  return (
    <LegalPage
      title="Política de Troca e Devolução"
      updatedAt="documento inicial"
      intro="Queremos que você use sua peça oficial com orgulho. Veja como funcionam as trocas e devoluções."
    >
      <section>
        <h2 className="font-display text-lg font-semibold text-brand-ink">1. Prazo legal</h2>
        <p className="mt-2">
          Em compras online, o Código de Defesa do Consumidor garante o direito de arrependimento em até
          7 (sete) dias corridos após o recebimento do produto.
        </p>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold text-brand-ink">2. Condições do produto</h2>
        <p className="mt-2">
          Para troca por tamanho ou defeito, o produto deve estar sem sinais de uso, com etiqueta e
          embalagem preservadas. Itens personalizados podem seguir regras específicas informadas no ato
          da compra.
        </p>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold text-brand-ink">3. Como solicitar</h2>
        <p className="mt-2">
          Solicite a troca pelo canal de atendimento da atlética (em configuração), informando o número
          do pedido (padrão <code>MA-AAAAMMDD-XXXXXX</code>) e o motivo.
        </p>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold text-brand-ink">4. Prazos administrativos</h2>
        <p className="mt-2">
          Os prazos internos de análise, coleta e reenvio serão definidos pela atlética e informados no
          atendimento. Não inventamos prazos operacionais neste documento.
        </p>
      </section>
    </LegalPage>
  );
}
