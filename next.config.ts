import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  // Sin cacheComponents: en Cloudflare Workers el render on-demand de Cache Components se cuelga
  // ("Worker's code had hung"), y el sitio caía cada vez que vencía la caché de una página.
  // Cloudflare cobra la optimización de imágenes; las miniaturas ya se generan livianas al subir.
  images: { unoptimized: true },
  experimental: {
    serverActions: { bodySizeLimit: "8mb" },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

// Expone los bindings de Cloudflare (R2) a `next dev`.
initOpenNextCloudflareForDev();
