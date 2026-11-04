import { defaultSettings, type Capacity } from "./delivery";
import { hasSupabase } from "./supabase/env";
import { createPublicClient } from "./supabase/public";

export * from "./delivery";

/** Lee ajustes y carga de la cola. Sin Supabase (modo demo) siempre hay lugar. */
export async function getCapacity(): Promise<Capacity> {
  if (!hasSupabase) return { ...defaultSettings, queue: 0 };
  const { data, error } = await createPublicClient().rpc("order_capacity");
  if (error || !data) throw new Error(error?.message ?? "Sin ajustes de capacidad");
  return normalizeSettings(data as Record<string, unknown>);
}

/** Supabase devuelve los numeric como string o number según el caso: los pasamos a number. */
export function normalizeSettings(d: Record<string, unknown>): Capacity {
  const factors = (d.size_price_factors ?? defaultSettings.size_price_factors) as Record<string, unknown>;
  return {
    accepting_orders: Boolean(d.accepting_orders),
    max_queue: Number(d.max_queue),
    prints_per_day: Number(d.prints_per_day),
    queue: Number(d.queue ?? 0),
    multicolor_time_factor: Number(d.multicolor_time_factor ?? defaultSettings.multicolor_time_factor),
    multicolor_price_factor: Number(d.multicolor_price_factor ?? defaultSettings.multicolor_price_factor),
    size_price_factors: Object.fromEntries(Object.entries(factors).map(([k, v]) => [k, Number(v)])),
  };
}
