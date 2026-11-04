import { unstable_cache } from "next/cache";
import { demoModels } from "./demo-data";
import { hasSupabase } from "./supabase/env";
import { createPublicClient } from "./supabase/public";
import type { Model } from "./types";

// Columnas públicas: nunca incluir source_file_key (STL original privado).
const PUBLIC_COLUMNS =
  "id, slug, title, description, category, tags, license, author_name, author_url, source_url, glb_url, thumbnail_url, size_x_mm, size_y_mm, size_z_mm, base_price, multicolor_price, color_zones, colors_locked, featured, published, created_at";

const ONE_HOUR = 60 * 60;

const cachedPublishedModels = unstable_cache(fetchPublishedModels, ["published-models"], {
  revalidate: ONE_HOUR,
  tags: ["models"],
});

/**
 * Completa columnas que pueden faltar en datos cacheados antes de agregarlas a la tabla
 * (la caché incremental puede servir un modelo leído con una versión anterior del código).
 */
function normalize(m: Model): Model {
  return {
    ...m,
    color_zones: Array.isArray(m.color_zones) ? m.color_zones : [],
    colors_locked: Boolean(m.colors_locked),
    multicolor_price: m.multicolor_price ?? null,
  };
}

export async function getPublishedModels(): Promise<Model[]> {
  return (await cachedPublishedModels()).map(normalize);
}

export async function getModelBySlug(slug: string): Promise<Model | null> {
  const model = await unstable_cache(() => fetchModelBySlug(slug), ["model-by-slug", slug], {
    revalidate: ONE_HOUR,
    tags: ["models", `model:${slug}`],
  })();
  return model && normalize(model);
}

async function fetchPublishedModels(): Promise<Model[]> {
  if (!hasSupabase) return demoModels;

  const { data, error } = await createPublicClient()
    .from("models")
    .select(PUBLIC_COLUMNS)
    .eq("published", true)
    .order("featured", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(`No se pudo leer el catálogo: ${error.message}`);
  return data as Model[];
}

async function fetchModelBySlug(slug: string): Promise<Model | null> {
  if (!hasSupabase) return demoModels.find((m) => m.slug === slug) ?? null;

  const { data, error } = await createPublicClient()
    .from("models")
    .select(PUBLIC_COLUMNS)
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();

  if (error) throw new Error(`No se pudo leer el modelo: ${error.message}`);
  return data as Model | null;
}

export async function getCategories(): Promise<string[]> {
  const models = await getPublishedModels();
  return [...new Set(models.map((m) => m.category))].sort((a, b) => a.localeCompare(b, "es"));
}
