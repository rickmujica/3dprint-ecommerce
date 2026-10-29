import { cacheLife, cacheTag } from "next/cache";
import { demoModels } from "./demo-data";
import { hasSupabase } from "./supabase/env";
import { createPublicClient } from "./supabase/public";
import type { Model } from "./types";

// Columnas públicas: nunca incluir source_file_key (STL original privado).
const PUBLIC_COLUMNS =
  "id, slug, title, description, category, tags, license, author_name, author_url, source_url, glb_url, thumbnail_url, size_x_mm, size_y_mm, size_z_mm, base_price, featured, published, created_at";

export async function getPublishedModels(): Promise<Model[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("models");

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

export async function getModelBySlug(slug: string): Promise<Model | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("models", `model:${slug}`);

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
