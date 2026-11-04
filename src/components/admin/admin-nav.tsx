"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

const links = [
  { href: "/admin", label: "Pedidos", exact: true },
  { href: "/admin/recontacto", label: "Recontacto" },
  { href: "/admin/modelos", label: "Modelos", exclude: "/admin/modelos/nuevo" },
  { href: "/admin/importar", label: "Importar" },
  { href: "/admin/filamentos", label: "Filamentos" },
  { href: "/admin/ajustes", label: "Ajustes" },
] as const;

function isActive(pathname: string, link: (typeof links)[number]) {
  if ("exact" in link && link.exact) return pathname === link.href;
  if ("exclude" in link && pathname.startsWith(link.exclude)) return false;
  return pathname === link.href || pathname.startsWith(`${link.href}/`);
}

/** Navegación del panel: marca la vista actual y muestra un spinner en el botón mientras carga la siguiente. */
export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Panel admin" className="flex flex-wrap items-center gap-2">
      {links.map((link) => {
        const active = isActive(pathname, link);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              active && "bg-foreground text-background hover:bg-foreground/90",
            )}
          >
            {link.label}
            <PendingSpinner />
          </Link>
        );
      })}
      <Link
        href="/admin/modelos/nuevo"
        aria-current={pathname === "/admin/modelos/nuevo" ? "page" : undefined}
        className={cn(
          buttonVariants({ variant: "extrude", size: "sm" }),
          pathname === "/admin/modelos/nuevo" && "translate-x-[3px] translate-y-[3px] shadow-none",
        )}
      >
        Nuevo modelo
        <PendingSpinner />
      </Link>
    </nav>
  );
}

function PendingSpinner() {
  const { pending } = useLinkStatus();
  return pending ? <Loader2 aria-hidden className="animate-spin" /> : null;
}
