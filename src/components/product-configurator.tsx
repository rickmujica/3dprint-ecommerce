"use client";

import { useActionState, useState } from "react";
import { BellRing, Loader2, Send } from "lucide-react";

import { createCatalogOrder, type OrderFormState } from "@/app/actions/orders";
import { ModelViewer } from "@/components/model-viewer";
import { CapacityNotice, isWaitlist, useCapacity } from "@/components/order-capacity";
import { ColorPicker, ContactFields, FormError, MaterialPicker, SizeAndQuantity } from "@/components/order-fields";
import { Button } from "@/components/ui/button";
import type { Model } from "@/lib/types";

/** Visor + formulario de pedido. Elegir un color tiñe el modelo en vivo. */
export function ProductConfigurator({ model, children }: { model: Model; children: React.ReactNode }) {
  const [state, action, pending] = useActionState<OrderFormState, FormData>(createCatalogOrder, {});
  const [tint, setTint] = useState<string | null>(null);
  const capacity = useCapacity();
  const waitlist = isWaitlist(capacity, state.full);

  return (
    <div className="grid gap-8 lg:grid-cols-[1.15fr_1fr] lg:gap-12">
      <div className="lg:sticky lg:top-24 lg:self-start">
        <div className="overflow-hidden rounded-2xl border-2 border-foreground bg-card shadow-extrude dark:border-extrude/60">
          <ModelViewer
            src={model.glb_url}
            alt={`Modelo 3D de ${model.title}`}
            poster={model.thumbnail_url}
            tint={tint}
            className="aspect-square w-full"
          />
        </div>
      </div>

      <div className="space-y-8">
        {children}

        <form action={action} className="space-y-6 rounded-2xl border-2 border-foreground/10 p-5 sm:p-6">
          <h2 className="font-display text-xl font-semibold">Configurá tu impresión</h2>
          <input type="hidden" name="model_slug" value={model.slug} />
          <MaterialPicker defaultValue={state.fields?.material} />
          <ColorPicker
            defaultMode={state.fields?.color_mode}
            defaultColors={state.fields?.color ? state.fields.color.split(",") : []}
            onTint={setTint}
          />
          <SizeAndQuantity fields={state.fields} />
          <ContactFields fields={state.fields} emailRequired={waitlist} />
          <CapacityNotice info={capacity} full={state.full} />
          <FormError message={state.error} />
          <Button type="submit" variant="extrude" size="lg" className="w-full" disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : waitlist ? <BellRing /> : <Send />}
            {waitlist ? "Avisame cuando haya lugar" : "Pedir cotización"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            No cobramos nada todavía: te confirmamos precio y plazo antes de imprimir.
          </p>
        </form>
      </div>
    </div>
  );
}
