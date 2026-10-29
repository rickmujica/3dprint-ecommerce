import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { ModelGrid } from "@/components/model-card";
import { getCategories, getPublishedModels } from "@/lib/catalog";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Catálogo de modelos 3D",
  description: "Modelos 3D listos para imprimir: decoración, hogar, repuestos y accesorios. Miralos en 3D y pedí tu impresión.",
  alternates: { canonical: "/modelos" },
};

export default function CatalogPage({ searchParams }: PageProps<"/modelos">) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <p className="font-mono text-sm text-primary">{"// catálogo"}</p>
      <h1 className="mb-8 text-4xl font-bold sm:text-5xl">Modelos para imprimir</h1>
      <Suspense fallback={<GridSkeleton />}>
        <FilteredCatalog searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function FilteredCatalog({ searchParams }: Pick<PageProps<"/modelos">, "searchParams">) {
  const { categoria } = await searchParams;
  const active = typeof categoria === "string" ? categoria : null;
  const [models, categories] = await Promise.all([getPublishedModels(), getCategories()]);
  const visible = active ? models.filter((m) => m.category === active) : models;

  return (
    <>
      <nav aria-label="Categorías" className="mb-8 flex flex-wrap gap-2">
        {[null, ...categories].map((c) => (
          <Link
            key={c ?? "todas"}
            href={c ? `/modelos?categoria=${encodeURIComponent(c)}` : "/modelos"}
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
      <ModelGrid models={visible} />
    </>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="aspect-[4/5] animate-pulse rounded-xl bg-muted" />
      ))}
    </div>
  );
}
