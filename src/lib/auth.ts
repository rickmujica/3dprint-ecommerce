import { cache } from "react";
import { redirect } from "next/navigation";
import { hasSupabase } from "./supabase/env";
import { createSessionClient } from "./supabase/server";

/**
 * Devuelve el admin logueado, o null. Lee cookies: llamar dentro de <Suspense> o en Server Actions.
 *
 * Está envuelto en `cache()`: el layout del panel y la página llaman a `requireAdmin()` en el mismo
 * request y antes cada llamada repetía el viaje a Supabase Auth + la consulta a `admins`.
 * Usa `getClaims()`, que verifica el JWT localmente cuando el proyecto tiene claves de firma
 * asimétricas (sin ir al servidor de Auth); si no, cae solo a `getUser()`.
 */
export const getAdmin = cache(async () => {
  if (!hasSupabase) return null;
  const supabase = await createSessionClient();
  const { data: auth } = await supabase.auth.getClaims();
  const claims = auth?.claims;
  if (!claims?.sub) return null;

  const { data } = await supabase.from("admins").select("user_id").eq("user_id", claims.sub).maybeSingle();
  if (!data) return null;
  return { id: claims.sub, email: typeof claims.email === "string" ? claims.email : "", supabase };
});

export async function requireAdmin() {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}
