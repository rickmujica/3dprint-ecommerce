import { getAdmin } from "@/lib/auth";
import {
  getSketchfabDownload,
  getSketchfabModel,
  isAllowedSketchfabLicense,
  isSketchfabUid,
} from "@/lib/importers/sketchfab";

const MAX_BYTES = 95 * 1024 * 1024; // mismo tope que /api/admin/upload

/**
 * GET /api/admin/import/sketchfab/<uid>
 * Vuelve a verificar la licencia, pide el link temporal de descarga y le pasa el archivo al
 * navegador del admin, que lo convierte a GLB y lo sube a R2 con el flujo normal.
 */
export async function GET(_request: Request, ctx: RouteContext<"/api/admin/import/sketchfab/[uid]">) {
  if (!(await getAdmin())) return Response.json({ error: "No autorizado" }, { status: 401 });

  const { uid } = await ctx.params;
  if (!isSketchfabUid(uid)) return Response.json({ error: "Identificador inválido" }, { status: 400 });

  try {
    const model = await getSketchfabModel(uid);
    if (!isAllowedSketchfabLicense(model.licenseSlug)) {
      return Response.json(
        { error: `La licencia de este modelo (${model.licenseLabel ?? "desconocida"}) no permite vender impresiones.` },
        { status: 403 },
      );
    }

    const download = await getSketchfabDownload(uid);
    if (download.size && download.size > MAX_BYTES) {
      return Response.json({ error: "El archivo pesa más de 95 MB; importalo a mano." }, { status: 413 });
    }

    const file = await fetch(download.url, { cache: "no-store" });
    if (!file.ok || !file.body) return Response.json({ error: `La descarga falló (${file.status}).` }, { status: 502 });
    const length = Number(file.headers.get("content-length") ?? 0);
    if (length > MAX_BYTES) return Response.json({ error: "El archivo pesa más de 95 MB; importalo a mano." }, { status: 413 });

    return new Response(file.body, {
      headers: {
        "content-type": download.format === "glb" ? "model/gltf-binary" : "application/zip",
        "x-import-format": download.format,
        "cache-control": "no-store",
        ...(length ? { "content-length": String(length) } : {}),
      },
    });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Error al importar" }, { status: 502 });
  }
}
