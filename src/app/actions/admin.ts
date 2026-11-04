"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth";
import { capacityInfo, deliveryFor, getCapacity } from "@/lib/capacity";
import { licenses, orderStatuses, sizes, waitlistStatuses } from "@/lib/options";
import { defaultFilaments, normalizePalette, type Filament } from "@/lib/palette";
import { defaultMaterialTypes, normalizeMaterialTypes } from "@/lib/material-types";
import { fetchMaterialTypes, fetchPalette } from "@/lib/palette-server";
import { orderCode } from "@/lib/order-code";
import { isSafeKey, publicFileUrl } from "@/lib/r2";
import type { ColorZone, LicenseId, OrderStatus, WaitlistEntry, WaitlistStatus } from "@/lib/types";
import { slugify } from "@/lib/utils";

export type AdminFormState = { error?: string };

function str(form: FormData, key: string, max = 500) {
  const v = form.get(key);
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

function num(form: FormData, key: string) {
  const v = str(form, key, 20);
  if (!v) return null;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export async function createModel(_prev: AdminFormState, form: FormData): Promise<AdminFormState> {
  const { supabase } = await requireAdmin();

  const title = str(form, "title", 120);
  const slug = slugify(str(form, "slug", 80) || title);
  const license = str(form, "license", 20) as LicenseId;
  const glbKey = str(form, "glb_key");
  const thumbKey = str(form, "thumb_key");
  const sourceKey = str(form, "source_key");
  const authorName = str(form, "author_name", 120) || null;

  if (!title || !slug) return { error: "Falta el título." };
  if (!(license in licenses)) return { error: "Elegí una licencia válida." };
  if (licenses[license].needsAttribution && !authorName) return { error: "Esta licencia exige indicar el autor." };
  if (!glbKey.startsWith("public/") || !isSafeKey(glbKey)) return { error: "Falta subir el modelo 3D." };
  if (thumbKey && !(thumbKey.startsWith("public/") && isSafeKey(thumbKey))) return { error: "Miniatura inválida." };
  if (sourceKey && !(sourceKey.startsWith("private/") && isSafeKey(sourceKey))) return { error: "Archivo original inválido." };

  const { error } = await supabase.from("models").insert({
    slug,
    title,
    description: str(form, "description", 4000),
    category: str(form, "category", 60) || "General",
    tags: str(form, "tags", 300)
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean),
    license,
    author_name: authorName,
    author_url: str(form, "author_url") || null,
    source_url: str(form, "source_url") || null,
    glb_url: publicFileUrl(glbKey),
    thumbnail_url: thumbKey ? publicFileUrl(thumbKey) : null,
    source_file_key: sourceKey || null,
    size_x_mm: num(form, "size_x_mm"),
    size_y_mm: num(form, "size_y_mm"),
    size_z_mm: num(form, "size_z_mm"),
    base_price: num(form, "base_price"),
    featured: form.get("featured") === "on",
    published: form.get("published") === "on",
  });

  if (error) {
    return { error: error.code === "23505" ? "Ya existe un modelo con ese slug." : error.message };
  }

  updateTag("models");
  redirect("/admin/modelos");
}

export async function toggleModelPublished(form: FormData) {
  const { supabase } = await requireAdmin();
  const id = str(form, "id", 40);
  const published = form.get("published") === "true";
  const { data } = await supabase.from("models").update({ published }).eq("id", id).select("slug").single();
  updateTag("models");
  if (data) updateTag(`model:${data.slug}`);
  refresh();
}

/** Valida las zonas de color que manda el editor del admin (JSON). */
function parseZones(raw: string, palette: Filament[]): ColorZone[] | string {
  let data: unknown;
  try {
    data = JSON.parse(raw || "[]");
  } catch {
    return "Zonas de color inválidas.";
  }
  if (!Array.isArray(data) || data.length > 16) return "Podés cargar hasta 16 zonas de color.";
  const zones: ColorZone[] = [];
  for (const z of data as Record<string, unknown>[]) {
    const name = typeof z?.name === "string" ? z.name.trim().slice(0, 40) : "";
    const color = typeof z?.color === "string" ? z.color : "";
    const material = typeof z?.material === "string" ? z.material.trim().slice(0, 80) : "";
    if (!name) return "Cada zona necesita un nombre.";
    if (!palette.some((c) => c.id === color)) return `Elegí un color para la zona "${name}".`;
    if (zones.some((other) => other.name === name)) return `Hay dos zonas llamadas "${name}".`;
    zones.push(material ? { name, color, material } : { name, color });
  }
  return zones;
}

export async function updateModel(_prev: AdminFormState, form: FormData): Promise<AdminFormState & { ok?: boolean }> {
  const { supabase } = await requireAdmin();
  const id = str(form, "id", 40);
  const title = str(form, "title", 120);
  if (!title) return { error: "Falta el título." };
  const [palette, materialTypes] = await Promise.all([fetchPalette(), fetchMaterialTypes()]);
  const zones = parseZones(str(form, "color_zones", 8000), palette);
  if (typeof zones === "string") return { error: zones };
  const allowed = form.getAll("allowed_materials").filter((v): v is string => typeof v === "string");
  if (allowed.length === 0) return { error: "Elegí al menos un tipo de filamento." };
  // Todos marcados = sin restricción (así los tipos nuevos se ofrecen solos).
  const allowedMaterials = materialTypes.every((t) => allowed.includes(t.id))
    ? null
    : allowed.filter((id) => materialTypes.some((t) => t.id === id));

  const { data, error } = await supabase
    .from("models")
    .update({
      title,
      description: str(form, "description", 4000),
      category: str(form, "category", 60) || "General",
      tags: str(form, "tags", 300)
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean),
      base_price: num(form, "base_price"),
      multicolor_price: num(form, "multicolor_price"),
      color_zones: zones,
      colors_locked: zones.length > 0 && form.get("colors_locked") === "on",
      allowed_materials: allowedMaterials,
      featured: form.get("featured") === "on",
      published: form.get("published") === "on",
    })
    .eq("id", id)
    .select("slug")
    .single();
  if (error) return { error: error.message };

  updateTag("models");
  updateTag(`model:${data.slug}`);
  refresh();
  return { ok: true };
}

export async function updateFilaments(_prev: AdminFormState, form: FormData): Promise<AdminFormState & { ok?: boolean }> {
  const { supabase } = await requireAdmin();
  let raw: unknown;
  try {
    raw = JSON.parse(str(form, "filaments", 20000) || "[]");
  } catch {
    return { error: "Lista de filamentos inválida." };
  }
  if (!Array.isArray(raw)) return { error: "Lista de filamentos inválida." };
  // Los filamentos nuevos reciben un id a partir del nombre; los existentes conservan el suyo.
  const withIds = (raw as Record<string, unknown>[]).map((f) => ({
    ...f,
    id: typeof f.id === "string" && f.id ? f.id : slugify(String(f.label ?? "")).slice(0, 40),
  }));
  const ids = withIds.map((f) => f.id);
  const dup = ids.find((id, i) => ids.indexOf(id) !== i);
  if (dup) return { error: `Hay dos filamentos con el mismo nombre ("${dup}").` };
  const palette = normalizePalette(withIds);
  if (!palette || palette.length !== withIds.length)
    return { error: "Cada filamento necesita un nombre y un color válido." };
  if (!palette.some((f) => f.available)) return { error: "Tiene que haber al menos un filamento disponible." };

  const { error } = await supabase.from("shop_settings").update({ filaments: palette }).eq("id", true);
  if (error) return { error: error.message };
  updateTag("palette");
  refresh();
  return { ok: true };
}

export async function updateMaterialTypes(
  _prev: AdminFormState,
  form: FormData,
): Promise<AdminFormState & { ok?: boolean }> {
  const { supabase } = await requireAdmin();
  let raw: unknown;
  try {
    raw = JSON.parse(str(form, "material_types", 20000) || "[]");
  } catch {
    return { error: "Lista de tipos inválida." };
  }
  if (!Array.isArray(raw)) return { error: "Lista de tipos inválida." };
  const withIds = (raw as Record<string, unknown>[]).map((t) => ({
    ...t,
    id: typeof t.id === "string" && t.id ? t.id : slugify(String(t.label ?? "")).slice(0, 40),
    price_factor: typeof t.price_factor === "string" ? Number(t.price_factor.replace(",", ".")) : t.price_factor,
  }));
  const ids = withIds.map((t) => t.id);
  const dup = ids.find((id, i) => ids.indexOf(id) !== i);
  if (dup) return { error: `Hay dos tipos con el mismo nombre ("${dup}").` };
  const types = normalizeMaterialTypes(withIds);
  if (!types || types.length !== withIds.length)
    return { error: "Cada tipo necesita un nombre y un multiplicador de precio mayor a 0 (ej. 1 o 1,3)." };
  if (!types.some((t) => t.available)) return { error: "Tiene que haber al menos un tipo disponible." };

  // Los colores de cada tipo se editan en su propia tabla: se conservan los guardados (los tipos nuevos tienen todos).
  const { data: current } = await supabase.from("shop_settings").select("material_types").eq("id", true).maybeSingle();
  const saved = normalizeMaterialTypes(current?.material_types) ?? [];
  for (const t of types) t.colors = saved.find((s) => s.id === t.id)?.colors ?? null;

  const { error } = await supabase.from("shop_settings").update({ material_types: types }).eq("id", true);
  if (error) return { error: error.message };
  updateTag("palette");
  refresh();
  return { ok: true };
}

/** Qué colores hay de cada tipo de filamento (tabla tipos × colores de /admin/filamentos). */
export async function updateMaterialColors(
  _prev: AdminFormState,
  form: FormData,
): Promise<AdminFormState & { ok?: boolean }> {
  const { supabase } = await requireAdmin();
  let raw: unknown;
  try {
    raw = JSON.parse(str(form, "material_colors", 20000) || "{}");
  } catch {
    return { error: "Tabla de colores inválida." };
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { error: "Tabla de colores inválida." };
  const byType = raw as Record<string, unknown>;

  const { data, error: readError } = await supabase
    .from("shop_settings")
    .select("material_types, filaments")
    .eq("id", true)
    .maybeSingle();
  if (readError) return { error: readError.message };
  const types = normalizeMaterialTypes(data?.material_types) ?? defaultMaterialTypes.map((t) => ({ ...t }));
  const palette = normalizePalette(data?.filaments) ?? defaultFilaments;
  const paletteIds = palette.map((c) => c.id);

  for (const t of types) {
    const picked = byType[t.id];
    if (!Array.isArray(picked)) continue;
    const ids = paletteIds.filter((id) => picked.includes(id));
    // Todos marcados = null: los colores que se agreguen a la paleta después también van a estar en este tipo.
    t.colors = ids.length === paletteIds.length ? null : ids;
  }
  // Un tipo sin colores marcados se guarda igual: simplemente no se ofrece en los pedidos.

  const { error } = await supabase.from("shop_settings").update({ material_types: types }).eq("id", true);
  if (error) return { error: error.message };
  updateTag("palette");
  refresh();
  return { ok: true };
}

export async function updateOrder(form: FormData) {
  const { supabase } = await requireAdmin();
  const id = str(form, "id", 40);
  const status = str(form, "status", 20) as OrderStatus;
  if (!orderStatuses.some((s) => s.id === status)) return;
  await supabase
    .from("orders")
    .update({ status, quote_amount: num(form, "quote_amount") })
    .eq("id", id);
  refresh();
}

export async function updateSettings(_prev: AdminFormState, form: FormData): Promise<AdminFormState & { ok?: boolean }> {
  const { supabase } = await requireAdmin();
  const maxQueue = num(form, "max_queue");
  const perDay = num(form, "prints_per_day");
  if (maxQueue == null || !Number.isInteger(maxQueue) || maxQueue < 0 || maxQueue > 1000)
    return { error: "El tope de cola tiene que ser un número entero entre 0 y 1000." };
  if (perDay == null || perDay <= 0 || perDay > 100)
    return { error: "Las impresiones por día tienen que ser un número mayor a 0 (podés usar decimales, ej. 0,5)." };

  const priceFactor = num(form, "multicolor_price_factor");
  const timeFactor = num(form, "multicolor_time_factor");
  if (priceFactor == null || priceFactor < 1 || priceFactor > 10)
    return { error: "El recargo multicolor tiene que ser un multiplicador entre 1 y 10 (1,5 = +50 %)." };
  if (timeFactor == null || timeFactor < 1 || timeFactor > 10)
    return { error: "El tiempo multicolor tiene que ser un multiplicador entre 1 y 10 (2 = el doble)." };
  const sizeFactors: Record<string, number> = {};
  for (const size of sizes.filter((s) => s.id !== "custom")) {
    const f = num(form, `size_${size.id}`);
    if (f == null || f <= 0 || f > 50) return { error: `Revisá el multiplicador del tamaño ${size.label}.` };
    sizeFactors[size.id] = f;
  }

  const { error } = await supabase
    .from("shop_settings")
    .update({
      accepting_orders: form.get("accepting_orders") === "on",
      max_queue: maxQueue,
      prints_per_day: perDay,
      multicolor_price_factor: priceFactor,
      multicolor_time_factor: timeFactor,
      size_price_factors: sizeFactors,
    })
    .eq("id", true);
  if (error) return { error: error.message };
  refresh();
  return { ok: true };
}

export async function updateWaitlist(form: FormData) {
  const { supabase } = await requireAdmin();
  const id = str(form, "id", 40);
  const status = str(form, "status", 20) as WaitlistStatus;
  if (!waitlistStatuses.some((s) => s.id === status) || status === "convertido") return;
  await supabase
    .from("waitlist")
    .update({ status, ...(status === "contactado" && { contacted_at: new Date().toISOString() }) })
    .eq("id", id);
  refresh();
}

/** Pasa una promesa de recontacto a la cola como pedido nuevo, con fecha estimada según la cola actual. */
export async function convertWaitlist(form: FormData) {
  const { supabase } = await requireAdmin();
  const id = str(form, "id", 40);
  const { data } = await supabase.from("waitlist").select("*").eq("id", id).maybeSingle();
  const entry = data as WaitlistEntry | null;
  if (!entry || entry.status === "convertido") return;

  const info = capacityInfo(await getCapacity());
  const { data: order, error } = await supabase
    .from("orders")
    .insert({
      code: orderCode(),
      kind: entry.kind,
      model_id: entry.model_id,
      model_title: entry.model_title,
      customer_name: entry.customer_name,
      email: entry.email,
      phone: entry.phone,
      material: entry.material,
      color_mode: entry.color_mode,
      color: entry.color,
      color_zones: entry.color_zones,
      size: entry.size,
      quantity: entry.quantity,
      notes: entry.notes,
      reference_key: entry.reference_key,
      estimated_delivery: deliveryFor(info, entry.color_mode),
      estimated_price: entry.estimated_price,
    })
    .select("id")
    .single();
  if (error || !order) return;
  await supabase.from("waitlist").update({ status: "convertido", order_id: order.id }).eq("id", id);
  refresh();
}

export async function signOut() {
  const { supabase } = await requireAdmin();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
