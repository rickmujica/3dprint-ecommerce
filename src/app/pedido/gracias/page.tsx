import type { Metadata } from "next";
import { Suspense } from "react";
import { CheckCircle2 } from "lucide-react";

import { OrderSummary } from "./order-summary";

export const metadata: Metadata = {
  title: "¡Pedido recibido!",
  robots: { index: false },
};

export default function ThanksPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <CheckCircle2 className="mx-auto mb-6 size-16 text-primary" />
      <h1 className="mb-3 text-4xl font-bold">¡Pedido recibido!</h1>
      <Suspense fallback={<p className="text-muted-foreground">Cargando…</p>}>
        <OrderSummary />
      </Suspense>
    </div>
  );
}
