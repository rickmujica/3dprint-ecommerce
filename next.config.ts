import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  // Sin cacheComponents: en Cloudflare Workers el render on-demand de Cache Components se cuelga
  // ("Worker's code had hung"), y el sitio caía cada vez que vencía la caché de una página.
  // Cloudflare cobra la optimización de imágenes; las miniaturas ya se generan livianas al subir.
  images: { unoptimized: true },
  experimental: {
    serverActions: { bodySizeLimit: "8mb" },
    // Volver a una vista del admin visitada hace menos de 30 s es instantáneo (no se pide de nuevo al servidor).
    // Guardar cualquier formulario (Server Action con refresh/updateTag) vacía esta caché del navegador.
    staleTimes: { dynamic: 30 },
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
