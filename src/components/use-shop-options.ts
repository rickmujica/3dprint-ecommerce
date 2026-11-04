"use client";

import { useEffect, useState } from "react";

import type { MaterialType } from "@/lib/material-types";
import type { Filament } from "@/lib/palette";

export type ShopOptions = { palette: Filament[]; materialTypes: MaterialType[] };

/**
 * Colores y tipos de filamento actuales. La página llega con los de su última generación (hasta 1 h de
 * antigüedad) y al abrirla se piden los de ahora, para que lo que se cambia en el admin se vea al instante.
 */
export function useShopOptions(initial: ShopOptions): ShopOptions {
  const [options, setOptions] = useState(initial);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/opciones", { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<Partial<ShopOptions>>) : null))
      .then((data) => {
        if (cancelled || !Array.isArray(data?.palette) || !Array.isArray(data?.materialTypes)) return;
        setOptions({ palette: data.palette, materialTypes: data.materialTypes });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  return options;
}
