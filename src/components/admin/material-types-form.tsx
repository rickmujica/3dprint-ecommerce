"use client";

import { useActionState, useState } from "react";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";

import { updateMaterialTypes, type AdminFormState } from "@/app/actions/admin";
import { FormError } from "@/components/order-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { MaterialType } from "@/lib/material-types";

/** Fila del editor: los tipos nuevos no tienen id hasta guardarse (se genera del nombre). */
type Row = Omit<MaterialType, "price_factor"> & { price_factor: string; key: string };

export function MaterialTypesForm({ types }: { types: MaterialType[] }) {
  const [state, action, saving] = useActionState<AdminFormState & { ok?: boolean }, FormData>(updateMaterialTypes, {});
  const [rows, setRows] = useState<Row[]>(
    types.map((t) => ({ ...t, price_factor: String(t.price_factor).replace(".", ","), key: t.id })),
  );

  const update = (key: string, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  return (
    <form action={action} className="space-y-4">
      <input
        type="hidden"
        name="material_types"
        value={JSON.stringify(rows.map(({ id, label, hint, price_factor, available }) => ({ id, label, hint, price_factor, available })))}
      />
      <ul className="divide-y-2 divide-foreground/10 rounded-xl border-2 border-foreground/10">
        {rows.map((r) => (
          <li key={r.key} className="grid gap-2 p-3 sm:grid-cols-[10rem_1fr_6rem_auto_auto] sm:items-center">
            <Input
              value={r.label}
              onChange={(e) => update(r.key, { label: e.target.value })}
              placeholder="Nombre (ej. PLA seda)"
              aria-label="Nombre"
            />
            <Input
              value={r.hint}
              onChange={(e) => update(r.key, { hint: e.target.value })}
              placeholder="Descripción corta para el cliente"
              aria-label="Descripción"
            />
            <Input
              value={r.price_factor}
              onChange={(e) => update(r.key, { price_factor: e.target.value })}
              inputMode="decimal"
              aria-label="Multiplicador de precio"
              title="Multiplicador de precio (1 = precio base, 1,3 = 30 % más)"
              placeholder="×1"
            />
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
          setRows((prev) => [
            ...prev,
            { id: "", key: crypto.randomUUID(), label: "", hint: "", price_factor: "1", available: true },
          ])
        }
      >
        <Plus /> Agregar tipo
      </Button>
      <p className="text-xs text-muted-foreground">
        El multiplicador ajusta el precio del modelo para ese tipo: 1 = precio base, 1,3 = 30 % más caro. Mejor desmarcar
        &quot;Disponible&quot; que borrar un tipo que ya tiene pedidos.
      </p>
      <FormError message={state.error} />
      {state.ok && <p role="status" className="text-sm font-medium text-primary">Tipos de filamento guardados.</p>}
      <Button type="submit" variant="extrude" disabled={saving}>
        {saving ? <Loader2 className="animate-spin" /> : <Save />} Guardar tipos
      </Button>
    </form>
  );
}
