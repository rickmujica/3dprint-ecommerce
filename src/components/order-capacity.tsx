"use client";

import { useEffect, useState } from "react";
import { BellRing, CalendarClock } from "lucide-react";

import { formatDeliveryDate, type CapacityInfo } from "@/lib/delivery";

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

export function CapacityNotice({ info, full }: { info: CapacityInfo | null; full?: boolean }) {
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
    <div role="status" className="flex gap-3 rounded-xl border-2 border-primary/40 bg-primary/10 p-4 text-sm">
      <CalendarClock className="mt-0.5 size-5 shrink-0 text-primary" />
      <p>
        {info.queue > 0 ? "Debido al volumen de pedidos, la" : "La"} fecha estimada de entrega sería el{" "}
        <strong className="font-semibold">{formatDeliveryDate(info.estimatedDelivery)}</strong>.
      </p>
    </div>
  );
}

/** El pedido va a la lista de espera: el email pasa a ser obligatorio. */
export function isWaitlist(info: CapacityInfo | null, full?: boolean) {
  return Boolean(full || (info && !info.available));
}
