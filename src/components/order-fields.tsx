"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useState } from "react";

import { missingColorsText, type MaterialType } from "@/lib/material-types";
import { colorModes, maxColors, sizes } from "@/lib/options";
import { availableFilaments, hexOf, labelOf, type Filament } from "@/lib/palette";
import { cn } from "@/lib/utils";

type Fields = Record<string, string> | undefined;

/**
 * Tipos de filamento que se pueden pedir (ya filtrados por disponibilidad, colores y modelo).
 * Controlado: si el tipo elegido deja de ofrecerse (p. ej. al llegar los datos actuales), queda marcado el primero.
 */
export function MaterialPicker({
  options,
  value,
  onChange,
}: {
  options: MaterialType[];
  value: string | undefined;
  onChange: (id: string) => void;
}) {
  const selected = options.some((m) => m.id === value) ? value : options[0]?.id;
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">Material</legend>
      <div className="grid grid-cols-2 gap-2">
        {options.map((m) => (
          <label
            key={m.id}
            className="cursor-pointer rounded-lg border-2 border-input p-3 transition-all hover:border-foreground/40 has-[:checked]:border-primary has-[:checked]:bg-primary/10 has-[:checked]:shadow-extrude-sm has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/30"
          >
            <input
              type="radio"
              name="material"
              value={m.id}
              checked={m.id === selected}
              onChange={() => onChange(m.id)}
              className="sr-only"
            />
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
 * La paleta llega filtrada por el tipo de filamento elegido: si el cliente cambia de material y un color
 * elegido no está en el nuevo, se quita y se avisa.
 */
export function ColorPicker({
  palette,
  defaultMode = "mono",
  defaultColors = [],
  onTint,
  onModeChange,
  allowMulti = true,
  materialLabel,
}: {
  palette: Filament[];
  /** Nombre del tipo de filamento elegido, para el aviso de colores que no hay. */
  materialLabel?: string;
  defaultMode?: string;
  defaultColors?: string[];
  onTint?: (hex: string | null) => void;
  onModeChange?: (mode: "mono" | "multi") => void;
  /** false: solo un color (modelos del catálogo sin zonas de color). */
  allowMulti?: boolean;
}) {
  const [mode, setModeState] = useState<"mono" | "multi">(allowMulti && defaultMode === "multi" ? "multi" : "mono");
  const setMode = (m: "mono" | "multi") => {
    setModeState(m);
    onModeChange?.(m);
  };
  const [picked, setPicked] = useState<string[]>(defaultColors);
  const [dropped, setDropped] = useState<string[]>([]);
  const colors = availableFilaments(palette);
  const colorKey = colors.map((c) => c.id).join(",");

  // Cambió el material: se quitan los colores elegidos que no hay en el nuevo (y se avisa cuáles).
  const [prevKey, setPrevKey] = useState(colorKey);
  if (prevKey !== colorKey) {
    setPrevKey(colorKey);
    const gone = picked.filter((id) => !colors.some((c) => c.id === id));
    if (gone.length) {
      setPicked(picked.filter((id) => !gone.includes(id)));
      setDropped(gone);
    }
  }

  // La vista previa se tiñe con el primer color elegido.
  const tintHex = picked[0] ? hexOf(palette, picked[0]) : null;
  useEffect(() => {
    onTint?.(tintHex);
  }, [tintHex, onTint]);

  const update = (next: string[]) => {
    setPicked(next);
    setDropped([]);
  };

  function toggle(id: string) {
    if (mode === "mono") return update([id]);
    if (picked.includes(id)) return update(picked.filter((p) => p !== id));
    if (picked.length < maxColors) update([...picked, id]);
  }

  const labels = picked.map((id) => colors.find((c) => c.id === id)?.label).filter(Boolean);

  return (
    <div className="space-y-3">
      {allowMulti && (
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
      )}
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
        {dropped.length > 0 && (
          <p role="status" className="text-xs font-medium text-destructive">
            {missingColorsText(
              materialLabel,
              dropped.map((id) => labelOf(palette, id)),
            )}
            : elegí otro color.
          </p>
        )}
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
