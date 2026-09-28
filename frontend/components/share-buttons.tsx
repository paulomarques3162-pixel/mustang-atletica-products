"use client";

import { useState } from "react";
import {
  copyLink,
  facebookUrl,
  productShareTarget,
  shareProduct,
  whatsappUrl,
  xUrl,
} from "@/lib/share";

export function ShareButtons({ product }: { product: { name: string; slug: string; price: string } }) {
  const [copied, setCopied] = useState(false);
  const target = productShareTarget(product);

  return (
    <div>
      <span className="label">Compartilhar</span>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void shareProduct(target)}
          className="btn-secondary min-h-11"
        >
          Compartilhar
        </button>

        <a
          href={whatsappUrl(target)}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-ghost min-h-11 border border-black/10"
          aria-label="Compartilhar no WhatsApp"
        >
          WhatsApp
        </a>

        <a
          href={facebookUrl(target.url)}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-ghost min-h-11 border border-black/10"
          aria-label="Compartilhar no Facebook"
        >
          Facebook
        </a>

        <a
          href={xUrl(target)}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-ghost min-h-11 border border-black/10"
          aria-label="Compartilhar no X"
        >
          X
        </a>

        <button
          type="button"
          className="btn-ghost min-h-11 border border-black/10"
          onClick={async () => {
            const ok = await copyLink(target.url);
            setCopied(ok);
            setTimeout(() => setCopied(false), 2000);
          }}
        >
          {copied ? "Link copiado ✓" : "Copiar link"}
        </button>
      </div>
    </div>
  );
}
