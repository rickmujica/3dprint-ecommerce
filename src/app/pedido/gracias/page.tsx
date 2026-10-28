import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CheckCircle2, MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { whatsappLink } from "@/lib/site";
import { hasSupabase } from "@/lib/supabase/env";

export const metadata: Metadata = {
  title: "¡Pedido recibido!",
  robots: { index: false },
};

export default function ThanksPage({ searchParams }: PageProps<"/pedido/gracias">) {
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <CheckCircle2 className="mx-auto mb-6 size-16 text-primary" />
      <h1 className="mb-3 text-4xl font-bold">¡Pedido recibido!</h1>
      <Suspense fallback={<p className="text-muted-foreground">Cargando…</p>}>
        <OrderSummary searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function OrderSummary({ searchParams }: Pick<PageProps<"/pedido/gracias">, "searchParams">) {
  const params = await searchParams;
  const code = typeof params.codigo === "string" ? params.codigo : null;
  const model = typeof params.modelo === "string" ? params.modelo : null;
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
