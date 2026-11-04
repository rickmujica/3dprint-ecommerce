import { FilamentsForm } from "@/components/admin/filaments-form";
import { MaterialTypesForm } from "@/components/admin/material-types-form";
import { requireAdmin } from "@/lib/auth";
import { defaultMaterialTypes, normalizeMaterialTypes } from "@/lib/material-types";
import { defaultFilaments, normalizePalette } from "@/lib/palette";

export default async function FilamentsPage() {
  const { supabase } = await requireAdmin();
  const [palette, types] = await Promise.all([
    supabase.from("shop_settings").select("filaments").eq("id", true).maybeSingle(),
    supabase.from("shop_settings").select("material_types").eq("id", true).maybeSingle(),
  ]);

  return (
    <div className="max-w-4xl space-y-10">
      <h1 className="text-3xl font-bold">Filamentos</h1>

      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">Tipos de filamento</h2>
          <p className="text-sm text-muted-foreground">
            PLA, PETG, TPU, resina… Los que no estén disponibles no se ofrecen en los pedidos. En cada modelo podés
            limitar con cuáles se puede pedir.
          </p>
        </div>
        {types.error ? (
          <MigrationHint file="20261105030000_material_types.sql" />
        ) : (
          <MaterialTypesForm types={normalizeMaterialTypes(types.data?.material_types) ?? defaultMaterialTypes} />
        )}
      </section>

      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">Colores</h2>
          <p className="text-sm text-muted-foreground">
            Si un color se te acaba, desmarcá &quot;Disponible&quot;: deja de aparecer en los formularios, pero los pedidos
            y modelos que ya lo usan lo siguen mostrando.
          </p>
        </div>
        {palette.error ? (
          <MigrationHint file="20261105010000_filaments.sql" />
        ) : (
          <FilamentsForm palette={normalizePalette(palette.data?.filaments) ?? defaultFilaments} />
        )}
      </section>
    </div>
  );
}

function MigrationHint({ file }: { file: string }) {
  return (
    <p className="text-destructive">
      No se pudo leer esta lista. ¿Corriste la migración <code>{file}</code> en el SQL Editor de Supabase?
    </p>
  );
}
