import Link from "next/link";

import { cn, slugify } from "@/lib/utils";

/** Filtros del catálogo. Cada categoría es una página estática propia (mejor para SEO que ?categoria=). */
export function CategoryNav({ categories, active }: { categories: string[]; active: string | null }) {
  return (
    <nav aria-label="Categorías" className="mb-8 flex flex-wrap gap-2">
      {[null, ...categories].map((c) => (
        <Link
          key={c ?? "todas"}
          href={c ? `/categorias/${slugify(c)}` : "/modelos"}
          className={cn(
            "rounded-full border-2 px-4 py-1.5 text-sm font-medium transition-all",
            c === active
              ? "border-foreground bg-foreground text-background shadow-extrude-sm dark:border-extrude dark:bg-primary dark:text-primary-foreground"
              : "border-foreground/15 hover:border-foreground",
          )}
        >
          {c ?? "Todas"}
        </Link>
      ))}
    </nav>
  );
}
