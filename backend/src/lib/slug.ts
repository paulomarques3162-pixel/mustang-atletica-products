/** Gera um slug URL-friendly (sem acentos, minúsculo, hifenizado). */
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Garante unicidade adicionando sufixo curto quando necessário. */
export function uniqueSlug(base: string, exists: (slug: string) => Promise<boolean>) {
  return (async () => {
    const slug = slugify(base);
    if (!(await exists(slug))) return slug;
    let i = 2;
    // limite defensivo para evitar loop infinito
    while (i < 1000) {
      const candidate = `${slug}-${i}`;
      if (!(await exists(candidate))) return candidate;
      i += 1;
    }
    return `${slug}-${Date.now()}`;
  })();
}
