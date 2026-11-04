import { getCloudflareContext } from "@opennextjs/cloudflare";

import type { LicenseId } from "@/lib/types";

/**
 * Importación desde la API oficial de Sketchfab (Data API v3 + Download API).
 *
 * - Buscar es público; descargar exige el token de API de una cuenta de Sketchfab
 *   (Settings → Password & API en sketchfab.com), guardado como secreto SKETCHFAB_API_TOKEN.
 * - Sus términos piden mostrar la licencia CC, dar crédito al autor con link al modelo
 *   y aclarar que el modelo viene de Sketchfab. La ficha del catálogo ya lo hace con
 *   author_name / author_url / source_url.
 * - El link de descarga dura 5 minutos y no se debe guardar: se usa una vez y listo.
 */

const API = "https://api.sketchfab.com/v3";

/** Licencias de Sketchfab que permiten vender impresiones. ND y NC quedan afuera. */
export const sketchfabLicenses = {
  cc0: { label: "CC0 (dominio público)", id: "cc0" },
  by: { label: "CC BY", id: "cc-by" },
  "by-sa": { label: "CC BY-SA", id: "cc-by-sa" },
} as const satisfies Record<string, { label: string; id: LicenseId }>;

export type SketchfabLicenseSlug = keyof typeof sketchfabLicenses;

export function isAllowedSketchfabLicense(slug: string | null | undefined): slug is SketchfabLicenseSlug {
  return !!slug && Object.hasOwn(sketchfabLicenses, slug);
}

export type ImportCandidate = {
  uid: string;
  title: string;
  description: string;
  tags: string[];
  authorName: string;
  authorUrl: string | null;
  sourceUrl: string;
  thumbnailUrl: string | null;
  /** Slug de licencia de Sketchfab (by, by-sa, cc0, by-nc…) o null si no vino. */
  licenseSlug: string | null;
  licenseLabel: string | null;
  faceCount: number | null;
};

type RawModel = {
  uid?: string;
  name?: string;
  description?: string;
  viewerUrl?: string;
  faceCount?: number;
  tags?: { name?: string; slug?: string }[];
  user?: { username?: string; displayName?: string; profileUrl?: string };
  thumbnails?: { images?: { url?: string; width?: number }[] };
  license?: string | { slug?: string; label?: string } | null;
  isDownloadable?: boolean;
};

const UID = /^[a-f0-9]{32}$/;
export const isSketchfabUid = (uid: string) => UID.test(uid);

async function secret(name: string) {
  const fromProcess = process.env[name];
  if (fromProcess) return fromProcess;
  try {
    const { env } = await getCloudflareContext({ async: true });
    const value = (env as unknown as Record<string, unknown>)[name];
    return typeof value === "string" ? value : undefined;
  } catch {
    return undefined;
  }
}

export async function getSketchfabToken() {
  return secret("SKETCHFAB_API_TOKEN");
}

async function api<T>(path: string, auth = false): Promise<T> {
  const headers: Record<string, string> = { accept: "application/json" };
  if (auth) {
    const token = await getSketchfabToken();
    if (!token) throw new Error("Falta configurar el secreto SKETCHFAB_API_TOKEN.");
    headers.authorization = `Token ${token}`;
  }
  const res = await fetch(`${API}${path}`, { headers, cache: "no-store" });
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) throw new Error("Sketchfab rechazó el token (revisá SKETCHFAB_API_TOKEN).");
    if (res.status === 404) throw new Error("Ese modelo ya no existe en Sketchfab.");
    if (res.status === 429) throw new Error("Sketchfab está limitando pedidos; probá en un minuto.");
    throw new Error(`Sketchfab respondió ${res.status}.`);
  }
  return (await res.json()) as T;
}

function normalize(m: RawModel): ImportCandidate | null {
  if (!m.uid || !isSketchfabUid(m.uid)) return null;
  const images = [...(m.thumbnails?.images ?? [])].filter((i) => i.url).sort((a, b) => (a.width ?? 0) - (b.width ?? 0));
  const thumb = images.find((i) => (i.width ?? 0) >= 400) ?? images.at(-1);
  const license = typeof m.license === "string" ? { slug: m.license, label: m.license } : m.license;
  const username = m.user?.username;
  return {
    uid: m.uid,
    title: (m.name ?? "Sin título").trim(),
    description: (m.description ?? "").trim(),
    tags: (m.tags ?? []).map((t) => (t.slug ?? t.name ?? "").toLowerCase()).filter(Boolean).slice(0, 12),
    authorName: m.user?.displayName || username || "Autor desconocido",
    authorUrl: m.user?.profileUrl ?? (username ? `https://sketchfab.com/${encodeURIComponent(username)}` : null),
    sourceUrl: m.viewerUrl ?? `https://sketchfab.com/3d-models/${m.uid}`,
    thumbnailUrl: thumb?.url ?? null,
    licenseSlug: license?.slug ?? null,
    licenseLabel: license?.label ?? license?.slug ?? null,
    faceCount: typeof m.faceCount === "number" ? m.faceCount : null,
  };
}

export async function searchSketchfab(opts: { q: string; license: SketchfabLicenseSlug; cursor?: string }) {
  const params = new URLSearchParams({
    type: "models",
    downloadable: "true",
    license: opts.license,
    count: "24",
  });
  if (opts.q) params.set("q", opts.q);
  if (opts.cursor) params.set("cursor", opts.cursor);

  const data = await api<{ results?: RawModel[]; cursors?: { next?: string | null } }>(`/search?${params}`);
  const results = (data.results ?? []).map(normalize).filter((m): m is ImportCandidate => m !== null);
  return {
    // Si la API devolviera algo con otra licencia (o sin licencia), no lo mostramos como importable.
    results: results.map((r) => ({ ...r, licenseSlug: r.licenseSlug ?? opts.license })),
    nextCursor: data.cursors?.next ?? null,
  };
}

export async function getSketchfabModel(uid: string) {
  if (!isSketchfabUid(uid)) throw new Error("Identificador de Sketchfab inválido.");
  const model = normalize(await api<RawModel>(`/models/${uid}`));
  if (!model) throw new Error("Respuesta inesperada de Sketchfab.");
  return model;
}

type DownloadOption = { url?: string; size?: number; expires?: number };

/**
 * Pide el link de descarga temporal. Prefiere GLB (un solo archivo); si no hay, el glTF en ZIP,
 * que el navegador del admin convierte a GLB.
 */
export async function getSketchfabDownload(uid: string) {
  if (!isSketchfabUid(uid)) throw new Error("Identificador de Sketchfab inválido.");
  const data = await api<{ glb?: DownloadOption; gltf?: DownloadOption }>(`/models/${uid}/download`, true);
  const pick = data.glb?.url
    ? { ...data.glb, format: "glb" as const }
    : data.gltf?.url
      ? { ...data.gltf, format: "gltf-zip" as const }
      : null;
  if (!pick?.url) throw new Error("Este modelo no ofrece descarga en GLB/glTF.");
  if (new URL(pick.url).protocol !== "https:") throw new Error("Sketchfab devolvió un link de descarga inesperado.");
  return { url: pick.url, size: pick.size ?? null, format: pick.format };
}
