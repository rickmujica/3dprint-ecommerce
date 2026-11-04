import { SettingsForm } from "@/components/admin/settings-form";
import { requireAdmin } from "@/lib/auth";
import { capacityInfo, formatDeliveryDate, getCapacity, normalizeSettings } from "@/lib/capacity";

export default async function SettingsPage() {
  const { supabase } = await requireAdmin();
  const [{ data, error }, capacity] = await Promise.all([
    supabase.from("shop_settings").select("*").eq("id", true).maybeSingle(),
    getCapacity().catch(() => null),
  ]);
  const settings = data ? normalizeSettings(data) : null;
  const info = capacity ? capacityInfo(capacity) : null;

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-3xl font-bold">Ajustes de capacidad y precios</h1>
      {(error || !settings) && (
        <p className="text-destructive">
          No se pudieron leer los ajustes. ¿Corriste las migraciones <code>20261104000000_order_capacity.sql</code> y{" "}
          <code>20261105000000_multicolor_pricing.sql</code> en el SQL Editor de Supabase?
        </p>
      )}
      {capacity && info && (
        <p className="rounded-xl border-2 border-foreground/10 p-4 text-sm">
          Ahora hay <strong>{String(capacity.queue).replace(".", ",")}</strong> lugar{capacity.queue === 1 ? "" : "es"} ocupado
          {capacity.queue === 1 ? "" : "s"} en la cola (tope {capacity.max_queue}).{" "}
          {info.available ? (
            <>
              Un pedido nuevo de un color tendría entrega estimada el{" "}
              <strong>{formatDeliveryDate(info.estimatedDelivery)}</strong>; uno multicolor, el{" "}
              <strong>{formatDeliveryDate(info.estimatedDeliveryMulti)}</strong>.
            </>
          ) : (
            <strong>Los pedidos nuevos van a promesas de recontacto.</strong>
          )}
        </p>
      )}
      {settings && <SettingsForm settings={settings} />}
    </div>
  );
}
