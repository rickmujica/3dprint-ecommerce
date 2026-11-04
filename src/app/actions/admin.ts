"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth";
import { capacityInfo, getCapacity } from "@/lib/capacity";
import { licenses, orderStatuses, waitlistStatuses } from "@/lib/options";
import { orderCode } from "@/lib/order-code";
import { isSafeKey, publicFileUrl } from "@/lib/r2";
import type { LicenseId, OrderStatus, WaitlistEntry, WaitlistStatus } from "@/lib/types";
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

  const { error } = await supabase
    .from("shop_settings")
    .update({ accepting_orders: form.get("accepting_orders") === "on", max_queue: maxQueue, prints_per_day: perDay })
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
      size: entry.size,
      quantity: entry.quantity,
      notes: entry.notes,
      reference_key: entry.reference_key,
      estimated_delivery: info.estimatedDelivery,
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
