import { getAdmin } from "@/lib/auth";
import { getModelsBucket, isSafeKey } from "@/lib/r2";

/** Descarga archivos privados (STL originales, fotos de pedidos). Solo admins. */
export async function GET(request: Request) {
  if (!(await getAdmin())) return new Response("No autorizado", { status: 401 });

  const key = new URL(request.url).searchParams.get("key") ?? "";
  if (!isSafeKey(key)) return new Response("Clave inválida", { status: 400 });

  const object = await (await getModelsBucket()).get(key);
  if (!object) return new Response("No encontrado", { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("cache-control", "private, no-store");
  headers.set("content-disposition", `inline; filename="${key.split("/").pop()}"`);
  return new Response(object.body, { headers });
}
