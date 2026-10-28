"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { colors, materials, sizes } from "@/lib/options";
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

export function ColorPicker({
  value,
  onChange,
  defaultValue,
}: {
  value?: string;
  onChange?: (id: string, hex: string) => void;
  defaultValue?: string;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">
        Color{value ? <span className="text-muted-foreground"> · {colors.find((c) => c.id === value)?.label}</span> : null}
      </legend>
      <div className="flex flex-wrap gap-2">
        {colors.map((c) => (
          <label key={c.id} className="cursor-pointer" title={c.label}>
            <input
              type="radio"
              name="color"
              value={c.id}
              className="peer sr-only"
              {...(onChange
                ? { checked: value === c.id, onChange: () => onChange(c.id, c.hex) }
                : { defaultChecked: defaultValue === c.id })}
            />
            <span
              className={cn(
                "block size-9 rounded-full border-2 border-foreground/20 transition-all",
                "peer-checked:scale-110 peer-checked:border-foreground peer-checked:shadow-extrude-sm peer-focus-visible:ring-[3px] peer-focus-visible:ring-ring/40",
              )}
              style={{ backgroundColor: c.hex }}
            />
            <span className="sr-only">{c.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
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

export function ContactFields({ fields }: { fields: Fields }) {
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
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" defaultValue={fields?.email} />
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
