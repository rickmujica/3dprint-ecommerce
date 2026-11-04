import Link from "next/link";
import { CalendarClock, Download } from "lucide-react";

import { updateOrder } from "@/app/actions/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { requireAdmin } from "@/lib/auth";
import { colorLabels } from "@/lib/palette";
import { materialLabel } from "@/lib/material-types";
import { fetchMaterialTypes, fetchPalette } from "@/lib/palette-server";
import { capacityInfo, formatDeliveryDate, getCapacity } from "@/lib/capacity";
import { orderStatuses, queuedStatuses } from "@/lib/options";
import type { Order, OrderStatus } from "@/lib/types";
import { formatPrice } from "@/lib/utils";

const filters = [
  { id: "cola", label: "En cola" },
  ...orderStatuses.map((s) => ({ id: s.id, label: s.label })),
  { id: "todos", label: "Todos" },
];

export default async function OrdersPage({ searchParams }: PageProps<"/admin">) {
  const { supabase } = await requireAdmin();
  const { estado } = await searchParams;
  const filter = filters.find((f) => f.id === estado) ?? filters[0];

  let query = supabase.from("orders").select("*").limit(300);
  // La cola se ve en orden de llegada (el próximo a imprimir arriba); el resto, del más nuevo al más viejo.
  query =
    filter.id === "cola"
      ? query.in("status", queuedStatuses).order("created_at", { ascending: true })
      : query.order("created_at", { ascending: false });
  if (filter.id !== "cola" && filter.id !== "todos") query = query.eq("status", filter.id as OrderStatus);

  const [{ data, error }, capacity, palette, materialTypes, { count: waiting }] = await Promise.all([
    query,
    getCapacity().catch(() => null),
    fetchPalette(),
    fetchMaterialTypes(),
    supabase.from("waitlist").select("id", { count: "exact", head: true }).eq("status", "pendiente"),
  ]);
  const orders = (data ?? []) as Order[];
  const info = capacity ? capacityInfo(capacity) : null;

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Pedidos</h1>

      {capacity && info && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="En cola" value={`${capacity.queue} / ${capacity.max_queue}`} hint={capacity.accepting_orders ? "tope de cola" : "pedidos pausados"} />
          <Stat
            label="Próxima entrega estimada"
            value={info.available ? formatDeliveryDate(info.estimatedDelivery) : "Cola llena"}
            hint={`${String(capacity.prints_per_day).replace(".", ",")} por día · `}
            link={{ href: "/admin/ajustes", label: "ajustes" }}
          />
          <Stat
            label="Promesas de recontacto"
            value={String(waiting ?? 0)}
            hint="pendientes · "
            link={{ href: "/admin/recontacto", label: "ver" }}
          />
        </div>
      )}

      <nav aria-label="Filtrar por estado" className="flex flex-wrap gap-1">
        {filters.map((f) => (
          <Button key={f.id} asChild size="sm" variant={f.id === filter.id ? "default" : "ghost"}>
            <Link href={`/admin?estado=${f.id}`}>{f.label}</Link>
          </Button>
        ))}
      </nav>

      {error && <p className="text-destructive">{error.message}</p>}
      {!error && orders.length === 0 && <p className="text-muted-foreground">No hay pedidos con este filtro.</p>}
      <ul className="space-y-3">
        {orders.map((o) => (
          <li key={o.id} className="grid gap-4 rounded-xl border-2 border-foreground/10 p-4 md:grid-cols-[1fr_auto]">
            <div className="space-y-1 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono font-bold">{o.code}</span>
                <Badge variant={o.kind === "personalizado" ? "accent" : "secondary"}>{o.kind}</Badge>
                <span className="text-muted-foreground">{new Date(o.created_at).toLocaleString("es")}</span>
              </div>
              <p className="font-display text-base font-semibold">{o.model_title ?? "Pedido a medida"}</p>
              <p>
                {o.quantity} × {materialLabel(materialTypes, o.material)}
                {o.color_mode === "multi" ? " · multicolor" : ""}
                {!o.color_zones?.length && o.color && ` · ${colorLabels(palette, o.color)}`} · tamaño {o.size}
              </p>
              {o.color_zones && o.color_zones.length > 0 && (
                <p className="text-muted-foreground">
                  {o.color_zones.map((z) => `${z.name}: ${colorLabels(palette, z.color)}`).join(" · ")}
                </p>
              )}
              {o.estimated_price != null && <p>Precio estimado: {formatPrice(o.estimated_price)}</p>}
              {o.estimated_delivery && (
                <p className="flex items-center gap-1.5">
                  <CalendarClock className="size-4 text-primary" /> Entrega estimada: {formatDeliveryDate(o.estimated_delivery)}
                </p>
              )}
              <p>
                {o.customer_name} · {[o.phone, o.email].filter(Boolean).join(" · ")}
              </p>
              {o.notes && <p className="whitespace-pre-line text-muted-foreground">{o.notes}</p>}
              {o.reference_key && (
                <a
                  href={`/api/admin/file?key=${encodeURIComponent(o.reference_key)}`}
                  target="_blank"
                  className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
                >
                  <Download className="size-4" /> Ver referencia
                </a>
              )}
            </div>
            <form action={updateOrder} className="flex items-end gap-2 md:flex-col md:items-stretch">
              <input type="hidden" name="id" value={o.id} />
              <NativeSelect name="status" defaultValue={o.status} aria-label="Estado">
                {orderStatuses.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </NativeSelect>
              <Input name="quote_amount" inputMode="numeric" placeholder={o.estimated_price != null ? `Cotización (est. ${o.estimated_price})` : "Cotización"} defaultValue={o.quote_amount ?? ""} aria-label="Cotización" />
              <Button type="submit" size="sm">Guardar</Button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Stat({ label, value, hint, link }: { label: string; value: string; hint: string; link?: { href: string; label: string } }) {
  return (
    <div className="rounded-xl border-2 border-foreground/10 p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="font-display text-xl font-semibold first-letter:uppercase">{value}</p>
      <p className="text-xs text-muted-foreground">
        {hint}
        {link && (
          <Link href={link.href} className="text-primary underline-offset-4 hover:underline">{link.label}</Link>
        )}
      </p>
    </div>
  );
}
