import Link from "next/link";
import Image from "next/image";
import type { Category } from "@/lib/types";

export function CategoryCard({ category }: { category: Category }) {
  return (
    <Link
      href={`/produtos?categoria=${category.slug}`}
      className="group relative flex aspect-[4/3] flex-col justify-end overflow-hidden rounded-2xl bg-brand-radial p-5 text-brand-cream shadow-card"
    >
      {category.imageUrl ? (
        <Image
          src={category.imageUrl}
          alt=""
          fill
          sizes="(max-width: 768px) 50vw, 25vw"
          className="object-cover opacity-60 transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        <span
          aria-hidden
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 30% 20%, rgba(200,163,73,.9), transparent 55%), radial-gradient(circle at 80% 90%, rgba(30,92,65,.9), transparent 55%)",
          }}
        />
      )}
      <span className="relative z-10 block h-px w-10 bg-brand-gold" aria-hidden />
      <h3 className="relative z-10 mt-3 font-display text-xl font-semibold">{category.name}</h3>
      <span className="relative z-10 mt-1 text-xs uppercase tracking-wider text-brand-gold">
        {category.productCount} {category.productCount === 1 ? "produto" : "produtos"}
      </span>
    </Link>
  );
}
