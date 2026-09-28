"use client";

import { track } from "./analytics";

export interface ShareTarget {
  title: string;
  text: string;
  url: string;
}

/**
 * Compartilhamento de produto.
 * Usa Web Share API quando disponível e cai para WhatsApp / copiar link /
 * Facebook / X. Sempre compartilha a URL REAL do produto.
 */
export async function shareProduct(target: ShareTarget): Promise<"shared" | "copied" | "cancelled"> {
  track("share_product", { url: target.url, title: target.title });

  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share(target);
      return "shared";
    } catch {
      return "cancelled";
    }
  }
  const copied = await copyLink(target.url);
  return copied ? "copied" : "cancelled";
}

export async function copyLink(url: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(url);
      return true;
    }
    // fallback para contextos sem clipboard API
    const el = document.createElement("textarea");
    el.value = url;
    el.style.position = "fixed";
    el.style.opacity = "0";
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}

export function whatsappUrl(target: ShareTarget): string {
  const text = `${target.text} ${target.url}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function facebookUrl(url: string): string {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
}

export function xUrl(target: ShareTarget): string {
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    target.text,
  )}&url=${encodeURIComponent(target.url)}`;
}

export function productShareTarget(p: { name: string; slug: string; price: string }): ShareTarget {
  return {
    title: `${p.name} — Mustang Atlética`,
    text: "Confira este produto da Mustang Atlética!",
    url: typeof window !== "undefined" ? `${window.location.origin}/produtos/${p.slug}` : `/produtos/${p.slug}`,
  };
}
