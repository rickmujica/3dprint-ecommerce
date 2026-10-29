"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { whatsappLink } from "@/lib/site";
import { hasSupabase } from "@/lib/supabase/env";

// Se lee en el navegador: así la página queda 100% estática y no depende de streaming en el Worker.
export function OrderSummary() {
  const params = useSearchParams();
  const code = params.get("codigo");
  const model = params.get("modelo");
  const wa = code
    ? whatsappLink(`Hola! Hice el pedido ${code}${model ? ` (${model})` : ""} en la web y quería coordinar.`)
    : null;

  return (
    <div className="space-y-6">
      <p className="text-lg text-muted-foreground">
        Te vamos a escribir con el precio y el plazo de entrega. No se cobra nada hasta que confirmes.
      </p>
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
