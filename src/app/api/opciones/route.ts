import { fetchMaterialTypes, fetchPalette } from "@/lib/palette-server";

// Tipos de filamento y colores tal como están ahora en el admin (las fichas son ISR y pueden tener 1 h).
export const dynamic = "force-dynamic";

export async function GET() {
  const [palette, materialTypes] = await Promise.all([fetchPalette(), fetchMaterialTypes()]);
  return Response.json({ palette, materialTypes }, { headers: { "Cache-Control": "no-store" } });
}
