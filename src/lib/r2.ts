import { getCloudflareContext } from "@opennextjs/cloudflare";

/** Bucket R2 de modelos. Claves: public/... (se sirven en /files) y private/... (nunca se sirven). */
export async function getModelsBucket() {
  const { env } = await getCloudflareContext({ async: true });
  return env.MODELS;
}

export const publicFileUrl = (key: string) => `/files/${key}`;

const SAFE_KEY = /^(public|private)\/[a-z0-9][a-z0-9/_.-]*$/;
export function isSafeKey(key: string) {
  return SAFE_KEY.test(key) && !key.includes("..");
}
