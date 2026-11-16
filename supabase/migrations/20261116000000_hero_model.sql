-- Modelo de la portada (hero): el admin elige cuál se muestra en grande en la página de inicio.
-- Si ninguno está marcado, la portada sigue mostrando el destacado más reciente.
-- Correr en el SQL Editor de Supabase después de las migraciones anteriores.

alter table public.models
  add column if not exists hero boolean not null default false;

-- Como mucho un modelo de portada a la vez.
create unique index if not exists models_single_hero on public.models (hero) where hero;
