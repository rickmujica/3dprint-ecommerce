import Link from "next/link";
import { Download, Mail } from "lucide-react";

import { convertWaitlist, updateWaitlist } from "@/app/actions/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { requireAdmin } from "@/lib/auth";
import { capacityInfo, formatDeliveryDate, getCapacity } from "@/lib/capacity";
import { colorLabels, waitlistStatuses } from "@/lib/options";
import { site } from "@/lib/site";
import type { WaitlistEntry } from "@/lib/types";
import { cn, formatPrice } from "@/lib/utils";

const filters = [
  { id: "abiertas", label: "Abiertas", statuses: ["pendiente", "contactado"] },
  { id: "todas", label: "Todas", statuses: null },
] as const;

export default async function WaitlistPage({ searchParams }: PageProps<"/admin/recontacto">) {
  const { supabase } = await requireAdmin();
  const { filtro } = await searchParams;
  const filter = filters.find((f) => f.id === filtro) ?? filters[0];

  let query = supabase.from("waitlist").select("*").order("created_at", { ascending: true }).limit(300);
  if (filter.statuses) query = query.in("status", [...filter.statuses]);
  const [{ data, error }, capacity] = await Promise.all([query, getCapacity().catch(() => null)]);
  const entries = (data ?? []) as WaitlistEntry[];
  const info = capacity ? capacityInfo(capacity) : null;
  const freeSlots = capacity ? Math.max(0, capacity.max_queue - capacity.queue) : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Promesas de recontacto</h1>
          <p className="text-sm text-muted-foreground">Pedidos que llegaron con la cola llena, del más antiguo al más nuevo.</p>
        </div>
        <div className="flex gap-1">
          {filters.map((f) => (
            <Button key={f.id} asChild size="sm" variant={f.id === filter.id ? "default" : "ghost"}>
              <Link href={`/admin/recontacto?filtro=${f.id}`}>{f.label}</Link>
            </Button>
          ))}
        </div>
      </div>

      {capacity && info && (
        <p
          className={cn(
            "rounded-xl border-2 p-4 text-sm",
            info.available ? "border-primary/40 bg-primary/10" : "border-foreground/10",
          )}
        >
          {info.available ? (
            <>
              Hay <strong>{freeSlots}</strong> lugar{freeSlots === 1 ? "" : "es"} libre{freeSlots === 1 ? "" : "s"} en la
              cola. Si los convertís ahora, la próxima entrega estimada es el{" "}
              <strong>{formatDeliveryDate(info.estimatedDelivery)}</strong>.
            </>
          ) : capacity.accepting_orders ? (
            <>La cola está llena ({capacity.queue}/{capacity.max_queue}). Podés convertir igual, pero el pedido supera el tope.</>
          ) : (
            <>Los pedidos están pausados en <Link href="/admin/ajustes" className="underline">Ajustes</Link>.</>
          )}
        </p>
      )}

      {error && <p className="text-destructive">{error.message}</p>}
      {!error && entries.length === 0 && <p className="text-muted-foreground">No hay promesas de recontacto.</p>}

      <ul className="space-y-3">
        {entries.map((e) => {
          const mailto = `mailto:${e.email}?subject=${encodeURIComponent(`${site.name}: ya podemos tomar tu pedido`)}&body=${encodeURIComponent(
            `Hola ${e.customer_name}!\n\nTe escribimos porque se liberó un lugar en la cola de impresión y ya podemos tomar tu pedido${
              e.model_title ? ` de "${e.model_title}"` : ""
            }.${info?.available ? ` La fecha estimada de entrega sería el ${formatDeliveryDate(e.color_mode === "multi" ? info.estimatedDeliveryMulti : info.estimatedDelivery)}.` : ""}\n\n¿Lo confirmamos?\n\n${site.name}`,
          )}`;
          return (
            <li key={e.id} className="grid gap-4 rounded-xl border-2 border-foreground/10 p-4 md:grid-cols-[1fr_auto]">
              <div className="space-y-1 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={e.status === "pendiente" ? "accent" : "secondary"}>
                    {waitlistStatuses.find((s) => s.id === e.status)?.label}
                  </Badge>
                  <Badge variant="outline">{e.kind}</Badge>
                  <span className="text-muted-foreground">{new Date(e.created_at).toLocaleString("es")}</span>
                </div>
                <p className="font-display text-base font-semibold">{e.model_title ?? "Pedido a medida"}</p>
                <p>
                  {e.quantity} × {e.material}
                  {e.color_mode === "multi" ? " · multicolor" : ""}
                  {!e.color_zones?.length && e.color && ` · ${colorLabels(e.color)}`} · tamaño {e.size}
                </p>
                {e.color_zones && e.color_zones.length > 0 && (
                  <p className="text-muted-foreground">
                    {e.color_zones.map((z) => `${z.name}: ${colorLabels(z.color)}`).join(" · ")}
                  </p>
                )}
                {e.estimated_price != null && <p>Precio estimado: {formatPrice(e.estimated_price)}</p>}
                <p>
                  {e.customer_name} · <a href={`mailto:${e.email}`} className="underline-offset-4 hover:underline">{e.email}</a>
                  {e.phone && ` · ${e.phone}`}
                </p>
                {e.contacted_at && (
                  <p className="text-muted-foreground">Contactado el {new Date(e.contacted_at).toLocaleDateString("es")}</p>
                )}
                {e.notes && <p className="whitespace-pre-line text-muted-foreground">{e.notes}</p>}
                {e.reference_key && (
                  <a
                    href={`/api/admin/file?key=${encodeURIComponent(e.reference_key)}`}
                    target="_blank"
                    className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
                  >
                    <Download className="size-4" /> Ver referencia
                  </a>
                )}
              </div>
              {e.status !== "convertido" ? (
                <div className="flex flex-wrap items-end gap-2 md:flex-col md:items-stretch">
                  <Button asChild variant="outline" size="sm">
                    <a href={mailto}><Mail /> Escribirle</a>
                  </Button>
                  <form action={updateWaitlist} className="flex gap-2">
                    <input type="hidden" name="id" value={e.id} />
                    <NativeSelect name="status" defaultValue={e.status} aria-label="Estado">
                      {waitlistStatuses
                        .filter((s) => s.id !== "convertido")
                        .map((s) => (
                          <option key={s.id} value={s.id}>{s.label}</option>
                        ))}
                    </NativeSelect>
                    <Button type="submit" size="sm" variant="ghost">Guardar</Button>
                  </form>
                  <form action={convertWaitlist}>
                    <input type="hidden" name="id" value={e.id} />
                    <Button type="submit" size="sm" variant="extrude" className="w-full">Pasar a pedidos</Button>
                  </form>
                </div>
              ) : (
                <Link href="/admin" className="self-start text-sm text-primary underline-offset-4 hover:underline">
                  Ver en pedidos
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
