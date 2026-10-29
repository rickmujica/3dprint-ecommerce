import { getModelsBucket, isSafeKey } from "@/lib/r2";

// Sirve los archivos públicos del bucket R2 (GLB y miniaturas). Lo privado (STL, fotos) nunca sale por acá.
export async function GET(request: Request, { params }: RouteContext<"/files/[...key]">) {
  const key = (await params).key.join("/");
  if (!key.startsWith("public/") || !isSafeKey(key)) {
    return new Response("Not found", { status: 404 });
  }

  const bucket = await getModelsBucket();
  const object = await bucket.get(key, { onlyIf: request.headers });
  if (!object) return new Response("Not found", { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  // Las claves llevan el id del modelo y no se reescriben: se pueden cachear para siempre.
  headers.set("cache-control", "public, max-age=31536000, immutable");
  headers.set("access-control-allow-origin", "*");

  if (!("body" in object)) return new Response(null, { status: 304, headers });
  return new Response(object.body, { headers });
}
