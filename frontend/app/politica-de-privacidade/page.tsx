import type { Metadata } from "next";
import { LegalPage } from "@/components/legal";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description: "Como a Mustang Atlética trata seus dados pessoais, em conformidade com a LGPD.",
  alternates: { canonical: "/politica-de-privacidade" },
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Política de Privacidade"
      updatedAt="documento inicial"
      intro="Esta política descreve como a loja oficial da Mustang Atlética coleta, usa e protege dados pessoais, em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei 13.709/2018)."
    >
      <section>
        <h2 className="font-display text-lg font-semibold text-brand-ink">1. Dados coletados</h2>
        <p className="mt-2">
          Coletamos apenas os dados necessários para processar pedidos e prestar atendimento: nome,
          e-mail, telefone, CPF (quando necessário para emissão fiscal) e endereço de entrega. Dados de
          pagamento são processados diretamente pelo provedor de pagamento; não armazenamos número
          completo de cartão nem CVV.
        </p>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold text-brand-ink">2. Finalidade</h2>
        <p className="mt-2">
          Os dados são utilizados para: criação e gestão da conta, processamento de pedidos, comunicação
          sobre compras, cumprimento de obrigações legais e melhoria da loja.
        </p>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold text-brand-ink">3. Compartilhamento</h2>
        <p className="mt-2">
          Compartilhamos dados estritamente necessários com provedores de pagamento, meios de entrega e
          serviços de infraestrutura, sempre limitados à finalidade da compra.
        </p>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold text-brand-ink">4. Seus direitos</h2>
        <p className="mt-2">
          Você pode solicitar confirmação de tratamento, acesso, correção, portabilidade e exclusão dos
          seus dados. Para exercer esses direitos, utilize o canal de contato da atlética (em
          configuração).
        </p>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold text-brand-ink">5. Minimização e segurança</h2>
        <p className="mt-2">
          Adotamos medidas técnicas e administrativas para proteger os dados: senhas armazenadas com
          hash, tokens de sessão, controle de acesso por papéis, registro de auditoria e comunicação
          criptografada (HTTPS).
        </p>
      </section>
    </LegalPage>
  );
}
