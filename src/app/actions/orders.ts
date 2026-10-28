"use server";

import { redirect } from "next/navigation";

import { getModelBySlug } from "@/lib/catalog";
import { colors, materials, sizes } from "@/lib/options";
import { getModelsBucket } from "@/lib/r2";
import { hasSupabase } from "@/lib/supabase/env";
import { createPublicClient } from "@/lib/supabase/public";

export type OrderFormState = { error?: string; fields?: Record<string, string> };

const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

function str(form: FormData, key: string, max = 200) {
  const v = form.get(key);
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

/** Código corto y legible para hablar del pedido por WhatsApp: P-7K2QXM */
function orderCode() {
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return "P-" + Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

function readCommon(form: FormData) {
  const fields = {
    material: str(form, "material", 20),
    color: str(form, "color", 20),
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
  else if (fields.color && !colors.some((c) => c.id === fields.color)) error = "Elegí un color de la lista.";
  else if (!sizes.some((s) => s.id === fields.size)) error = "Elegí un tamaño.";
  else if (!Number.isInteger(qty) || qty < 1 || qty > 100) error = "La cantidad tiene que estar entre 1 y 100.";

  return { fields, qty, error };
}

async function insertOrder(row: Record<string, unknown>) {
  if (!hasSupabase) return null; // Modo demo: no se guarda nada.
  const { error } = await createPublicClient().from("orders").insert(row);
  return error ? "No pudimos registrar el pedido. Probá de nuevo en un momento." : null;
}

export async function createCatalogOrder(_prev: OrderFormState, form: FormData): Promise<OrderFormState> {
  // Campo trampa para bots: los humanos no lo ven.
  if (str(form, "website")) redirect("/pedido/gracias");

  const { fields, qty, error } = readCommon(form);
  if (error) return { error, fields };

  const model = await getModelBySlug(str(form, "model_slug", 120));
  if (!model) return { error: "Ese modelo ya no está disponible.", fields };

  const code = orderCode();
  const insertError = await insertOrder({
    code,
    kind: "catalogo",
    model_id: hasSupabase ? model.id : null,
    model_title: model.title,
    customer_name: fields.customer_name,
    email: fields.email || null,
    phone: fields.phone || null,
    material: fields.material,
    color: fields.color || null,
    size: fields.size,
    quantity: qty,
    notes: fields.notes || null,
  });
  if (insertError) return { error: insertError, fields };

  redirect(`/pedido/gracias?codigo=${code}&modelo=${encodeURIComponent(model.title)}`);
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

  const insertError = await insertOrder({
    code,
    kind: "personalizado",
    model_title: null,
    customer_name: fields.customer_name,
    email: fields.email || null,
    phone: fields.phone || null,
    material: fields.material,
    color: fields.color || null,
    size: fields.size,
    quantity: qty,
    notes: [description, fields.notes].filter(Boolean).join("\n\n"),
    reference_key: referenceKey,
  });
  if (insertError) return { error: insertError, fields: allFields };

  redirect(`/pedido/gracias?codigo=${code}&personalizado=1`);
}
