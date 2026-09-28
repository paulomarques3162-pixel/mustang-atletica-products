/** Formatação pt-BR — valores chegam da API como string decimal. */

export function formatBRL(value: string | number): string {
  const n = typeof value === "string" ? Number(value) : value;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
}

export function formatDate(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(d);
}

export function formatCep(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
}

/** Parcelamento exibido (sem inventar regras do provedor: apenas divisão simples). */
export function installmentLabel(total: string, maxInstallments = 3): string | null {
  const value = Number(total);
  if (!Number.isFinite(value) || value <= 0) return null;
  const perInstallment = value / maxInstallments;
  if (perInstallment < 5) return null; // não exibe parcelas irrelevantes
  return `em até ${maxInstallments}x de ${formatBRL(perInstallment)} sem juros`;
}

export const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  awaiting_payment: "Aguardando pagamento",
  confirmed: "Confirmado",
  processing: "Em preparação",
  shipped: "Enviado",
  delivered: "Entregue",
  canceled: "Cancelado",
  refunded: "Estornado",
};

export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  pending: "Aguardando pagamento",
  processing: "Processando",
  paid: "Pago",
  failed: "Recusado",
  canceled: "Cancelado",
  refunded: "Estornado",
  expired: "Expirado",
};

export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  pix: "PIX",
  credit_card: "Cartão de crédito",
  debit_card: "Cartão de débito",
  boleto: "Boleto",
  wallet: "Carteira digital",
  apple_pay: "Apple Pay",
  google_pay: "Google Pay",
};

export function stockLabel(level: "in" | "low" | "out"): string {
  if (level === "out") return "Esgotado";
  if (level === "low") return "Últimas unidades";
  return "Disponível";
}
