import type { ColorMode, ShopSettings } from "./types";

/** Zona horaria del taller: las fechas de entrega se calculan en hora de Paraguay. */
export const shopTimeZone = "America/Asuncion";

/** Ajustes + carga actual de la cola (en lugares: un multicolor ocupa multicolor_time_factor). */
export type Capacity = ShopSettings & { queue: number };

export type PriceSettings = Pick<ShopSettings, "multicolor_price_factor" | "size_price_factors">;

export type CapacityInfo = {
  /** Se pueden tomar pedidos ahora (interruptor encendido y cola por debajo del tope). */
  available: boolean;
  /** Lugares ocupados en la cola. */
  queue: number;
  /** Fecha estimada de entrega (YYYY-MM-DD) para un pedido nuevo de un color… */
  estimatedDelivery: string;
  /** …y para uno multicolor, que tarda más. */
  estimatedDeliveryMulti: string;
  pricing: PriceSettings;
};

export const defaultSettings: ShopSettings = {
  accepting_orders: true,
  max_queue: 10,
  prints_per_day: 1,
  multicolor_time_factor: 2,
  multicolor_price_factor: 1.5,
  size_price_factors: { "50": 0.6, "100": 1, "150": 2 },
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
 * Fecha estimada para un pedido que ocupa `weight` lugares y entra detrás de `queue` lugares ocupados.
 * Con 3 lugares en cola y 2 impresiones por día, uno de un color termina en ceil(4 / 2) = 2 días;
 * uno multicolor (2 lugares), en ceil(5 / 2) = 3 días.
 */
export function estimateDelivery(queue: number, printsPerDay: number, weight = 1, now = new Date()) {
  const days = Math.max(1, Math.ceil((queue + weight) / printsPerDay));
  return addDays(todayInShop(now), days);
}

export function capacityInfo(c: Capacity): CapacityInfo {
  return {
    available: hasRoom(c),
    queue: c.queue,
    estimatedDelivery: estimateDelivery(c.queue, c.prints_per_day),
    estimatedDeliveryMulti: estimateDelivery(c.queue, c.prints_per_day, c.multicolor_time_factor),
    pricing: { multicolor_price_factor: c.multicolor_price_factor, size_price_factors: c.size_price_factors },
  };
}

export function deliveryFor(info: CapacityInfo, mode: ColorMode) {
  return mode === "multi" ? info.estimatedDeliveryMulti : info.estimatedDelivery;
}

/**
 * Precio estimado total. null si el modelo no tiene precio o el tamaño es "otro" (se cotiza a mano).
 * Se redondea a miles de guaraníes.
 */
export function estimatePrice(
  model: { base_price: number | null; multicolor_price: number | null },
  choice: { size: string; colorMode: ColorMode; quantity: number },
  pricing: PriceSettings,
) {
  if (model.base_price == null) return null;
  const sizeFactor = pricing.size_price_factors[choice.size];
  if (sizeFactor == null) return null;
  const unit =
    choice.colorMode === "multi"
      ? (model.multicolor_price ?? model.base_price * pricing.multicolor_price_factor)
      : model.base_price;
  const qty = Number.isInteger(choice.quantity) && choice.quantity > 0 ? choice.quantity : 1;
  return Math.round((unit * sizeFactor) / 1000) * 1000 * qty;
}

/** "lunes 10 de noviembre" */
export function formatDeliveryDate(isoDate: string) {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Intl.DateTimeFormat("es-PY", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(
    new Date(Date.UTC(y, m - 1, d)),
  );
}
