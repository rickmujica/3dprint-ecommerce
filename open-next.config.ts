import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
import memoryQueue from "@opennextjs/cloudflare/overrides/queue/memory-queue";

export default defineCloudflareConfig({
  incrementalCache: r2IncrementalCache,
  // Revalida en segundo plano las páginas ISR vencidas (usa el binding WORKER_SELF_REFERENCE).
  // Sin cola, OpenNext usa una "dummy" que no revalida nunca.
  queue: memoryQueue,
});
