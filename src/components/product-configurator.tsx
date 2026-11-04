"use client";

import { useActionState, useCallback, useState } from "react";
import { BellRing, Loader2, Send } from "lucide-react";

import { createCatalogOrder, type OrderFormState } from "@/app/actions/orders";
import { ModelViewer } from "@/components/model-viewer";
import { CapacityNotice, isWaitlist, useCapacity } from "@/components/order-capacity";
import { ColorPicker, ContactFields, FormError, MaterialPicker, SizeAndQuantity } from "@/components/order-fields";
import { Button } from "@/components/ui/button";
import { ZoneColorPicker, type ZonePreview } from "@/components/zone-color-picker";
import { estimatePrice } from "@/lib/delivery";
import { materialsFor, type MaterialType } from "@/lib/material-types";
import type { Filament } from "@/lib/palette";
import type { Model } from "@/lib/types";

/** Visor + formulario de pedido. Elegir colores tiñe el modelo en vivo y recalcula precio y fecha. */
export function ProductConfigurator({
  model,
  palette,
  materialTypes,
  children,
}: {
  model: Model;
  palette: Filament[];
  materialTypes: MaterialType[];
  children: React.ReactNode;
}) {
  const [state, action, pending] = useActionState<OrderFormState, FormData>(createCatalogOrder, {});
  const [preview, setPreview] = useState<ZonePreview>({ mode: "mono", materialColors: null, tint: null });
  const [size, setSize] = useState(state.fields?.size ?? "100");
  const [quantity, setQuantity] = useState(Number(state.fields?.quantity ?? 1));
  const materialOptions = materialsFor(materialTypes, model.allowed_materials);
  const [material, setMaterial] = useState(state.fields?.material ?? materialOptions[0]?.id);
  const materialFactor = materialOptions.find((m) => m.id === material)?.price_factor ?? 1;
  const capacity = useCapacity();
  const waitlist = isWaitlist(capacity, state.full);
  const hasZones = model.color_zones.length > 0;

  const onTint = useCallback((hex: string | null) => setPreview({ mode: "mono", materialColors: null, tint: hex }), []);
  const price = capacity
    ? estimatePrice(model, { size, colorMode: preview.mode, quantity, materialFactor }, capacity.pricing)
    : undefined;

  return (
    <div className="grid gap-8 lg:grid-cols-[1.15fr_1fr] lg:gap-12">
      <div className="lg:sticky lg:top-24 lg:self-start">
        <div className="overflow-hidden rounded-2xl border-2 border-foreground bg-card shadow-extrude dark:border-extrude/60">
          <ModelViewer
            src={model.glb_url}
            alt={`Modelo 3D de ${model.title}`}
            poster={model.thumbnail_url}
            tint={preview.tint}
            materialColors={preview.materialColors}
            className="aspect-square w-full"
          />
        </div>
      </div>

      <div className="space-y-8">
        {children}

        <form
          action={action}
          onChange={(e) => {
            const data = new FormData(e.currentTarget);
            setSize(String(data.get("size") ?? "100"));
            setQuantity(Number(data.get("quantity")) || 1);
            setMaterial(String(data.get("material") ?? ""));
          }}
          className="space-y-6 rounded-2xl border-2 border-foreground/10 p-5 sm:p-6"
        >
          <h2 className="font-display text-xl font-semibold">Configurá tu impresión</h2>
          <input type="hidden" name="model_slug" value={model.slug} />
          <MaterialPicker options={materialOptions} defaultValue={state.fields?.material} />
          {hasZones ? (
            <ZoneColorPicker
              palette={palette}
              zones={model.color_zones}
              locked={model.colors_locked}
              fields={state.fields}
              onPreview={setPreview}
            />
          ) : (
            <ColorPicker
              palette={palette}
              allowMulti={false}
              defaultColors={state.fields?.color ? state.fields.color.split(",") : []}
              onTint={onTint}
            />
          )}
          <SizeAndQuantity fields={state.fields} />
          <ContactFields fields={state.fields} emailRequired={waitlist} />
          <CapacityNotice info={capacity} full={state.full} mode={preview.mode} price={price} />
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
