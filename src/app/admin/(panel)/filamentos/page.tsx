import { FilamentsForm } from "@/components/admin/filaments-form";
import { requireAdmin } from "@/lib/auth";
import { defaultFilaments, normalizePalette } from "@/lib/palette";

export default async function FilamentsPage() {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.from("shop_settings").select("filaments").eq("id", true).maybeSingle();
  const palette = normalizePalette(data?.filaments) ?? defaultFilaments;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold">Filamentos</h1>
        <p className="text-sm text-muted-foreground">
          Los colores que ofrecés en los pedidos. Si un filamento se te acaba, desmarcá &quot;Disponible&quot;: deja de
          aparecer en los formularios, pero los pedidos y modelos que ya lo usan lo siguen mostrando.
        </p>
      </div>
      {error && (
        <p className="text-destructive">
          No se pudo leer la paleta. ¿Corriste la migración <code>20261105010000_filaments.sql</code> en el SQL Editor de
          Supabase?
        </p>
      )}
      {!error && <FilamentsForm palette={palette} />}
    </div>
  );
}
