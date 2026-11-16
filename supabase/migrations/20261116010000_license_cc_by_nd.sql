-- Licencia CC BY-ND (Atribución-SinDerivadas): permite vender impresiones del diseño tal cual, citando al autor.
-- Correr en el SQL Editor de Supabase ANTES de cargar modelos con esta licencia
-- (Postgres no deja usar un valor nuevo de un enum en la misma ejecución que lo crea).
alter type public.model_license add value if not exists 'cc-by-nd';
