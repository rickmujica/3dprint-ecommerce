import { revalidatePath, updateTag } from "next/cache";

/**
 * Borra el caché de las páginas públicas (inicio, catálogo, categorías, fichas, sitemap) para que
 * la próxima visita las regenere con los datos nuevos. Solo se puede llamar desde server actions.
 *
 * En Cloudflare el aviso llega a todas las instancias gracias al tag cache en D1
 * (binding NEXT_TAG_CACHE_D1, ver open-next.config.ts). Si el binding no existe, no rompe nada:
 * las páginas se actualizan solas a la hora (revalidate = 3600), como antes.
 */
export function refreshPublicPages(...tags: string[]) {
  for (const tag of tags) updateTag(tag);
  // "/" + "layout" alcanza a todas las páginas que cuelgan del layout raíz.
  revalidatePath("/", "layout");
}

/** Después de crear, editar, publicar o despublicar modelos. */
export function refreshCatalog(slug?: string | null) {
  refreshPublicPages("models", ...(slug ? [`model:${slug}`] : []));
}
