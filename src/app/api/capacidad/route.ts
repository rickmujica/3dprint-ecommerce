import { capacityInfo, getCapacity } from "@/lib/capacity";

// Cambia con cada pedido: nunca se cachea.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const info = capacityInfo(await getCapacity());
    return Response.json(info, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
