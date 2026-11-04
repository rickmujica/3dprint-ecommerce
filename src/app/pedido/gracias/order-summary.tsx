"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CalendarClock, MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { whatsappLink } from "@/lib/site";
import { formatDeliveryDate } from "@/lib/delivery";
import { hasSupabase } from "@/lib/supabase/env";
import { formatPrice } from "@/lib/utils";

// Se lee en el navegador: así la página queda 100% estática y no depende de streaming en el Worker.
export function OrderSummary() {
  const params = useSearchParams();
  const code = params.get("codigo");
  const model = params.get("modelo");
  const delivery = params.get("entrega");
  const price = Number(params.get("precio"));
  const validPrice = Number.isFinite(price) && price > 0 ? price : null;
  const validDelivery = delivery && /^\d{4}-\d{2}-\d{2}$/.test(delivery) ? delivery : null;
  const wa = code
    ? whatsappLink(`Hola! Hice el pedido ${code}${model ? ` (${model})` : ""} en la web y quería coordinar.`)
    : null;

  return (
    <div className="space-y-6">
      <p className="text-lg text-muted-foreground">
        Te vamos a escribir con el precio y el plazo de entrega. No se cobra nada hasta que confirmes.
      </p>
      {validDelivery && (
        <p className="mx-auto flex max-w-md items-start gap-3 rounded-xl border-2 border-primary/40 bg-primary/10 p-4 text-left text-sm">
          <CalendarClock className="mt-0.5 size-5 shrink-0 text-primary" />
          <span>
            Debido al volumen de pedidos, la fecha estimada de entrega sería el{" "}
            <strong>{formatDeliveryDate(validDelivery)}</strong>.
            {validPrice != null && (
              <>
                {" "}Precio estimado: <strong>{formatPrice(validPrice)}</strong>.
              </>
            )}{" "}
            Te confirmamos precio y fecha antes de imprimir.
          </span>
        </p>
      )}
      {code && (
        <p className="inline-block rounded-xl border-2 border-foreground px-5 py-3 font-mono text-2xl font-bold shadow-extrude-sm dark:border-extrude">
          {code}
        </p>
      )}
      {!hasSupabase && (
        <p className="text-sm text-muted-foreground">(Modo demo: el pedido no se guardó porque Supabase no está configurado.)</p>
      )}
      <div className="flex flex-wrap justify-center gap-3">
        {wa && (
          <Button asChild variant="extrude" size="lg">
            <a href={wa} target="_blank" rel="noopener noreferrer">
              <MessageCircle /> Seguir por WhatsApp
            </a>
          </Button>
        )}
        <Button asChild variant="outline" size="lg">
          <Link href="/modelos">Volver al catálogo</Link>
        </Button>
      </div>
    </div>
  );
}
