import { unstable_cache } from "next/cache";

import { defaultFilaments, normalizePalette, type Filament } from "./palette";
import { hasSupabase } from "./supabase/env";
import { createPublicClient } from "./supabase/public";

async function fetchPalette(): Promise<Filament[]> {
  if (!hasSupabase) return defaultFilaments;
  const { data, error } = await createPublicClient().rpc("filament_palette");
  // Sin la migración de filamentos (o con la paleta vacía) se usa la de fábrica.
  if (error) return defaultFilaments;
  return normalizePalette(data) ?? defaultFilaments;
}

/** Paleta de filamentos, cacheada. Al editarla en el admin se invalida con updateTag("palette"). */
export const getPalette = unstable_cache(fetchPalette, ["filament-palette"], {
  revalidate: 3600,
  tags: ["palette"],
});
