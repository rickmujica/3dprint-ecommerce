import type { Metadata } from "next";

import { CategoryNav } from "@/components/category-nav";
import { ModelGrid } from "@/components/model-card";
import { getCategories, getPublishedModels } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Catálogo de modelos 3D",
  description: "Modelos 3D listos para imprimir: decoración, hogar, repuestos y accesorios. Miralos en 3D y pedí tu impresión.",
  alternates: { canonical: "/modelos" },
};

export default async function CatalogPage() {
  const [models, categories] = await Promise.all([getPublishedModels(), getCategories()]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <p className="font-mono text-sm text-primary">{"// catálogo"}</p>
      <h1 className="mb-8 text-4xl font-bold sm:text-5xl">Modelos para imprimir</h1>
      <CategoryNav categories={categories} active={null} />
      <ModelGrid models={models} />
    </div>
  );
}
