// Datos del sitio. Cambiá el nombre y textos acá.
export const site = {
  name: "Capa3D",
  tagline: "Impresiones 3D a pedido",
  description:
    "Catálogo de modelos 3D listos para imprimir en PLA, PETG, TPU o resina. Elegí un modelo, configurá material y color, o pedí un diseño personalizado.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "",
  currency: "PYG",
  locale: "es_PY",
};

export function whatsappLink(message: string) {
  const text = encodeURIComponent(message);
  return site.whatsapp ? `https://wa.me/${site.whatsapp}?text=${text}` : null;
}
