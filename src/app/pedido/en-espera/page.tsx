import type { Metadata } from "next";
import Link from "next/link";
import { BellRing } from "lucide-react";

import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Te avisamos cuando haya lugar",
  robots: { index: false },
};

export default function WaitlistThanksPage() {
  return (
    <div className="mx-auto max-w-xl space-y-6 px-4 py-20 text-center">
      <BellRing className="mx-auto size-16 text-primary" />
      <h1 className="text-4xl font-bold">¡Te anotamos!</h1>
      <p className="text-lg text-muted-foreground">
        Ahora mismo la impresora tiene la cola llena. Guardamos tu pedido y tu email: apenas se libere un lugar te
        escribimos para confirmarlo, con precio y fecha de entrega.
      </p>
      <p className="text-sm text-muted-foreground">No se cobra ni se reserva nada hasta que confirmes.</p>
      <Button asChild variant="outline" size="lg">
        <Link href="/modelos">Volver al catálogo</Link>
      </Button>
    </div>
  );
}
