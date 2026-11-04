"use client";

import { useEffect, useMemo, useState } from "react";
import { Lock } from "lucide-react";

import { maxColors } from "@/lib/options";
import { availableFilaments, hexOf, labelOf, type Filament } from "@/lib/palette";
import type { ColorMode, ColorZone } from "@/lib/types";
import { cn } from "@/lib/utils";

type ZoneMode = "original" | "custom" | "mono";

export type ZonePreview = {
  mode: ColorMode;
  /** Color por material del GLB, para teñir cada zona en el visor. */
  materialColors: Record<string, string> | null;
  /** Color único para teñir todo el modelo. */
  tint: string | null;
};

const zoneModes: { id: ZoneMode; label: string; hint: string }[] = [
  { id: "original", label: "Colores originales", hint: "Como lo diseñó el autor." },
  { id: "custom", label: "Personalizar", hint: `Elegí el color de cada parte (hasta ${maxColors} distintos).` },
  { id: "mono", label: "Un solo color", hint: "Toda la pieza en un filamento: más barato y rápido." },
];

/**
 * Colores de un modelo con zonas (pelo, ropa, piel…). El cliente puede dejar los originales,
 * cambiar el color de cada zona o imprimir todo de un color, salvo que el modelo tenga colores fijos.
 */
export function ZoneColorPicker({
  palette,
  zones,
  locked,
  fields,
  onPreview,
}: {
  palette: Filament[];
  zones: ColorZone[];
  locked: boolean;
  fields?: Record<string, string>;
  onPreview?: (preview: ZonePreview) => void;
}) {
  const [mode, setMode] = useState<ZoneMode>(() => {
    const m = fields?.zone_mode as ZoneMode | undefined;
    return !locked && (m === "custom" || m === "mono") ? m : "original";
  });
  const [custom, setCustom] = useState<string[]>(() => zones.map((z, i) => fields?.[`zone_${i}`] || z.color));
  const colors = availableFilaments(palette);
  const colorHex = (id: string) => hexOf(palette, id);
  const [single, setSingle] = useState<string>(fields?.color || zones[0]?.color || colors[0]?.id || "");

  const current = mode === "custom" ? custom : zones.map((z) => z.color);
  const distinct = useMemo(() => [...new Set(current)], [current]);
  const tooMany = mode === "custom" && distinct.length > maxColors;

  useEffect(() => {
    if (!onPreview) return;
    if (mode === "mono") {
      onPreview({ mode: "mono", materialColors: null, tint: colorHex(single) });
      return;
    }
    const byMaterial: Record<string, string> = {};
    zones.forEach((z, i) => {
      const hex = colorHex(current[i]);
      if (z.material && hex) byMaterial[z.material] = hex;
    });
    onPreview({
      mode: distinct.length > 1 ? "multi" : "mono",
      materialColors: Object.keys(byMaterial).length ? byMaterial : null,
      tint: null,
    });
    // `current` se deriva de mode/custom; no hace falta como dependencia.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, custom, single, zones, distinct.length, onPreview, palette]);

  return (
    <div className="space-y-3">
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Colores</legend>
        {locked ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Lock className="size-4" /> Este modelo se imprime con sus colores originales.
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-3">
            {zoneModes.map((m) => (
              <label
                key={m.id}
                className="cursor-pointer rounded-lg border-2 border-input p-3 transition-all hover:border-foreground/40 has-[:checked]:border-primary has-[:checked]:bg-primary/10 has-[:checked]:shadow-extrude-sm has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/30"
              >
                <input
                  type="radio"
                  name="zone_mode"
                  value={m.id}
                  checked={mode === m.id}
                  onChange={() => setMode(m.id)}
                  className="sr-only"
                />
                <span className="block font-display text-sm font-semibold">{m.label}</span>
                <span className="block text-xs text-muted-foreground">{m.hint}</span>
              </label>
            ))}
          </div>
        )}
        {locked && <input type="hidden" name="zone_mode" value="original" />}
      </fieldset>

      {mode === "original" && (
        <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
          {zones.map((z) => (
            <li key={z.name} className="flex items-center gap-2">
              <Dot hex={colorHex(z.color)} /> {z.name}
            </li>
          ))}
        </ul>
      )}

      {mode === "custom" && (
        <div className="space-y-3">
          {zones.map((z, i) => (
            <fieldset key={z.name} className="space-y-1.5">
              <legend className="text-sm">
                <span className="font-medium">{z.name}</span>
                <span className="text-muted-foreground"> · {labelOf(palette, custom[i])}</span>
              </legend>
              <Swatches
                colors={colors}
                name={`zone_${i}`}
                value={custom[i]}
                onChange={(id) => setCustom((prev) => prev.map((c, j) => (j === i ? id : c)))}
              />
            </fieldset>
          ))}
          <p className={cn("text-xs", tooMany ? "font-medium text-destructive" : "text-muted-foreground")}>
            {distinct.length} de {maxColors} colores distintos.
            {tooMany && " Repetí algún color en otra zona para bajar a " + maxColors + "."}
          </p>
        </div>
      )}

      {mode === "mono" && (
        <fieldset className="space-y-1.5">
          <legend className="text-sm">
            <span className="font-medium">Color</span>
            <span className="text-muted-foreground"> · {labelOf(palette, single)}</span>
          </legend>
          <Swatches colors={colors} name="color" value={single} onChange={setSingle} />
        </fieldset>
      )}
    </div>
  );
}

function Dot({ hex }: { hex: string | null }) {
  return (
    <span
      className="inline-block size-5 rounded-full border-2 border-foreground/20"
      style={{ backgroundColor: hex ?? undefined }}
    />
  );
}

function Swatches({
  colors,
  name,
  value,
  onChange,
}: {
  colors: Filament[];
  name: string;
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {colors.map((c) => (
        <label key={c.id} className="cursor-pointer" title={c.label}>
          <input
            type="radio"
            name={name}
            value={c.id}
            checked={value === c.id}
            onChange={() => onChange(c.id)}
            className="peer sr-only"
          />
          <span
            className="block size-8 rounded-full border-2 border-foreground/20 transition-all peer-checked:scale-110 peer-checked:border-foreground peer-checked:shadow-extrude-sm peer-focus-visible:ring-[3px] peer-focus-visible:ring-ring/40"
            style={{ backgroundColor: c.hex }}
          />
          <span className="sr-only">{c.label}</span>
        </label>
      ))}
    </div>
  );
}
