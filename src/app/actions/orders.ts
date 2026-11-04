"use server";

import { redirect } from "next/navigation";

import { capacityInfo, deliveryFor, estimatePrice, getCapacity, type CapacityInfo } from "@/lib/capacity";
import { getModelBySlug } from "@/lib/catalog";
import { missingColorsText, orderableMaterials, paletteFor, type MaterialType } from "@/lib/material-types";
import { colorModes, maxColors, sizes } from "@/lib/options";
import { availableFilaments, labelOf, type Filament } from "@/lib/palette";
// Sin caché: se valida contra los colores y tipos que hay ahora, no contra los de hace una hora.
import { fetchMaterialTypes, fetchPalette } from "@/lib/palette-server";
import { orderCode } from "@/lib/order-code";
import { getModelsBucket } from "@/lib/r2";
import { hasSupabase } from "@/lib/supabase/env";
import { createPublicClient } from "@/lib/supabase/public";
import type { ColorMode, ColorZone, Model } from "@/lib/types";

export type OrderFormState = {
  error?: string;
  fields?: Record<string, string>;
  /** La cola se llenó mientras completaba el formulario: hay que pedirle el email. */
  full?: boolean;
};

const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

function str(form: FormData, key: string, max = 200) {
  const v = form.get(key);
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}


function readCommon(form: FormData, materialOptions: MaterialType[]) {
  const fields: Record<string, string> = {
    material: str(form, "material", 20),
    size: str(form, "size", 20),
    quantity: str(form, "quantity", 3) || "1",
    customer_name: str(form, "customer_name", 120),
    email: str(form, "email", 200),
    phone: str(form, "phone", 30),
    notes: str(form, "notes", 4000),
  };

  let error: string | undefined;
  const qty = Number(fields.quantity);
  if (fields.customer_name.length < 2) error = "Decinos tu nombre.";
  else if (!fields.email && !fields.phone) error = "Dejanos un email o un teléfono para contactarte.";
  else if (fields.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(fields.email)) error = "El email no parece válido.";
  else if (!materialOptions.some((m) => m.id === fields.material)) error = "Elegí un material de la lista.";
  else if (!sizes.some((s) => s.id === fields.size)) error = "Elegí un tamaño.";
  else if (!Number.isInteger(qty) || qty < 1 || qty > 100) error = "La cantidad tiene que estar entre 1 y 100.";

  return { fields, qty, error };
}

type ColorChoice = {
  colorMode: ColorMode;
  /** Colores distintos usados, separados por coma. */
  color: string;
  zones: ColorZone[] | null;
  fields: Record<string, string>;
  error?: string;
};

/** Pedido personalizado o modelo sin zonas: un color, o multicolor libre (2 a maxColors). */
function readFreeColors(form: FormData, allowMulti: boolean, palette: Filament[]): ColorChoice {
  const isColor = (id: string) => availableFilaments(palette).some((c) => c.id === id);
  const mode = (allowMulti && str(form, "color_mode", 10)) || "mono";
  const picked = form
    .getAll("color")
    .filter((v): v is string => typeof v === "string" && v !== "")
    .slice(0, maxColors + 1);
  const fields = { color_mode: mode, color: picked.join(",") };
  const choice = { colorMode: mode as ColorMode, color: fields.color, zones: null, fields };

  if (!colorModes.some((m) => m.id === mode)) return { ...choice, error: "Elegí un color o multicolor." };
  if (picked.length === 0) return { ...choice, error: mode === "multi" ? "Elegí los colores." : "Elegí un color." };
  if (picked.some((id) => !isColor(id))) return { ...choice, error: "Elegí colores de la lista (los que hay en ese material)." };
  if (mode === "mono" && picked.length > 1) return { ...choice, error: "Elegí un solo color." };
  if (mode === "multi" && picked.length < 2) return { ...choice, error: "Para multicolor elegí al menos 2 colores." };
  if (picked.length > maxColors) return { ...choice, error: `Podemos combinar hasta ${maxColors} colores.` };
  return choice;
}

/** Modelo con zonas: colores originales, personalizados por zona o todo de un color. */
function readZoneColors(form: FormData, model: Model, palette: Filament[], materialLabel?: string): ColorChoice {
  const isColor = (id: string) => availableFilaments(palette).some((c) => c.id === id);
  const zoneMode = str(form, "zone_mode", 10) || "original";
  const fields: Record<string, string> = { zone_mode: zoneMode, color: str(form, "color", 20) };
  model.color_zones.forEach((_, i) => (fields[`zone_${i}`] = str(form, `zone_${i}`, 20)));

  const fail = (error: string): ColorChoice => ({ colorMode: "mono", color: "", zones: null, fields, error });
  if (model.colors_locked && zoneMode !== "original") return fail("Este modelo se imprime solo con sus colores originales.");

  if (zoneMode === "mono") {
    if (!isColor(fields.color)) return fail("Elegí el color para toda la pieza (de los que hay en ese material).");
    return { colorMode: "mono", color: fields.color, zones: null, fields };
  }

  let zones: ColorZone[];
  if (zoneMode === "original") {
    zones = model.color_zones.map(({ name, color }) => ({ name, color }));
    const missing = zones.filter((z) => !isColor(z.color)).map((z) => labelOf(palette, z.color));
    if (missing.length)
      return fail(
        `${missingColorsText(materialLabel, missing)}. ` +
          (model.colors_locked ? "Elegí otro material." : "Elegí otro material o «Personalizar» para cambiar ese color."),
      );
  } else if (zoneMode === "custom") {
    zones = model.color_zones.map((z, i) => ({ name: z.name, color: fields[`zone_${i}`] }));
    if (zones.some((z) => !isColor(z.color))) return fail("Elegí un color para cada zona (de los que hay en ese material).");
  } else {
    return fail("Elegí cómo querés los colores.");
  }

  const distinct = [...new Set(zones.map((z) => z.color))];
  if (zoneMode === "custom" && distinct.length > maxColors)
    return fail(`Podemos combinar hasta ${maxColors} colores distintos: repetí alguno en otra zona.`);
  return { colorMode: distinct.length > 1 ? "multi" : "mono", color: distinct.join(","), zones, fields };
}

type OrderRow = Record<string, unknown> & { email: string | null; color_mode: ColorMode };

const GENERIC_ERROR = "No pudimos registrar el pedido. Probá de nuevo en un momento.";

/**
 * Registra el pedido si hay lugar en la cola; si no, lo guarda como promesa de recontacto.
 * `priceFor` calcula el precio estimado con los ajustes actuales (null = a cotizar).
 */
async function placeOrder(
  row: OrderRow,
  fields: Record<string, string>,
  thanksQuery: Record<string, string>,
  priceFor: (info: CapacityInfo) => number | null = () => null,
): Promise<{ state: OrderFormState; redirectTo?: never } | { redirectTo: string; state?: never }> {
  const code = String(row.code);

  let info: CapacityInfo;
  try {
    info = capacityInfo(await getCapacity());
  } catch {
    return { state: { error: GENERIC_ERROR, fields } };
  }
  const delivery = deliveryFor(info, row.color_mode);
  const price = priceFor(info);
  const thanks = () =>
    thanksUrl({ ...thanksQuery, codigo: code, entrega: delivery, ...(price != null && { precio: String(price) }) });

  // Modo demo: no se guarda nada, pero se muestran fecha y precio.
  if (!hasSupabase) return { redirectTo: thanks() };

  const supabase = createPublicClient();
  if (info.available) {
    const { error } = await supabase.from("orders").insert({ ...row, estimated_delivery: delivery, estimated_price: price });
    if (!error) return { redirectTo: thanks() };
    // 42501 = la política RLS lo rechazó: alguien ocupó el último lugar justo antes.
    if (error.code !== "42501") return { state: { error: GENERIC_ERROR, fields } };
  }

  // Cola llena: promesa de recontacto.
  if (!row.email) {
    return {
      state: {
        full: true,
        fields,
        error: "Justo se llenó la cola de impresión. Dejanos tu email y te avisamos apenas podamos tomar tu pedido.",
      },
    };
  }
  const waitRow: Record<string, unknown> = { ...row, estimated_price: price };
  delete waitRow.code;
  const { error } = await supabase.from("waitlist").insert(waitRow);
  if (error) return { state: { error: "No pudimos guardar tus datos. Probá de nuevo en un momento.", fields } };
  return { redirectTo: `/pedido/en-espera${thanksQuery.modelo ? `?modelo=${encodeURIComponent(thanksQuery.modelo)}` : ""}` };
}

function thanksUrl(query: Record<string, string>) {
  return `/pedido/gracias?${new URLSearchParams(query).toString()}`;
}

export async function createCatalogOrder(_prev: OrderFormState, form: FormData): Promise<OrderFormState> {
  // Campo trampa para bots: los humanos no lo ven.
  if (str(form, "website")) redirect("/pedido/gracias");

  const [model, palette, materialTypes] = await Promise.all([
    getModelBySlug(str(form, "model_slug", 120)),
    fetchPalette(),
    fetchMaterialTypes(),
  ]);
  const materialOptions = orderableMaterials(materialTypes, palette, model);
  const common = readCommon(form, materialOptions);
  // Solo valen los colores que hay en el tipo de filamento elegido.
  const material = materialOptions.find((m) => m.id === common.fields.material);
  const materialPalette = paletteFor(palette, material);
  const colorChoice = model?.color_zones.length
    ? readZoneColors(form, model, materialPalette, material?.label)
    : readFreeColors(form, false, materialPalette);
  const fields: Record<string, string> = { ...common.fields, ...colorChoice.fields };
  if (!model) return { error: "Ese modelo ya no está disponible.", fields };
  const error = common.error ?? colorChoice.error;
  if (error) return { error, fields };

  const result = await placeOrder(
    {
      code: orderCode(),
      kind: "catalogo",
      model_id: hasSupabase ? model.id : null,
      model_title: model.title,
      customer_name: fields.customer_name,
      email: fields.email || null,
      phone: fields.phone || null,
      material: fields.material,
      color_mode: colorChoice.colorMode,
      color: colorChoice.color || null,
      color_zones: colorChoice.zones,
      size: fields.size,
      quantity: common.qty,
      notes: fields.notes || null,
    },
    fields,
    { modelo: model.title },
    (info) =>
      estimatePrice(
        model,
        {
          size: fields.size,
          colorMode: colorChoice.colorMode,
          quantity: common.qty,
          materialFactor: materialOptions.find((m) => m.id === fields.material)?.price_factor,
        },
        info.pricing,
      ),
  );
  if (result.state) return result.state;
  redirect(result.redirectTo);
}

export async function createCustomOrder(_prev: OrderFormState, form: FormData): Promise<OrderFormState> {
  if (str(form, "website")) redirect("/pedido/gracias");

  const [palette, materialTypes] = await Promise.all([fetchPalette(), fetchMaterialTypes()]);
  const materialOptions = orderableMaterials(materialTypes, palette, null);
  const common = readCommon(form, materialOptions);
  const materialPalette = paletteFor(palette, materialOptions.find((m) => m.id === common.fields.material));
  const colorChoice = readFreeColors(form, true, materialPalette);
  const description = str(form, "description", 4000);
  const fields: Record<string, string> = { ...common.fields, ...colorChoice.fields, description };
  const error = common.error ?? colorChoice.error;
  if (error) return { error, fields };
  if (description.length < 10) return { error: "Contanos con un poco más de detalle qué querés imprimir.", fields };

  const code = orderCode();
  let referenceKey: string | null = null;
  const photo = form.get("photo");
  if (photo instanceof File && photo.size > 0) {
    if (!photo.type.startsWith("image/")) return { error: "La referencia tiene que ser una imagen.", fields };
    if (photo.size > MAX_PHOTO_BYTES) return { error: "La imagen pesa más de 8 MB.", fields };
    const ext = (photo.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    referenceKey = `private/requests/${code.toLowerCase()}/referencia.${ext}`;
    try {
      const bucket = await getModelsBucket();
      await bucket.put(referenceKey, await photo.arrayBuffer(), { httpMetadata: { contentType: photo.type } });
    } catch {
      return { error: "No pudimos subir la imagen. Probá con otra o enviala por WhatsApp.", fields };
    }
  }

  const result = await placeOrder(
    {
      code,
      kind: "personalizado",
      model_title: null,
      customer_name: fields.customer_name,
      email: fields.email || null,
      phone: fields.phone || null,
      material: fields.material,
      color_mode: colorChoice.colorMode,
      color: colorChoice.color || null,
      size: fields.size,
      quantity: common.qty,
      notes: [description, fields.notes].filter(Boolean).join("\n\n"),
      reference_key: referenceKey,
    },
    fields,
    { personalizado: "1" },
  );
  if (result.state) return result.state;
  redirect(result.redirectTo);
}
