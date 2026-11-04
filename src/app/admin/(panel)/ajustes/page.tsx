import { SettingsForm } from "@/components/admin/settings-form";
import { requireAdmin } from "@/lib/auth";
import { capacityInfo, formatDeliveryDate, getCapacity } from "@/lib/capacity";
import type { ShopSettings } from "@/lib/types";

export default async function SettingsPage() {
  const { supabase } = await requireAdmin();
  const [{ data, error }, capacity] = await Promise.all([
    supabase.from("shop_settings").select("accepting_orders, max_queue, prints_per_day").eq("id", true).maybeSingle(),
    getCapacity().catch(() => null),
  ]);
  const settings = data ? ({ ...data, prints_per_day: Number(data.prints_per_day) } as ShopSettings) : null;
  const info = capacity ? capacityInfo(capacity) : null;

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-3xl font-bold">Ajustes de capacidad</h1>
      {(error || !settings) && (
        <p className="text-destructive">
          No se pudieron leer los ajustes. ¿Corriste la migración <code>20261104000000_order_capacity.sql</code> en el SQL
          Editor de Supabase?
        </p>
      )}
      {capacity && info && (
        <p className="rounded-xl border-2 border-foreground/10 p-4 text-sm">
          Ahora hay <strong>{capacity.queue}</strong> pedido{capacity.queue === 1 ? "" : "s"} en cola (tope{" "}
          {capacity.max_queue}).{" "}
          {info.available ? (
            <>Un pedido nuevo tendría entrega estimada el <strong>{formatDeliveryDate(info.estimatedDelivery)}</strong>.</>
          ) : (
            <strong>Los pedidos nuevos van a promesas de recontacto.</strong>
          )}
        </p>
      )}
      {settings && <SettingsForm settings={settings} />}
    </div>
  );
}
