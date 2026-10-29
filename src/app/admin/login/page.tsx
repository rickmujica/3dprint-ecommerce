import { LoginForm } from "@/components/admin/login-form";
import { hasSupabase } from "@/lib/supabase/env";

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-sm space-y-6 rounded-2xl border-2 border-foreground bg-card p-6 shadow-extrude dark:border-extrude/60">
      <h1 className="text-2xl font-bold">Panel admin</h1>
      {hasSupabase ? (
        <LoginForm />
      ) : (
        <p className="text-sm text-muted-foreground">
          Configurá Supabase (ver README) para habilitar el panel. Mientras tanto el sitio funciona en modo demo.
        </p>
      )}
    </div>
  );
}
