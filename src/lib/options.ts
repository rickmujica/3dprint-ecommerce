import type { ColorMode, LicenseId, OrderStatus, WaitlistStatus } from "./types";

export const colorModes: { id: ColorMode; label: string; hint: string }[] = [
  { id: "mono", label: "Un color", hint: "La pieza entera en un solo filamento." },
  { id: "multi", label: "Multicolor", hint: "Hasta 4 colores en la misma pieza." },
];

/** Máximo de colores en una impresión multicolor (cantidad de filamentos que carga la impresora a la vez). */
export const maxColors = 4;

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

/** Estados que ocupan lugar en la cola de la impresora (igual que private.queue_size() en la base). */
export const queuedStatuses: OrderStatus[] = ["nuevo", "cotizado", "pagado", "imprimiendo"];

export const waitlistStatuses: { id: WaitlistStatus; label: string }[] = [
  { id: "pendiente", label: "Pendiente" },
  { id: "contactado", label: "Contactado" },
  { id: "convertido", label: "Convertido en pedido" },
  { id: "descartado", label: "Descartado" },
];
