-- Paleta de filamentos editable desde /admin/filamentos.
-- Correr en el SQL Editor de Supabase (después de 20261105000000_multicolor_pricing.sql).

alter table public.shop_settings
  add column filaments jsonb not null default '[{"id": "negro", "label": "Negro", "hex": "#111111", "available": true}, {"id": "blanco", "label": "Blanco", "hex": "#f5f5f5", "available": true}, {"id": "violeta", "label": "Violeta", "hex": "#a855f7", "available": true}, {"id": "cian", "label": "Cian", "hex": "#06b6d4", "available": true}, {"id": "magenta", "label": "Magenta", "hex": "#ec4899", "available": true}, {"id": "lima", "label": "Lima", "hex": "#84cc16", "available": true}, {"id": "naranja", "label": "Naranja", "hex": "#f97316", "available": true}, {"id": "gris", "label": "Gris", "hex": "#9ca3af", "available": true}, {"id": "rojo", "label": "Rojo", "hex": "#dc2626", "available": true}, {"id": "azul", "label": "Azul", "hex": "#2563eb", "available": true}, {"id": "amarillo", "label": "Amarillo", "hex": "#facc15", "available": true}, {"id": "verde", "label": "Verde", "hex": "#16a34a", "available": true}, {"id": "piel", "label": "Piel", "hex": "#f2c9a0", "available": true}, {"id": "marron", "label": "Marrón", "hex": "#7c4a21", "available": true}, {"id": "dorado", "label": "Dorado", "hex": "#c9a227", "available": true}, {"id": "plata", "label": "Plata", "hex": "#c0c0c8", "available": true}]'::jsonb
    check (jsonb_typeof(filaments) = 'array');

-- La web pública necesita la paleta para los formularios de pedido.
create or replace function public.filament_palette()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select s.filaments from public.shop_settings s where s.id;
$$;

revoke all on function public.filament_palette() from public;
grant execute on function public.filament_palette() to anon, authenticated;
