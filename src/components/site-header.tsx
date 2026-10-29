import Link from "next/link";

import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

const nav = [
  { href: "/modelos", label: "Catálogo" },
  { href: "/pedido-personalizado", label: "Personalizado" },
  { href: "/#como-funciona", label: "Cómo funciona" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b-2 border-foreground/10 bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4">
        <Link href="/" aria-label="Inicio">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {nav.map((item) => (
            <Button key={item.href} asChild variant="ghost" size="sm">
              <Link href={item.href}>{item.label}</Link>
            </Button>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <ThemeToggle />
          <Button asChild variant="extrude" size="sm" className="hidden sm:inline-flex">
            <Link href="/modelos">Hacer un pedido</Link>
          </Button>
        </div>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-2 pb-2 md:hidden">
        {nav.map((item) => (
          <Button key={item.href} asChild variant="ghost" size="sm">
            <Link href={item.href}>{item.label}</Link>
          </Button>
        ))}
      </nav>
    </header>
  );
}
