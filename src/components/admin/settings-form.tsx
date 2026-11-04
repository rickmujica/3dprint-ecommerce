"use client";

import { useActionState } from "react";
import { Loader2, Save } from "lucide-react";

import { updateSettings, type AdminFormState } from "@/app/actions/admin";
import { FormError } from "@/components/order-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sizes } from "@/lib/options";
import type { ShopSettings } from "@/lib/types";

const dec = (n: number) => String(n).replace(".", ",");

export function SettingsForm({ settings }: { settings: ShopSettings }) {
  const [state, action, pending] = useActionState<AdminFormState & { ok?: boolean }, FormData>(updateSettings, {});

  return (
    <form action={action} className="space-y-6 rounded-2xl border-2 border-foreground/10 p-5 sm:p-6">
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          name="accepting_orders"
          defaultChecked={settings.accepting_orders}
          className="mt-1 size-5 accent-[var(--primary)]"
        />
        <span>
          <span className="block font-display font-semibold">Tomar pedidos</span>
          <span className="block text-sm text-muted-foreground">
            Apagalo para pausar los pedidos aunque haya lugar en la cola: los clientes ven el aviso de cola llena y pueden
            dejar su email.
          </span>
        </span>
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="max_queue">Cantidad tope de pedidos en cola</Label>
          <Input id="max_queue" name="max_queue" type="number" min={0} max={1000} step={1} required defaultValue={settings.max_queue} />
          <p className="text-xs text-muted-foreground">
            Cuentan los pedidos en estado Nuevo, Cotizado, Pagado e Imprimiendo. Al llegar al tope, los pedidos nuevos
            pasan a promesas de recontacto.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="prints_per_day">Impresiones posibles por día</Label>
          <Input
            id="prints_per_day"
            name="prints_per_day"
            inputMode="decimal"
            required
            defaultValue={dec(settings.prints_per_day)}
          />
          <p className="text-xs text-muted-foreground">
            Pedidos que se terminan por día. Usá decimales si un pedido tarda más de un día (0,5 = uno cada dos días).
          </p>
        </div>
      </div>

      <fieldset className="space-y-4 border-t-2 border-foreground/10 pt-5">
        <legend className="font-display font-semibold">Multicolor</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="multicolor_price_factor">Recargo de precio (multiplicador)</Label>
            <Input
              id="multicolor_price_factor"
              name="multicolor_price_factor"
              inputMode="decimal"
              required
              defaultValue={dec(settings.multicolor_price_factor)}
            />
            <p className="text-xs text-muted-foreground">
              1,5 = 50 % más caro que el precio base. Si un modelo tiene precio multicolor propio, se usa ese.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="multicolor_time_factor">Tiempo de impresión (multiplicador)</Label>
            <Input
              id="multicolor_time_factor"
              name="multicolor_time_factor"
              inputMode="decimal"
              required
              defaultValue={dec(settings.multicolor_time_factor)}
            />
            <p className="text-xs text-muted-foreground">
              2 = tarda el doble: un pedido multicolor ocupa 2 lugares en la cola y en el cálculo de la fecha.
            </p>
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4 border-t-2 border-foreground/10 pt-5">
        <legend className="font-display font-semibold">Precio según tamaño (multiplicador del precio base)</legend>
        <div className="grid grid-cols-3 gap-4">
          {sizes
            .filter((s) => s.id !== "custom")
            .map((s) => (
              <div key={s.id} className="space-y-2">
                <Label htmlFor={`size_${s.id}`}>{s.label}</Label>
                <Input
                  id={`size_${s.id}`}
                  name={`size_${s.id}`}
                  inputMode="decimal"
                  required
                  defaultValue={dec(settings.size_price_factors[s.id] ?? 1)}
                />
              </div>
            ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Ej.: 2 = el doble del precio base. El tamaño &quot;Otro&quot; siempre se cotiza a mano.
        </p>
      </fieldset>

      <FormError message={state.error} />
      {state.ok && <p role="status" className="text-sm font-medium text-primary">Ajustes guardados.</p>}
      <Button type="submit" variant="extrude" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : <Save />} Guardar ajustes
      </Button>
    </form>
  );
}
