"use server";

import { redirect } from "next/navigation";

import { capacityInfo, getCapacity } from "@/lib/capacity";
import { getModelBySlug } from "@/lib/catalog";
import { colorModes, colors, materials, maxColors, sizes } from "@/lib/options";
import { orderCode } from "@/lib/order-code";
import { getModelsBucket } from "@/lib/r2";
import { hasSupabase } from "@/lib/supabase/env";
import { createPublicClient } from "@/lib/supabase/public";

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

function readCommon(form: FormData) {
  const colorMode = str(form, "color_mode", 10) || "mono";
  const picked = form
    .getAll("color")
    .filter((v): v is string => typeof v === "string" && v !== "")
    .slice(0, maxColors + 1);
  const fields = {
    material: str(form, "material", 20),
    color_mode: colorMode,
    color: picked.join(","),
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
  else if (!materials.some((m) => m.id === fields.material)) error = "Elegí un material.";
  else if (!colorModes.some((m) => m.id === fields.color_mode)) error = "Elegí un color o multicolor.";
  else if (picked.some((id) => !colors.some((c) => c.id === id))) error = "Elegí colores de la lista.";
  else if (fields.color_mode === "mono" && picked.length > 1) error = "Elegí un solo color.";
  else if (fields.color_mode === "multi" && picked.length < 2) error = "Para multicolor elegí al menos 2 colores.";
  else if (picked.length > maxColors) error = `Podemos combinar hasta ${maxColors} colores.`;
  else if (!sizes.some((s) => s.id === fields.size)) error = "Elegí un tamaño.";
  else if (!Number.isInteger(qty) || qty < 1 || qty > 100) error = "La cantidad tiene que estar entre 1 y 100.";

  return { fields, qty, error };
}

type OrderRow = Record<string, unknown> & { email: string | null };

/**
 * Registra el pedido si hay lugar en la cola; si no, lo guarda como promesa de recontacto.
 * Devuelve a dónde redirigir, o un estado de error para el formulario.
 */
async function placeOrder(row: OrderRow, fields: Record<string, string>, thanksQuery: Record<string, string>) {
  const code = String(row.code);

  if (!hasSupabase) {
    // Modo demo: no se guarda nada, pero se muestra la fecha estimada.
    const info = capacityInfo(await getCapacity());
    return { redirectTo: thanksUrl({ ...thanksQuery, codigo: code, entrega: info.estimatedDelivery }) };
  }

  const supabase = createPublicClient();
  let info;
  try {
    info = capacityInfo(await getCapacity());
  } catch {
    return { state: { error: "No pudimos registrar el pedido. Probá de nuevo en un momento.", fields } };
  }

  if (info.available) {
    const { error } = await supabase.from("orders").insert({ ...row, estimated_delivery: info.estimatedDelivery });
    if (!error) return { redirectTo: thanksUrl({ ...thanksQuery, codigo: code, entrega: info.estimatedDelivery }) };
    // 42501 = la política RLS lo rechazó: alguien ocupó el último lugar justo antes.
    if (error.code !== "42501") return { state: { error: "No pudimos registrar el pedido. Probá de nuevo en un momento.", fields } };
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
  const { code: _code, ...waitRow } = row;
  void _code;
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

  const { fields, qty, error } = readCommon(form);
  if (error) return { error, fields };

  const model = await getModelBySlug(str(form, "model_slug", 120));
  if (!model) return { error: "Ese modelo ya no está disponible.", fields };

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
      color_mode: fields.color_mode,
      color: fields.color || null,
      size: fields.size,
      quantity: qty,
      notes: fields.notes || null,
    },
    fields,
    { modelo: model.title },
  );
  if (result.state) return result.state;
  redirect(result.redirectTo);
}

export async function createCustomOrder(_prev: OrderFormState, form: FormData): Promise<OrderFormState> {
  if (str(form, "website")) redirect("/pedido/gracias");

  const { fields, qty, error } = readCommon(form);
  const description = str(form, "description", 4000);
  const allFields = { ...fields, description };
  if (error) return { error, fields: allFields };
  if (description.length < 10) return { error: "Contanos con un poco más de detalle qué querés imprimir.", fields: allFields };

  const code = orderCode();
  let referenceKey: string | null = null;
  const photo = form.get("photo");
  if (photo instanceof File && photo.size > 0) {
    if (!photo.type.startsWith("image/")) return { error: "La referencia tiene que ser una imagen.", fields: allFields };
    if (photo.size > MAX_PHOTO_BYTES) return { error: "La imagen pesa más de 8 MB.", fields: allFields };
    const ext = (photo.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    referenceKey = `private/requests/${code.toLowerCase()}/referencia.${ext}`;
    try {
      const bucket = await getModelsBucket();
      await bucket.put(referenceKey, await photo.arrayBuffer(), { httpMetadata: { contentType: photo.type } });
    } catch {
      return { error: "No pudimos subir la imagen. Probá con otra o enviala por WhatsApp.", fields: allFields };
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
      color_mode: fields.color_mode,
      color: fields.color || null,
      size: fields.size,
      quantity: qty,
      notes: [description, fields.notes].filter(Boolean).join("\n\n"),
      reference_key: referenceKey,
    },
    allFields,
    { personalizado: "1" },
  );
  if (result.state) return result.state;
  redirect(result.redirectTo);
}
