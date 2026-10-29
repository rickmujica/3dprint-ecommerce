import { redirect } from "next/navigation";
import { hasSupabase } from "./supabase/env";
import { createSessionClient } from "./supabase/server";

/** Devuelve el admin logueado, o null. Lee cookies: llamar dentro de <Suspense> o en Server Actions. */
export async function getAdmin() {
  if (!hasSupabase) return null;
  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.from("admins").select("user_id").eq("user_id", user.id).maybeSingle();
  if (!data) return null;
  return { id: user.id, email: user.email ?? "", supabase };
}

export async function requireAdmin() {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}
