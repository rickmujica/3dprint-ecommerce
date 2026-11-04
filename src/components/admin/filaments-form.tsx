"use client";

import { useActionState, useState } from "react";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";

import { updateFilaments, type AdminFormState } from "@/app/actions/admin";
import { FormError } from "@/components/order-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Filament } from "@/lib/palette";

/** Fila del editor: los filamentos nuevos no tienen id hasta guardarse (se genera del nombre). */
type Row = Omit<Filament, "id"> & { id: string; key: string };

export function FilamentsForm({ palette }: { palette: Filament[] }) {
  const [state, action, saving] = useActionState<AdminFormState & { ok?: boolean }, FormData>(updateFilaments, {});
  const [rows, setRows] = useState<Row[]>(palette.map((f) => ({ ...f, key: f.id })));

  const update = (key: string, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  return (
    <form action={action} className="space-y-4">
      <input
        type="hidden"
        name="filaments"
        value={JSON.stringify(rows.map(({ id, label, hex, available }) => ({ id, label, hex, available })))}
      />
      <ul className="divide-y-2 divide-foreground/10 rounded-xl border-2 border-foreground/10">
        {rows.map((r) => (
          <li key={r.key} className="flex flex-wrap items-center gap-3 p-3">
            <label className="relative size-10 shrink-0 cursor-pointer overflow-hidden rounded-full border-2 border-foreground/20" title="Cambiar color">
              <span className="absolute inset-0" style={{ backgroundColor: r.hex }} />
              <input
                type="color"
                value={r.hex}
                onChange={(e) => update(r.key, { hex: e.target.value })}
                className="absolute inset-0 cursor-pointer opacity-0"
                aria-label={`Color de ${r.label || "filamento nuevo"}`}
              />
            </label>
            <Input
              value={r.label}
              onChange={(e) => update(r.key, { label: e.target.value })}
              placeholder="Nombre (ej. Rojo seda)"
              aria-label="Nombre"
              className="min-w-40 flex-1"
            />
            <span className="w-20 font-mono text-xs text-muted-foreground">{r.hex}</span>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={r.available}
                onChange={(e) => update(r.key, { available: e.target.checked })}
                className="size-4 accent-primary"
              />
              Disponible
            </label>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Quitar ${r.label}`}
              onClick={() => setRows((prev) => prev.filter((x) => x.key !== r.key))}
            >
              <Trash2 />
            </Button>
          </li>
        ))}
      </ul>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          setRows((prev) => [...prev, { id: "", key: crypto.randomUUID(), label: "", hex: "#888888", available: true }])
        }
      >
        <Plus /> Agregar filamento
      </Button>
      <p className="text-xs text-muted-foreground">
        Mejor desmarcar &quot;Disponible&quot; que borrar: si borrás un filamento que usa algún modelo como color original,
        esa zona queda sin color hasta que la edites.
      </p>
      <FormError message={state.error} />
      {state.ok && <p role="status" className="text-sm font-medium text-primary">Filamentos guardados.</p>}
      <Button type="submit" variant="extrude" disabled={saving}>
        {saving ? <Loader2 className="animate-spin" /> : <Save />} Guardar filamentos
      </Button>
    </form>
  );
}
