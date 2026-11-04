import type { ShopSettings } from "./types";

/** Zona horaria del taller: las fechas de entrega se calculan en hora de Paraguay. */
export const shopTimeZone = "America/Asuncion";

export type Capacity = ShopSettings & { queue: number };

export type CapacityInfo = {
  /** Se pueden tomar pedidos ahora (interruptor encendido y cola por debajo del tope). */
  available: boolean;
  /** Pedidos en cola antes del que se haga ahora. */
  queue: number;
  /** Fecha estimada de entrega para un pedido nuevo, YYYY-MM-DD. */
  estimatedDelivery: string;
};

export function hasRoom(c: Capacity) {
  return c.accepting_orders && c.queue < c.max_queue;
}

/** Fecha de hoy (YYYY-MM-DD) en la zona del taller. */
export function todayInShop(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: shopTimeZone }).format(now);
}

function addDays(isoDate: string, days: number) {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/**
 * Fecha estimada para un pedido que entra detrás de `queue` pedidos.
 * Con 3 pedidos en cola y 2 impresiones por día, el nuevo es el 4.º: ceil(4 / 2) = 2 días.
 */
export function estimateDelivery(queue: number, printsPerDay: number, now = new Date()) {
  const days = Math.max(1, Math.ceil((queue + 1) / printsPerDay));
  return addDays(todayInShop(now), days);
}

export function capacityInfo(c: Capacity): CapacityInfo {
  return { available: hasRoom(c), queue: c.queue, estimatedDelivery: estimateDelivery(c.queue, c.prints_per_day) };
}

/** "lunes 10 de noviembre" */
export function formatDeliveryDate(isoDate: string) {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Intl.DateTimeFormat("es-PY", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(
    new Date(Date.UTC(y, m - 1, d)),
  );
}
