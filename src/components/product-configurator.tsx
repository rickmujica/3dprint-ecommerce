"use client";

import { useActionState, useState } from "react";
import { Loader2, Send } from "lucide-react";

import { createCatalogOrder, type OrderFormState } from "@/app/actions/orders";
import { ModelViewer } from "@/components/model-viewer";
import { ColorPicker, ContactFields, FormError, MaterialPicker, SizeAndQuantity } from "@/components/order-fields";
import { Button } from "@/components/ui/button";
import type { Model } from "@/lib/types";

/** Visor + formulario de pedido. Elegir un color tiñe el modelo en vivo. */
export function ProductConfigurator({ model, children }: { model: Model; children: React.ReactNode }) {
  const [state, action, pending] = useActionState<OrderFormState, FormData>(createCatalogOrder, {});
  const [color, setColor] = useState<{ id: string; hex: string } | null>(null);

  return (
    <div className="grid gap-8 lg:grid-cols-[1.15fr_1fr] lg:gap-12">
      <div className="lg:sticky lg:top-24 lg:self-start">
        <div className="overflow-hidden rounded-2xl border-2 border-foreground bg-card shadow-extrude dark:border-extrude/60">
          <ModelViewer
            src={model.glb_url}
            alt={`Modelo 3D de ${model.title}`}
            poster={model.thumbnail_url}
            tint={color?.hex}
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
          <ColorPicker value={color?.id} onChange={(id, hex) => setColor({ id, hex })} />
          <SizeAndQuantity fields={state.fields} />
          <ContactFields fields={state.fields} />
          <FormError message={state.error} />
          <Button type="submit" variant="extrude" size="lg" className="w-full" disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : <Send />}
            Pedir cotización
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            No cobramos nada todavía: te confirmamos precio y plazo antes de imprimir.
          </p>
        </form>
      </div>
    </div>
  );
}
