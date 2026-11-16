import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
import memoryQueue from "@opennextjs/cloudflare/overrides/queue/memory-queue";
import d1NextTagCache from "@opennextjs/cloudflare/overrides/tag-cache/d1-next-tag-cache";

export default defineCloudflareConfig({
  incrementalCache: r2IncrementalCache,
  // Revalida en segundo plano las páginas ISR vencidas (usa el binding WORKER_SELF_REFERENCE).
  // Sin cola, OpenNext usa una "dummy" que no revalida nunca.
  queue: memoryQueue,
  // Registro compartido de revalidaciones (binding NEXT_TAG_CACHE_D1). Hace que revalidatePath/updateTag
  // del admin borren el caché en todas las instancias del Worker, no solo en la que atendió el guardado.
  // `opennextjs-cloudflare deploy` crea la tabla `revalidations` si no existe.
  tagCache: d1NextTagCache,
});
