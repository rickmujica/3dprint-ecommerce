import { getAdmin } from "@/lib/auth";
import { getModelsBucket, isSafeKey } from "@/lib/r2";

const MAX_BYTES = 95 * 1024 * 1024; // Workers acepta hasta 100 MB por request en el plan gratis.

/** PUT /api/admin/upload?key=public/models/<id>/model.glb  (cuerpo = el archivo) */
export async function PUT(request: Request) {
  if (!(await getAdmin())) return Response.json({ error: "No autorizado" }, { status: 401 });

  const key = new URL(request.url).searchParams.get("key") ?? "";
  if (!/^(public|private)\/models\//.test(key) || !isSafeKey(key)) {
    return Response.json({ error: "Clave inválida" }, { status: 400 });
  }
  const size = Number(request.headers.get("content-length") ?? 0);
  if (!request.body || size > MAX_BYTES) {
    return Response.json({ error: "Archivo vacío o demasiado grande" }, { status: 413 });
  }

  const bucket = await getModelsBucket();
  await bucket.put(key, await request.arrayBuffer(), {
    httpMetadata: { contentType: request.headers.get("content-type") ?? "application/octet-stream" },
  });
  return Response.json({ key });
}
