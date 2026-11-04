"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Loader2, Plus, Save, ScanSearch, Trash2 } from "lucide-react";

import { updateModel, type AdminFormState } from "@/app/actions/admin";
import { ModelViewer } from "@/components/model-viewer";
import { FormError } from "@/components/order-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { estimatePrice, type PriceSettings } from "@/lib/delivery";
import { colorHex, colors, maxColors, sizes } from "@/lib/options";
import type { ColorZone, Model } from "@/lib/types";
import { formatPrice } from "@/lib/utils";

export function EditModelForm({ model, pricing }: { model: Model; pricing: PriceSettings | null }) {
  const [state, action, saving] = useActionState<AdminFormState & { ok?: boolean }, FormData>(updateModel, {});
  const [zones, setZones] = useState<ColorZone[]>(model.color_zones ?? []);
  const [locked, setLocked] = useState(model.colors_locked);
  const [basePrice, setBasePrice] = useState(model.base_price?.toString() ?? "");
  const [multiPrice, setMultiPrice] = useState(model.multicolor_price?.toString() ?? "");
  const [detectStatus, setDetectStatus] = useState<string | null>(null);

  const distinct = new Set(zones.map((z) => z.color)).size;
  const materialColors = Object.fromEntries(
    zones.filter((z) => z.material && colorHex(z.color)).map((z) => [z.material!, colorHex(z.color)!]),
  );

  async function detectZones() {
    setDetectStatus("Leyendo el modelo 3D…");
    try {
      const { detectMaterials } = await import("@/lib/three/detect-materials");
      const found = await detectMaterials(model.glb_url);
      if (found.length === 0) {
        setDetectStatus(
          "El modelo 3D no tiene partes con colores separados (pasa con STL y con varios 3MF). Cargá las zonas a mano: se verán en la ficha, pero sin vista previa por zona.",
        );
        return;
      }
      setZones(found.map((m) => ({ name: m.name, color: nearestColor(m.hex), material: m.name })));
      setDetectStatus(`Encontré ${found.length} parte${found.length === 1 ? "" : "s"}. Renombralas y ajustá los colores.`);
    } catch (e) {
      setDetectStatus(`No se pudo leer el modelo: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  const priceRows =
    pricing && basePrice
      ? sizes
          .filter((s) => s.id !== "custom")
          .map((s) => {
            const m = { base_price: Number(basePrice), multicolor_price: multiPrice ? Number(multiPrice) : null };
            return {
              size: s.label,
              mono: estimatePrice(m, { size: s.id, colorMode: "mono", quantity: 1 }, pricing),
              multi: estimatePrice(m, { size: s.id, colorMode: "multi", quantity: 1 }, pricing),
            };
          })
      : [];

  return (
    <form action={action} className="grid gap-8 lg:grid-cols-2">
      <input type="hidden" name="id" value={model.id} />
      <input type="hidden" name="color_zones" value={JSON.stringify(zones)} />

      <div className="space-y-4">
        <div className="overflow-hidden rounded-2xl border-2 border-foreground shadow-extrude dark:border-extrude/60">
          <ModelViewer
            src={model.glb_url}
            alt={model.title}
            poster={model.thumbnail_url}
            materialColors={Object.keys(materialColors).length ? materialColors : null}
            className="aspect-square"
          />
        </div>
        <p className="text-sm text-muted-foreground">
          Ver en la tienda:{" "}
          <Link href={`/modelos/${model.slug}`} className="text-primary underline-offset-4 hover:underline" target="_blank">
            /modelos/{model.slug}
          </Link>
        </p>
      </div>

      <div className="space-y-6">
        <Field label="Título">
          <Input name="title" required defaultValue={model.title} />
        </Field>
        <Field label="Descripción">
          <Textarea name="description" rows={4} defaultValue={model.description} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Categoría">
            <Input name="category" defaultValue={model.category} />
          </Field>
          <Field label="Etiquetas (separadas por coma)">
            <Input name="tags" defaultValue={model.tags.join(", ")} />
          </Field>
        </div>

        <fieldset className="space-y-3 rounded-xl border-2 border-foreground/10 p-4">
          <legend className="px-1 text-sm font-semibold">Precio</legend>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Precio base, 1 color, 100 % (vacío = a cotizar)">
              <Input name="base_price" inputMode="numeric" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} />
            </Field>
            <Field label="Precio multicolor al 100 % (vacío = automático)">
              <Input
                name="multicolor_price"
                inputMode="numeric"
                value={multiPrice}
                onChange={(e) => setMultiPrice(e.target.value)}
                placeholder={
                  pricing && basePrice
                    ? String(Math.round((Number(basePrice) * pricing.multicolor_price_factor) / 1000) * 1000)
                    : undefined
                }
              />
            </Field>
          </div>
          {priceRows.length > 0 && (
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  <th className="font-normal">Tamaño</th>
                  <th className="font-normal">1 color</th>
                  <th className="font-normal">Multicolor</th>
                </tr>
              </thead>
              <tbody>
                {priceRows.map((r) => (
                  <tr key={r.size}>
                    <td>{r.size}</td>
                    <td className="font-mono">{formatPrice(r.mono)}</td>
                    <td className="font-mono">{formatPrice(r.multi)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="text-xs text-muted-foreground">
            Los multiplicadores por tamaño y el recargo multicolor se cambian en{" "}
            <Link href="/admin/ajustes" className="underline">Ajustes</Link>.
          </p>
        </fieldset>

        <fieldset className="space-y-3 rounded-xl border-2 border-foreground/10 p-4">
          <legend className="px-1 text-sm font-semibold">Zonas de color</legend>
          <p className="text-xs text-muted-foreground">
            Sin zonas, el cliente elige un solo color para toda la pieza. Con zonas (pelo, ropa, piel…) ve los colores
            originales y puede cambiarlos zona por zona, usando hasta {maxColors} colores distintos.
          </p>
          <Button type="button" variant="outline" size="sm" onClick={detectZones}>
            <ScanSearch /> Detectar partes del modelo 3D
          </Button>
          {detectStatus && <p className="text-xs text-muted-foreground">{detectStatus}</p>}

          {zones.length > 0 && (
            <ul className="space-y-2">
              {zones.map((z, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span
                    className="size-8 shrink-0 rounded-full border-2 border-foreground/20"
                    style={{ backgroundColor: colorHex(z.color) ?? undefined }}
                  />
                  <Input
                    aria-label="Nombre de la zona"
                    value={z.name}
                    placeholder="Pelo"
                    onChange={(e) => setZones(zones.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                  />
                  <NativeSelect
                    aria-label="Color original"
                    value={z.color}
                    onChange={(e) => setZones(zones.map((x, j) => (j === i ? { ...x, color: e.target.value } : x)))}
                  >
                    {colors.map((c) => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </NativeSelect>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Quitar zona"
                    onClick={() => setZones(zones.filter((_, j) => j !== i))}
                  >
                    <Trash2 />
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setZones([...zones, { name: "", color: colors[0].id }])}
          >
            <Plus /> Agregar zona
          </Button>

          {zones.length > 0 && (
            <>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  name="colors_locked"
                  checked={locked}
                  onChange={(e) => setLocked(e.target.checked)}
                  className="mt-0.5 size-4 accent-primary"
                />
                <span>
                  <span className="font-medium">Colores fijos</span>
                  <span className="block text-xs text-muted-foreground">
                    El cliente no puede cambiarlos. Usalo para figuras que llevan más de {maxColors} colores (por partes,
                    simplificadas o pintadas a mano), y poné el precio multicolor a mano.
                  </span>
                </span>
              </label>
              {distinct > maxColors && !locked && (
                <p className="text-xs font-medium text-destructive">
                  Las zonas usan {distinct} colores distintos y la impresora carga {maxColors}: marcá &quot;Colores
                  fijos&quot; o juntá colores.
                </p>
              )}
            </>
          )}
        </fieldset>

        <div className="flex gap-6 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="published" defaultChecked={model.published} className="size-4 accent-primary" /> Publicado
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="featured" defaultChecked={model.featured} className="size-4 accent-primary" /> Destacado
          </label>
        </div>

        <FormError message={state.error} />
        {state.ok && <p role="status" className="text-sm font-medium text-primary">Cambios guardados.</p>}
        <Button type="submit" variant="extrude" size="lg" className="w-full" disabled={saving}>
          {saving ? <Loader2 className="animate-spin" /> : <Save />} Guardar cambios
        </Button>
      </div>
    </form>
  );
}

function nearestColor(hex: string) {
  const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [r, g, b] = rgb(hex);
  let best: string = colors[0].id;
  let bestDist = Infinity;
  for (const c of colors) {
    const [cr, cg, cb] = rgb(c.hex);
    const d = (r - cr) ** 2 + (g - cg) ** 2 + (b - cb) ** 2;
    if (d < bestDist) [best, bestDist] = [c.id, d];
  }
  return best;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
