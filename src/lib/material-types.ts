import { availableFilaments, type Filament } from "@/lib/palette";
import type { ColorZone } from "@/lib/types";

/**
 * Tipos de filamento (PLA, PETG, TPU, Resina…). Se editan en /admin/filamentos y se guardan en
 * shop_settings.material_types; estos son los de fábrica (modo demo o antes de correr la migración).
 */
export type MaterialType = {
  /** Id estable que guardan los pedidos. */
  id: string;
  label: string;
  hint: string;
  /** Multiplica el precio del modelo (1 = precio base). */
  price_factor: number;
  /** Si no hay stock, no se ofrece en los formularios. */
  available: boolean;
  /** Colores de la paleta que hay en este tipo. null = todos (también los que se agreguen después). */
  colors: string[] | null;
};

export const defaultMaterialTypes: MaterialType[] = [
  { id: "PLA", label: "PLA", hint: "Rígido y económico. Ideal para decoración.", price_factor: 1, available: true, colors: null },
  { id: "PETG", label: "PETG", hint: "Más resistente al calor y a golpes.", price_factor: 1, available: true, colors: null },
  { id: "TPU", label: "TPU (flexible)", hint: "Goma flexible: fundas, topes, juntas.", price_factor: 1, available: true, colors: null },
  { id: "Resina", label: "Resina", hint: "Máximo detalle: miniaturas y joyería.", price_factor: 1, available: true, colors: null },
];

export function materialLabel(types: MaterialType[], id: string) {
  return types.find((t) => t.id === id)?.label ?? id;
}

/** Tipos que se ofrecen para un modelo: disponibles y, si el modelo los limita, permitidos. */
export function materialsFor(types: MaterialType[], allowed: string[] | null | undefined) {
  return types.filter((t) => t.available && (!allowed?.length || allowed.includes(t.id)));
}

/**
 * La paleta vista desde un tipo de filamento: los colores que no hay en ese tipo quedan como no disponibles
 * (siguen en la lista para mostrar nombre y color de pedidos o zonas que ya los usan).
 */
export function paletteFor(palette: Filament[], type: MaterialType | undefined): Filament[] {
  if (!type?.colors) return palette;
  const has = new Set(type.colors);
  return palette.map((c) => (c.available && !has.has(c.id) ? { ...c, available: false } : c));
}

/**
 * Tipos que se pueden pedir para un modelo (o para un pedido personalizado si `model` es null):
 * permitidos, con al menos un color en stock y, si el modelo tiene colores fijos, con todos sus colores.
 */
export function orderableMaterials(
  types: MaterialType[],
  palette: Filament[],
  model: { allowed_materials?: string[] | null; color_zones?: ColorZone[]; colors_locked?: boolean } | null,
) {
  const locked = model?.colors_locked && model.color_zones?.length ? model.color_zones.map((z) => z.color) : [];
  return materialsFor(types, model?.allowed_materials).filter((t) => {
    const ids = new Set(availableFilaments(paletteFor(palette, t)).map((c) => c.id));
    return ids.size > 0 && locked.every((id) => ids.has(id));
  });
}

/** "Por ahora no tenemos Resina en Negro ni en Naranja" (sin punto final). */
export function missingColorsText(materialLabel: string | undefined, colorLabels: string[]) {
  const unique = [...new Set(colorLabels)];
  const list = unique.length > 1 ? `${unique.slice(0, -1).join(", ")} ni en ${unique.at(-1)}` : (unique[0] ?? "");
  return `Por ahora no tenemos ${materialLabel ?? "ese material"} en ${list}`;
}

/** Valida y limpia la lista (de la base o del formulario del admin). */
export function normalizeMaterialTypes(raw: unknown): MaterialType[] | null {
  if (!Array.isArray(raw)) return null;
  const out: MaterialType[] = [];
  for (const t of raw as Record<string, unknown>[]) {
    const id = typeof t?.id === "string" ? t.id : "";
    const label = typeof t?.label === "string" ? t.label.trim().slice(0, 40) : "";
    const hint = typeof t?.hint === "string" ? t.hint.trim().slice(0, 120) : "";
    const factor = Number(t?.price_factor ?? 1);
    if (!/^[A-Za-z0-9-]{1,40}$/.test(id) || !label || out.some((o) => o.id === id)) continue;
    if (!Number.isFinite(factor) || factor <= 0 || factor > 20) continue;
    const colors = Array.isArray(t.colors)
      ? [...new Set(t.colors.filter((c): c is string => typeof c === "string" && /^[a-z0-9-]{1,40}$/.test(c)))]
      : null;
    out.push({ id, label, hint, price_factor: factor, available: t.available !== false, colors });
  }
  return out.length ? out : null;
}
