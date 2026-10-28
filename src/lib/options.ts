import type { LicenseId, OrderStatus } from "./types";

export const materials = [
  { id: "PLA", label: "PLA", hint: "Rígido y económico. Ideal para decoración." },
  { id: "PETG", label: "PETG", hint: "Más resistente al calor y a golpes." },
  { id: "TPU", label: "TPU (flexible)", hint: "Goma flexible: fundas, topes, juntas." },
  { id: "Resina", label: "Resina", hint: "Máximo detalle: miniaturas y joyería." },
] as const;

export const colors = [
  { id: "negro", label: "Negro", hex: "#111111" },
  { id: "blanco", label: "Blanco", hex: "#f5f5f5" },
  { id: "violeta", label: "Violeta", hex: "#a855f7" },
  { id: "cian", label: "Cian", hex: "#06b6d4" },
  { id: "magenta", label: "Magenta", hex: "#ec4899" },
  { id: "lima", label: "Lima", hex: "#84cc16" },
  { id: "naranja", label: "Naranja", hex: "#f97316" },
  { id: "gris", label: "Gris", hex: "#9ca3af" },
] as const;

export const sizes = [
  { id: "50", label: "Chico (50%)" },
  { id: "100", label: "Original (100%)" },
  { id: "150", label: "Grande (150%)" },
  { id: "custom", label: "Otro (indicar en notas)" },
] as const;

/**
 * Licencias que permiten vender impresiones. Las CC "NC" (no comercial) quedan afuera a propósito:
 * no podés cobrar por imprimir esos modelos sin permiso del autor.
 */
export const licenses: Record<LicenseId, { label: string; short: string; url?: string; needsAttribution: boolean }> = {
  cc0: { label: "Dominio público (CC0)", short: "CC0", url: "https://creativecommons.org/publicdomain/zero/1.0/", needsAttribution: false },
  "cc-by": { label: "Creative Commons Atribución (CC BY 4.0)", short: "CC BY", url: "https://creativecommons.org/licenses/by/4.0/", needsAttribution: true },
  "cc-by-sa": { label: "Creative Commons Atribución-CompartirIgual (CC BY-SA 4.0)", short: "CC BY-SA", url: "https://creativecommons.org/licenses/by-sa/4.0/", needsAttribution: true },
  commercial: { label: "Licencia comercial del autor", short: "Comercial", needsAttribution: true },
  own: { label: "Diseño propio", short: "Propio", needsAttribution: false },
  permission: { label: "Uso con permiso del autor", short: "Con permiso", needsAttribution: true },
};

export const orderStatuses: { id: OrderStatus; label: string }[] = [
  { id: "nuevo", label: "Nuevo" },
  { id: "cotizado", label: "Cotizado" },
  { id: "pagado", label: "Pagado" },
  { id: "imprimiendo", label: "Imprimiendo" },
  { id: "listo", label: "Listo" },
  { id: "entregado", label: "Entregado" },
  { id: "cancelado", label: "Cancelado" },
];
