"use client";

import { useActionState, useState } from "react";
import { ImagePlus, Loader2, Send } from "lucide-react";

import { createCustomOrder, type OrderFormState } from "@/app/actions/orders";
import { ColorPicker, ContactFields, FormError, MaterialPicker, SizeAndQuantity } from "@/components/order-fields";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function CustomOrderForm() {
  const [state, action, pending] = useActionState<OrderFormState, FormData>(createCustomOrder, {});
  const [preview, setPreview] = useState<string | null>(null);

  return (
    <form action={action} className="space-y-6 rounded-2xl border-2 border-foreground bg-card p-5 shadow-extrude sm:p-8 dark:border-extrude/60">
      <div className="space-y-2">
        <Label htmlFor="description">¿Qué querés imprimir?</Label>
        <Textarea
          id="description"
          name="description"
          rows={4}
          required
          placeholder="Ej: una figura de mi perro sentado, de unos 10 cm, como la foto."
          defaultValue={state.fields?.description}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="photo">Foto o boceto de referencia (opcional)</Label>
        <label
          htmlFor="photo"
          className="flex cursor-pointer items-center gap-4 rounded-xl border-2 border-dashed border-foreground/25 p-4 transition-colors hover:border-primary hover:bg-primary/5"
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Vista previa de la referencia" className="size-20 rounded-lg object-cover" />
          ) : (
            <span className="flex size-20 items-center justify-center rounded-lg bg-muted">
              <ImagePlus className="size-8 text-muted-foreground" />
            </span>
          )}
          <span className="text-sm text-muted-foreground">
            JPG, PNG o WebP hasta 8 MB. Mientras más ángulos, mejor: el resto mandalo por WhatsApp.
          </span>
        </label>
        <input
          id="photo"
          name="photo"
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            setPreview(file ? URL.createObjectURL(file) : null);
          }}
        />
      </div>

      <MaterialPicker defaultValue={state.fields?.material} />
      <ColorPicker defaultValue={state.fields?.color} />
      <SizeAndQuantity fields={state.fields} />
      <ContactFields fields={state.fields} />
      <FormError message={state.error} />
      <Button type="submit" variant="extrude" size="lg" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : <Send />}
        Enviar pedido personalizado
      </Button>
    </form>
  );
}
