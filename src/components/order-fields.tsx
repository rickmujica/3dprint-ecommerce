"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";

import { colorModes, colors, materials, maxColors, sizes } from "@/lib/options";
import { cn } from "@/lib/utils";

type Fields = Record<string, string> | undefined;

export function MaterialPicker({ defaultValue = "PLA" }: { defaultValue?: string }) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">Material</legend>
      <div className="grid grid-cols-2 gap-2">
        {materials.map((m) => (
          <label
            key={m.id}
            className="cursor-pointer rounded-lg border-2 border-input p-3 transition-all hover:border-foreground/40 has-[:checked]:border-primary has-[:checked]:bg-primary/10 has-[:checked]:shadow-extrude-sm has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/30"
          >
            <input type="radio" name="material" value={m.id} defaultChecked={m.id === defaultValue} className="sr-only" />
            <span className="block font-display text-sm font-semibold">{m.label}</span>
            <span className="block text-xs text-muted-foreground">{m.hint}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * Un color o multicolor. En multicolor se eligen de 2 a `maxColors` colores.
 * `onTint` avisa el color con el que teñir la vista previa (el primero elegido).
 */
export function ColorPicker({
  defaultMode = "mono",
  defaultColors = [],
  onTint,
}: {
  defaultMode?: string;
  defaultColors?: string[];
  onTint?: (hex: string | null) => void;
}) {
  const [mode, setMode] = useState(defaultMode === "multi" ? "multi" : "mono");
  const [picked, setPicked] = useState<string[]>(defaultColors);

  function update(next: string[]) {
    setPicked(next);
    onTint?.(colors.find((c) => c.id === next[0])?.hex ?? null);
  }

  function toggle(id: string) {
    if (mode === "mono") return update([id]);
    if (picked.includes(id)) return update(picked.filter((p) => p !== id));
    if (picked.length < maxColors) update([...picked, id]);
  }

  const labels = picked.map((id) => colors.find((c) => c.id === id)?.label).filter(Boolean);

  return (
    <div className="space-y-3">
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Colores</legend>
        <div className="grid grid-cols-2 gap-2">
          {colorModes.map((m) => (
            <label
              key={m.id}
              className="cursor-pointer rounded-lg border-2 border-input p-3 transition-all hover:border-foreground/40 has-[:checked]:border-primary has-[:checked]:bg-primary/10 has-[:checked]:shadow-extrude-sm has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/30"
            >
              <input
                type="radio"
                name="color_mode"
                value={m.id}
                checked={mode === m.id}
                onChange={() => {
                  setMode(m.id);
                  if (m.id === "mono") update(picked.slice(0, 1));
                }}
                className="sr-only"
              />
              <span className="block font-display text-sm font-semibold">{m.label}</span>
              <span className="block text-xs text-muted-foreground">{m.hint}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">
          {mode === "multi" ? `Elegí de 2 a ${maxColors} colores` : "Color"}
          {labels.length > 0 && <span className="text-muted-foreground"> · {labels.join(" + ")}</span>}
        </legend>
        <div className="flex flex-wrap gap-2">
          {colors.map((c) => {
            const checked = picked.includes(c.id);
            const order = picked.indexOf(c.id);
            return (
              <label key={c.id} className="relative cursor-pointer" title={c.label}>
                <input
                  type={mode === "multi" ? "checkbox" : "radio"}
                  name="color"
                  value={c.id}
                  checked={checked}
                  onChange={() => toggle(c.id)}
                  disabled={mode === "multi" && !checked && picked.length >= maxColors}
                  className="peer sr-only"
                />
                <span
                  className={cn(
                    "block size-9 rounded-full border-2 border-foreground/20 transition-all",
                    "peer-checked:scale-110 peer-checked:border-foreground peer-checked:shadow-extrude-sm peer-focus-visible:ring-[3px] peer-focus-visible:ring-ring/40 peer-disabled:opacity-40",
                  )}
                  style={{ backgroundColor: c.hex }}
                />
                {mode === "multi" && checked && (
                  <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-foreground text-[10px] font-bold text-background">
                    {order + 1}
                  </span>
                )}
                <span className="sr-only">{c.label}</span>
              </label>
            );
          })}
        </div>
        {mode === "multi" && (
          <p className="text-xs text-muted-foreground">Contanos en las notas qué parte va de cada color.</p>
        )}
      </fieldset>
    </div>
  );
}

export function SizeAndQuantity({ fields }: { fields: Fields }) {
  return (
    <div className="grid grid-cols-[1fr_7rem] gap-3">
      <div className="space-y-2">
        <Label htmlFor="size">Tamaño</Label>
        <NativeSelect id="size" name="size" defaultValue={fields?.size ?? "100"}>
          {sizes.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="space-y-2">
        <Label htmlFor="quantity">Cantidad</Label>
        <Input id="quantity" name="quantity" type="number" min={1} max={100} defaultValue={fields?.quantity ?? "1"} />
      </div>
    </div>
  );
}

export function ContactFields({ fields, emailRequired = false }: { fields: Fields; emailRequired?: boolean }) {
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="customer_name">Nombre</Label>
        <Input id="customer_name" name="customer_name" autoComplete="name" required defaultValue={fields?.customer_name} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="phone">WhatsApp / teléfono</Label>
          <Input id="phone" name="phone" type="tel" autoComplete="tel" defaultValue={fields?.phone} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email{emailRequired && <span className="text-muted-foreground"> (para avisarte)</span>}</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required={emailRequired} defaultValue={fields?.email} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Notas (opcional)</Label>
        <Textarea id="notes" name="notes" rows={3} placeholder="Fecha que lo necesitás, detalles de acabado, etc." defaultValue={fields?.notes} />
      </div>
      {/* Trampa anti-bots */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
    </div>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-lg border-2 border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {message}
    </p>
  );
}
