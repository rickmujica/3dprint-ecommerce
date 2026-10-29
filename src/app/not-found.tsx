import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "No encontrado",
  robots: { index: false },
};

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="text-filament font-display text-8xl font-bold">404</p>
      <h1 className="mb-6 mt-2 text-3xl font-bold">Esta pieza no está en la cama de impresión</h1>
      <Button asChild variant="extrude" size="lg">
        <Link href="/modelos">Ver el catálogo</Link>
      </Button>
    </div>
  );
}
