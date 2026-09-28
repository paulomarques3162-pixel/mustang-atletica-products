/**
 * Camada de analytics preparada para integração futura.
 *
 * Não faz rastreamento invasivo nem envia dados pessoais: apenas enfileira
 * eventos anônimos em memória e os repassa a um provider, SE configurado
 * (ex.: GA4, Plausible). Sem NEXT_PUBLIC_ANALYTICS_ID, nada é enviado.
 */

export type AnalyticsEvent =
  | "view_product"
  | "add_to_cart"
  | "begin_checkout"
  | "purchase"
  | "share_product"
  | "search"
  | "login"
  | "signup";

interface EventPayload {
  [key: string]: string | number | boolean | undefined;
}

declare global {
  interface Window {
    dataLayer?: unknown[];
    plausible?: (event: string, options?: { props?: EventPayload }) => void;
  }
}

const ANALYTICS_ID = process.env.NEXT_PUBLIC_ANALYTICS_ID;

/** Remove qualquer campo que possa identificar pessoalmente o usuário. */
function sanitize(payload: EventPayload): EventPayload {
  const blocked = ["email", "phone", "document", "cpf", "name", "address"];
  return Object.fromEntries(
    Object.entries(payload).filter(([k]) => !blocked.includes(k.toLowerCase())),
  );
}

export function track(event: AnalyticsEvent, payload: EventPayload = {}): void {
  if (typeof window === "undefined") return;

  const data = { event, ...sanitize(payload), ts: Date.now() };

  // Provider genérico (ex.: GTM/GA4) — só quando configurado
  if (ANALYTICS_ID && Array.isArray(window.dataLayer)) {
    window.dataLayer.push(data);
  }

  // Plausible, se presente
  if (typeof window.plausible === "function") {
    window.plausible(event, { props: sanitize(payload) });
  }
}
