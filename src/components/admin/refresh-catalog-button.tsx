"use client";

import { useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { refreshStorefront } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";

/** Borra el caché de la tienda para que se vean al instante los cambios hechos fuera del admin. */
export function RefreshCatalogButton() {
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      title="Usalo después de cargar o editar modelos directo en el SQL Editor de Supabase"
      onClick={() =>
        start(async () => {
          try {
            await refreshStorefront();
            toast.success("Catálogo actualizado. La tienda ya muestra los últimos cambios.");
          } catch {
            toast.error("No se pudo actualizar el catálogo. Probá de nuevo.");
          }
        })
      }
    >
      <RefreshCw className={pending ? "animate-spin" : undefined} />
      {pending ? "Actualizando…" : "Actualizar catálogo"}
    </Button>
  );
}
