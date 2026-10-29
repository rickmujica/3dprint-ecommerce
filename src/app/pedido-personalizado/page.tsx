import type { Metadata } from "next";
import { Camera, PenTool, Printer, Sparkles } from "lucide-react";

import { CustomOrderForm } from "@/components/custom-order-form";

export const metadata: Metadata = {
  title: "Pedido personalizado de impresión 3D",
  description: "Mandanos una foto, un boceto o una idea y la convertimos en una pieza impresa en 3D a medida.",
  alternates: { canonical: "/pedido-personalizado" },
};

const steps = [
  { icon: Camera, title: "Nos mandás la idea", text: "Una foto, un boceto o una descripción con medidas aproximadas." },
  { icon: Sparkles, title: "Vista previa", text: "Armamos un modelo 3D inicial y te lo mostramos para que lo apruebes." },
  { icon: PenTool, title: "Ajuste fino", text: "Lo dejamos imprimible: paredes, soportes y detalles en Blender." },
  { icon: Printer, title: "Cotización e impresión", text: "Te pasamos precio y plazo. Con tu OK, lo imprimimos." },
];

export default function CustomOrderPage() {
  return (
    <div className="mx-auto grid max-w-6xl gap-12 px-4 py-12 lg:grid-cols-[1fr_1.1fr]">
      <div className="space-y-8">
        <div className="space-y-4">
          <p className="font-mono text-sm text-primary">{"// a medida"}</p>
          <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
            De una foto a una <span className="text-filament">pieza real.</span>
          </h1>
          <p className="text-lg text-muted-foreground">
            Figuras, repuestos que ya no se consiguen, regalos personalizados, prototipos. Si se puede modelar, se puede imprimir.
          </p>
        </div>
        <ol className="space-y-4">
          {steps.map((s, i) => (
            <li key={s.title} className="flex gap-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border-2 border-foreground bg-accent text-accent-foreground shadow-extrude-sm">
                <s.icon className="size-5" />
              </span>
              <div>
                <p className="font-display font-semibold">
                  <span className="text-muted-foreground">{i + 1}.</span> {s.title}
                </p>
                <p className="text-sm text-muted-foreground">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
      <CustomOrderForm />
    </div>
  );
}
