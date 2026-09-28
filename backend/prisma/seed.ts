/**
 * Seed de DESENVOLVIMENTO / TESTE.
 *
 * ⚠️  NUNCA executar em produção (bloqueado abaixo).
 * Os produtos aqui são explicitamente marcados como DEMO — não representam
 * preços, estoques ou catálogo reais da Mustang Atlética.
 */
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === "production") {
    console.error("Seed bloqueado em produção.");
    process.exit(1);
  }
  if (process.env.ALLOW_SEED !== "true") {
    console.error(
      "Seed bloqueado. Defina ALLOW_SEED=true para popular o banco de desenvolvimento com dados DEMO.",
    );
    process.exit(1);
  }

  // ---------- Usuário administrador ----------
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@mustang.local";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "MustangDemo123";
  const adminHash = await bcrypt.hash(adminPassword, 12);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: "Administrador DEMO",
      passwordHash: adminHash,
      role: Role.ADMIN,
    },
  });
  console.log(`Admin DEMO: ${adminEmail} / ${adminPassword}`);

  // ---------- Categorias ----------
  const categoryDefs = [
    { name: "Camisetas", position: 1 },
    { name: "Moletons", position: 2 },
    { name: "Regatas", position: 3 },
    { name: "Bonés", position: 4 },
    { name: "Canecas", position: 5 },
    { name: "Acessórios", position: 6 },
    { name: "Kits", position: 7 },
  ];
  const categories: Record<string, string> = {};
  for (const c of categoryDefs) {
    const slug = c.name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/\s+/g, "-");
    const created = await prisma.category.upsert({
      where: { slug },
      update: {},
      create: { name: c.name, slug, position: c.position, active: true },
    });
    categories[c.name] = created.id;
  }

  // ---------- Produtos DEMO ----------
  const demoProducts = [
    {
      name: "[DEMO] Camiseta Mustang Atlética Oficial",
      category: "Camisetas",
      basePrice: "89.90",
      promotionalPrice: "69.90",
      badge: "DEMO",
      featured: true,
      sizes: ["P", "M", "G", "GG"],
      colors: ["Preta", "Verde", "Branca"],
    },
    {
      name: "[DEMO] Moletom Mustang Veterinária",
      category: "Moletons",
      basePrice: "199.90",
      promotionalPrice: null,
      badge: "DEMO",
      featured: true,
      sizes: ["P", "M", "G", "GG"],
      colors: ["Verde", "Preta"],
    },
    {
      name: "[DEMO] Regata Treino Mustang",
      category: "Regatas",
      basePrice: "69.90",
      promotionalPrice: null,
      badge: "DEMO",
      featured: false,
      sizes: ["P", "M", "G"],
      colors: ["Preta"],
    },
    {
      name: "[DEMO] Boné Mustang Aba Curva",
      category: "Bonés",
      basePrice: "59.90",
      promotionalPrice: "49.90",
      badge: "DEMO",
      featured: false,
      sizes: ["Único"],
      colors: ["Verde", "Preto"],
    },
    {
      name: "[DEMO] Caneca Mustang Medicina Veterinária",
      category: "Canecas",
      basePrice: "39.90",
      promotionalPrice: null,
      badge: "DEMO",
      featured: false,
      sizes: ["325ml"],
      colors: ["Branca"],
    },
  ];

  for (const p of demoProducts) {
    const slug = p.name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-");
    const product = await prisma.product.upsert({
      where: { slug },
      update: {},
      create: {
        name: p.name,
        slug,
        sku: `DEMO-${slug.slice(0, 12).toUpperCase()}`,
        shortDescription: "Produto de demonstração — não é um item real do catálogo.",
        description:
          "ITEM DE DEMONSTRAÇÃO. Este registro existe apenas para validar a loja durante o desenvolvimento. " +
          "Preços, estoque e imagens NÃO representam produtos reais da Mustang Atlética.",
        categoryId: categories[p.category],
        basePrice: p.basePrice,
        promotionalPrice: p.promotionalPrice,
        badge: p.badge,
        featured: p.featured,
        active: true,
      },
    });

    for (const size of p.sizes) {
      for (const color of p.colors) {
        const sku = `DEMO-${slug.slice(0, 8).toUpperCase()}-${size}-${color}`
          .replace(/\s+/g, "")
          .toUpperCase();
        const existing = await prisma.productVariant.findFirst({
          where: { productId: product.id, size, color },
        });
        if (!existing) {
          await prisma.productVariant.create({
            data: { productId: product.id, sku, size, color, stock: 10, active: true },
          });
        }
      }
    }
  }

  // ---------- Cupom DEMO ----------
  await prisma.coupon.upsert({
    where: { code: "DEMO10" },
    update: {},
    create: {
      code: "DEMO10",
      description: "Cupom de demonstração (10% de desconto)",
      discountType: "percentage",
      discountValue: "10",
      active: true,
    },
  });

  // ---------- Configurações da loja ----------
  await prisma.storeSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      id: "singleton",
      storeName: "Mustang Atlética",
      supportEmail: "contato@exemplo.com",
    },
  });

  console.log("Seed concluído. Todos os dados são DEMO.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
