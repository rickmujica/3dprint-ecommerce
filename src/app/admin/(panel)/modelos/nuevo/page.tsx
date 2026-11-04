import { NewModelForm, type ImportPrefill } from "@/components/admin/new-model-form";
import { getSketchfabModel, isAllowedSketchfabLicense, sketchfabLicenses } from "@/lib/importers/sketchfab";

export default async function NewModelPage({ searchParams }: PageProps<"/admin/modelos/nuevo">) {
  const { sketchfab } = await searchParams;
  const uid = typeof sketchfab === "string" ? sketchfab : null;

  let prefill: ImportPrefill | null = null;
  let error: string | null = null;
  if (uid) {
    try {
      const m = await getSketchfabModel(uid);
      if (!isAllowedSketchfabLicense(m.licenseSlug)) {
        error = `La licencia de este modelo (${m.licenseLabel ?? "desconocida"}) no permite vender impresiones.`;
      } else {
        prefill = {
          provider: "sketchfab",
          uid: m.uid,
          title: m.title,
          description: m.description.slice(0, 4000),
          tags: m.tags,
          license: sketchfabLicenses[m.licenseSlug].id,
          authorName: m.authorName,
          authorUrl: m.authorUrl,
          sourceUrl: m.sourceUrl,
          thumbnailUrl: m.thumbnailUrl,
        };
      }
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{prefill ? "Importar modelo de Sketchfab" : "Nuevo modelo"}</h1>
      {error && <p className="text-destructive">{error}</p>}
      <NewModelForm key={prefill?.uid ?? "nuevo"} prefill={prefill} />
    </div>
  );
}
