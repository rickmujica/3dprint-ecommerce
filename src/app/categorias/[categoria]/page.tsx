import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { CategoryNav } from "@/components/category-nav";
import { ModelGrid } from "@/components/model-card";
import { getCategories, getPublishedModels } from "@/lib/catalog";
import { slugify } from "@/lib/utils";

async function findCategory(slug: string) {
  const categories = await getCategories();
  return { categories, category: categories.find((c) => slugify(c) === slug) ?? null };
}

export async function generateStaticParams() {
  const categories = await getCategories();
  // Con Cache Components hace falta al menos un parámetro.
  return categories.length ? categories.map((c) => ({ categoria: slugify(c) })) : [{ categoria: "_" }];
}

export async function generateMetadata({ params }: PageProps<"/categorias/[categoria]">): Promise<Metadata> {
  const { category } = await findCategory((await params).categoria);
  if (!category) notFound();
  return {
    title: `${category} impresos en 3D`,
    description: `Modelos de ${category.toLowerCase()} listos para imprimir en 3D. Elegí material y color y pedí tu impresión.`,
    alternates: { canonical: `/categorias/${slugify(category)}` },
  };
}

export default function CategoryPage({ params }: PageProps<"/categorias/[categoria]">) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <p className="font-mono text-sm text-primary">{"// catálogo"}</p>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-muted" />}>
        <CategoryContent params={params} />
      </Suspense>
    </div>
  );
}

async function CategoryContent({ params }: Pick<PageProps<"/categorias/[categoria]">, "params">) {
  const { categories, category } = await findCategory((await params).categoria);
  if (!category) notFound();
  const models = (await getPublishedModels()).filter((m) => m.category === category);

  return (
    <>
      <h1 className="mb-8 text-4xl font-bold sm:text-5xl">{category}</h1>
      <CategoryNav categories={categories} active={category} />
      <ModelGrid models={models} />
    </>
  );
}
