import { Download } from "lucide-react";

import { updateOrder } from "@/app/actions/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { requireAdmin } from "@/lib/auth";
import { colors, orderStatuses } from "@/lib/options";
import type { Order } from "@/lib/types";

export default async function OrdersPage() {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(200);
  const orders = (data ?? []) as Order[];

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Pedidos</h1>
      {error && <p className="text-destructive">{error.message}</p>}
      {orders.length === 0 && <p className="text-muted-foreground">Todavía no hay pedidos.</p>}
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
                {o.quantity} × {o.material}
                {o.color && ` · ${colors.find((c) => c.id === o.color)?.label ?? o.color}`} · tamaño {o.size}
              </p>
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
              <Input name="quote_amount" inputMode="numeric" placeholder="Cotización" defaultValue={o.quote_amount ?? ""} aria-label="Cotización" />
              <Button type="submit" size="sm">Guardar</Button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
