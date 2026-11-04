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
};

export const defaultMaterialTypes: MaterialType[] = [
  { id: "PLA", label: "PLA", hint: "Rígido y económico. Ideal para decoración.", price_factor: 1, available: true },
  { id: "PETG", label: "PETG", hint: "Más resistente al calor y a golpes.", price_factor: 1, available: true },
  { id: "TPU", label: "TPU (flexible)", hint: "Goma flexible: fundas, topes, juntas.", price_factor: 1, available: true },
  { id: "Resina", label: "Resina", hint: "Máximo detalle: miniaturas y joyería.", price_factor: 1, available: true },
];

export function materialLabel(types: MaterialType[], id: string) {
  return types.find((t) => t.id === id)?.label ?? id;
}

/** Tipos que se ofrecen para un modelo: disponibles y, si el modelo los limita, permitidos. */
export function materialsFor(types: MaterialType[], allowed: string[] | null | undefined) {
  return types.filter((t) => t.available && (!allowed?.length || allowed.includes(t.id)));
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
    out.push({ id, label, hint, price_factor: factor, available: t.available !== false });
  }
  return out.length ? out : null;
}
