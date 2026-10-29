import { createClient } from "@supabase/supabase-js";
import { supabaseKey, supabaseUrl } from "./env";

/**
 * Cliente anónimo sin cookies. Se puede usar dentro de "use cache" porque no depende del request:
 * solo ve lo que las políticas RLS permiten al público (modelos publicados, alta de pedidos).
 */
export function createPublicClient() {
  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
