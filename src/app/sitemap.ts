import type { MetadataRoute } from "next";

import { getPublishedModels } from "@/lib/catalog";
import { site } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const models = await getPublishedModels();
  const url = (path: string) => new URL(path, site.url).toString();

  return [
    { url: url("/"), changeFrequency: "weekly", priority: 1 },
    { url: url("/modelos"), changeFrequency: "daily", priority: 0.9 },
    { url: url("/pedido-personalizado"), changeFrequency: "monthly", priority: 0.7 },
    ...models.map((m) => ({
      url: url(`/modelos/${m.slug}`),
      lastModified: m.created_at,
      changeFrequency: "weekly" as const,
      priority: 0.8,
      images: m.thumbnail_url ? [url(m.thumbnail_url)] : undefined,
    })),
  ];
}
