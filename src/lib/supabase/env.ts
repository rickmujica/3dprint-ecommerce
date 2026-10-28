export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

/** Sin credenciales, el sitio funciona en modo demo con el catálogo de ejemplo. */
export const hasSupabase = Boolean(supabaseUrl && supabaseKey);
