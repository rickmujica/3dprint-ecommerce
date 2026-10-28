import Link from "next/link";

import { Logo } from "@/components/logo";
import { site } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t-2 border-foreground/10">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-[2fr_1fr_1fr]">
        <div className="space-y-3">
          <Logo />
          <p className="max-w-sm text-sm text-muted-foreground">{site.description}</p>
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-display font-semibold">Tienda</p>
          <ul className="space-y-1 text-muted-foreground">
            <li><Link className="hover:text-foreground" href="/modelos">Catálogo</Link></li>
            <li><Link className="hover:text-foreground" href="/pedido-personalizado">Pedido personalizado</Link></li>
          </ul>
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-display font-semibold">Licencias</p>
          <p className="text-muted-foreground">
            Solo imprimimos diseños propios o con licencia que permite uso comercial. Cada ficha indica autor y licencia.
          </p>
        </div>
      </div>
      <div className="h-1.5 bg-filament" />
    </footer>
  );
}
