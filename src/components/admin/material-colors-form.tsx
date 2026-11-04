"use client";

import { useActionState, useState } from "react";
import { Loader2, Save } from "lucide-react";

import { updateMaterialColors, type AdminFormState } from "@/app/actions/admin";
import { FormError } from "@/components/order-fields";
import { Button } from "@/components/ui/button";
import type { MaterialType } from "@/lib/material-types";
import type { Filament } from "@/lib/palette";
import { cn } from "@/lib/utils";

/** Tabla tipos × colores: qué colores tenés de cada tipo de filamento. */
export function MaterialColorsForm({ types, palette }: { types: MaterialType[]; palette: Filament[] }) {
  const [state, action, saving] = useActionState<AdminFormState & { ok?: boolean }, FormData>(updateMaterialColors, {});
  const allIds = palette.map((c) => c.id);
  const [checked, setChecked] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(types.map((t) => [t.id, t.colors ?? allIds])),
  );

  const has = (typeId: string, colorId: string) => checked[typeId]?.includes(colorId) ?? false;
  const toggle = (typeId: string, colorId: string) =>
    setChecked((prev) => {
      const cur = prev[typeId] ?? [];
      return { ...prev, [typeId]: cur.includes(colorId) ? cur.filter((c) => c !== colorId) : [...cur, colorId] };
    });
  const setColumn = (typeId: string, all: boolean) => setChecked((prev) => ({ ...prev, [typeId]: all ? allIds : [] }));

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="material_colors" value={JSON.stringify(checked)} />
      <div className="overflow-x-auto rounded-xl border-2 border-foreground/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-foreground/10">
              <th scope="col" className="sticky left-0 bg-background p-3 text-left font-medium">
                Color
              </th>
              {types.map((t) => {
                const full = (checked[t.id]?.length ?? 0) === allIds.length;
                return (
                  <th key={t.id} scope="col" className={cn("p-2 text-center font-medium", !t.available && "text-muted-foreground")}>
                    <span className="block whitespace-nowrap">{t.label}</span>
                    {!t.available && <span className="block text-xs font-normal">sin stock</span>}
                    <button
                      type="button"
                      onClick={() => setColumn(t.id, !full)}
                      className="mt-1 text-xs font-normal text-primary underline-offset-2 hover:underline"
                    >
                      {full ? "Ninguno" : "Todos"}
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-foreground/10">
            {palette.map((c) => (
              <tr key={c.id} className={cn(!c.available && "text-muted-foreground")}>
                <th scope="row" className="sticky left-0 bg-background p-2 pl-3 text-left font-normal">
                  <span className="flex items-center gap-2 whitespace-nowrap">
                    <span
                      className="inline-block size-5 shrink-0 rounded-full border-2 border-foreground/20"
                      style={{ backgroundColor: c.hex }}
                    />
                    {c.label}
                    {!c.available && <span className="text-xs">(sin stock)</span>}
                  </span>
                </th>
                {types.map((t) => (
                  <td key={t.id} className="p-2 text-center">
                    <input
                      type="checkbox"
                      checked={has(t.id, c.id)}
                      onChange={() => toggle(t.id, c.id)}
                      aria-label={`${c.label} en ${t.label}`}
                      className="size-5 cursor-pointer accent-primary align-middle"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        El cliente solo ve los colores marcados para el tipo que elige. Si un tipo tiene todos marcados, los colores nuevos
        que agregues a la paleta también quedan en ese tipo.
      </p>
      <FormError message={state.error} />
      {state.ok && <p role="status" className="text-sm font-medium text-primary">Colores por tipo guardados.</p>}
      <Button type="submit" variant="extrude" disabled={saving}>
        {saving ? <Loader2 className="animate-spin" /> : <Save />} Guardar colores por tipo
      </Button>
    </form>
  );
}
