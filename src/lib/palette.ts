/**
 * Paleta de filamentos. La real se edita en /admin/filamentos y se guarda en Supabase
 * (shop_settings.filaments); esta es la de fábrica (modo demo o antes de correr la migración).
 */
export type Filament = {
  /** Id estable que guardan pedidos y zonas de color (no cambia aunque cambie el nombre). */
  id: string;
  label: string;
  hex: string;
  /** Si no hay stock, no se ofrece en los formularios (pero los pedidos viejos lo siguen mostrando). */
  available: boolean;
};

export const defaultFilaments: Filament[] = [
  { id: "negro", label: "Negro", hex: "#111111", available: true },
  { id: "blanco", label: "Blanco", hex: "#f5f5f5", available: true },
  { id: "violeta", label: "Violeta", hex: "#a855f7", available: true },
  { id: "cian", label: "Cian", hex: "#06b6d4", available: true },
  { id: "magenta", label: "Magenta", hex: "#ec4899", available: true },
  { id: "lima", label: "Lima", hex: "#84cc16", available: true },
  { id: "naranja", label: "Naranja", hex: "#f97316", available: true },
  { id: "gris", label: "Gris", hex: "#9ca3af", available: true },
  { id: "rojo", label: "Rojo", hex: "#dc2626", available: true },
  { id: "azul", label: "Azul", hex: "#2563eb", available: true },
  { id: "amarillo", label: "Amarillo", hex: "#facc15", available: true },
  { id: "verde", label: "Verde", hex: "#16a34a", available: true },
  { id: "piel", label: "Piel", hex: "#f2c9a0", available: true },
  { id: "marron", label: "Marrón", hex: "#7c4a21", available: true },
  { id: "dorado", label: "Dorado", hex: "#c9a227", available: true },
  { id: "plata", label: "Plata", hex: "#c0c0c8", available: true },
];

export function findFilament(palette: Filament[], id: string) {
  return palette.find((f) => f.id === id);
}

export function hexOf(palette: Filament[], id: string) {
  return findFilament(palette, id)?.hex ?? null;
}

export function labelOf(palette: Filament[], id: string) {
  return findFilament(palette, id)?.label ?? id;
}

/** "negro,cian" → "Negro + Cian" */
export function colorLabels(palette: Filament[], color: string | null) {
  if (!color) return "";
  return color
    .split(",")
    .map((id) => labelOf(palette, id))
    .join(" + ");
}

export function availableFilaments(palette: Filament[]) {
  return palette.filter((f) => f.available);
}

/** Valida y limpia una paleta (de la base o del formulario del admin). */
export function normalizePalette(raw: unknown): Filament[] | null {
  if (!Array.isArray(raw)) return null;
  const out: Filament[] = [];
  for (const f of raw as Record<string, unknown>[]) {
    const id = typeof f?.id === "string" ? f.id : "";
    const label = typeof f?.label === "string" ? f.label.trim().slice(0, 40) : "";
    const hex = typeof f?.hex === "string" && /^#[0-9a-f]{6}$/i.test(f.hex) ? f.hex.toLowerCase() : "";
    if (!/^[a-z0-9-]{1,40}$/.test(id) || !label || !hex || out.some((o) => o.id === id)) continue;
    out.push({ id, label, hex, available: f.available !== false });
  }
  return out.length ? out : null;
}
