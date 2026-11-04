import { Suspense } from "react";
import { LogOut } from "lucide-react";

import { signOut } from "@/app/actions/admin";
import { AdminNav } from "@/components/admin/admin-nav";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth";

// El panel depende de la sesión: no tiene sentido prerenderizarlo.
export const dynamic = "force-dynamic";

export default function PanelLayout({ children }: LayoutProps<"/admin">) {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Cargando panel…</p>}>
      <Gate>{children}</Gate>
    </Suspense>
  );
}

async function Gate({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-2 border-b-2 border-foreground/10 pb-4">
        <AdminNav />
        <form action={signOut} className="ml-auto flex items-center gap-3 text-sm text-muted-foreground">
          {admin.email}
          <Button type="submit" variant="outline" size="sm"><LogOut /> Salir</Button>
        </form>
      </div>
      {children}
    </div>
  );
}
