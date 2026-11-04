"use client";

import { useEffect, useState } from "react";
import { BellRing, CalendarClock, Tag } from "lucide-react";

import { deliveryFor, formatDeliveryDate, type CapacityInfo } from "@/lib/delivery";
import type { ColorMode } from "@/lib/types";
import { formatPrice } from "@/lib/utils";

/**
 * Consulta la cola de impresión en el navegador: las fichas son estáticas (ISR),
 * pero la cola cambia con cada pedido.
 */
export function useCapacity() {
  const [info, setInfo] = useState<CapacityInfo | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/capacidad", { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<CapacityInfo>) : null))
      .then((data: CapacityInfo | null) => !cancelled && data && setInfo(data))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  return info;
}

export function CapacityNotice({
  info,
  full,
  mode = "mono",
  price,
}: {
  info: CapacityInfo | null;
  full?: boolean;
  mode?: ColorMode;
  /** Precio estimado total; undefined = no mostrar, null = a cotizar. */
  price?: number | null;
}) {
  if (full || (info && !info.available)) {
    return (
      <div role="status" className="flex gap-3 rounded-xl border-2 border-accent bg-accent/15 p-4 text-sm">
        <BellRing className="mt-0.5 size-5 shrink-0" />
        <div className="space-y-1">
          <p className="font-display font-semibold">Ahora mismo tenemos la cola de impresión llena.</p>
          <p className="text-muted-foreground">
            Dejanos tu email y tu pedido: te avisamos apenas se libere un lugar para tomarlo. No te cobramos nada ni
            reservamos nada hasta que confirmes.
          </p>
        </div>
      </div>
    );
  }
  if (!info) return null;
  return (
    <div role="status" className="space-y-2 rounded-xl border-2 border-primary/40 bg-primary/10 p-4 text-sm">
      {price !== undefined && (
        <p className="flex gap-3">
          <Tag className="mt-0.5 size-5 shrink-0 text-primary" />
          <span>
            {price != null ? (
              <>
                Precio estimado: <strong className="font-display text-base font-semibold">{formatPrice(price)}</strong>
                {mode === "multi" && <span className="text-muted-foreground"> (multicolor)</span>}
              </>
            ) : (
              "Precio: a cotizar."
            )}
          </span>
        </p>
      )}
      <p className="flex gap-3">
        <CalendarClock className="mt-0.5 size-5 shrink-0 text-primary" />
        <span>
          {info.queue > 0 ? "Debido al volumen de pedidos, la" : "La"} fecha estimada de entrega sería el{" "}
          <strong className="font-semibold">{formatDeliveryDate(deliveryFor(info, mode))}</strong>
          {mode === "multi" && <span className="text-muted-foreground"> (el multicolor tarda más)</span>}.
        </span>
      </p>
    </div>
  );
}

/** El pedido va a la lista de espera: el email pasa a ser obligatorio. */
export function isWaitlist(info: CapacityInfo | null, full?: boolean) {
  return Boolean(full || (info && !info.available));
}
