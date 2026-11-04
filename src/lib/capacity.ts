import { hasSupabase } from "./supabase/env";
import { createPublicClient } from "./supabase/public";
import type { Capacity } from "./delivery";

export * from "./delivery";

const demoCapacity: Capacity = { accepting_orders: true, max_queue: 10, prints_per_day: 1, queue: 0 };

/** Lee ajustes y tamaño de la cola. Sin Supabase (modo demo) siempre hay lugar. */
export async function getCapacity(): Promise<Capacity> {
  if (!hasSupabase) return demoCapacity;
  const { data, error } = await createPublicClient().rpc("order_capacity");
  if (error || !data) throw new Error(error?.message ?? "Sin ajustes de capacidad");
  const c = data as Capacity;
  return { ...c, prints_per_day: Number(c.prints_per_day), queue: Number(c.queue) };
}
