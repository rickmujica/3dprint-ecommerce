import { unstable_cache } from "next/cache";

import { defaultMaterialTypes, normalizeMaterialTypes, type MaterialType } from "./material-types";
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

async function fetchMaterialTypes(): Promise<MaterialType[]> {
  if (!hasSupabase) return defaultMaterialTypes;
  const { data, error } = await createPublicClient().rpc("material_types");
  // Sin la migración de tipos de filamento se usan los de fábrica.
  if (error) return defaultMaterialTypes;
  return normalizeMaterialTypes(data) ?? defaultMaterialTypes;
}

/** Tipos de filamento (PLA, PETG…), cacheados. Se invalidan con updateTag("palette"). */
export const getMaterialTypes = unstable_cache(fetchMaterialTypes, ["material-types"], {
  revalidate: 3600,
  tags: ["palette"],
});
