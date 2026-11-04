-- Tipos de filamento (PLA, PETG…) editables desde /admin/filamentos, y tipos permitidos por modelo.
-- Correr en el SQL Editor de Supabase (después de 20261105010000_filaments.sql).

alter table public.shop_settings
  -- [{"id": "PLA", "label": "PLA", "hint": "…", "price_factor": 1, "available": true}]
  -- price_factor multiplica el precio del modelo (1,3 = 30 % más caro que el precio base).
  add column material_types jsonb not null default '[
    {"id": "PLA", "label": "PLA", "hint": "Rígido y económico. Ideal para decoración.", "price_factor": 1, "available": true},
    {"id": "PETG", "label": "PETG", "hint": "Más resistente al calor y a golpes.", "price_factor": 1, "available": true},
    {"id": "TPU", "label": "TPU (flexible)", "hint": "Goma flexible: fundas, topes, juntas.", "price_factor": 1, "available": true},
    {"id": "Resina", "label": "Resina", "hint": "Máximo detalle: miniaturas y joyería.", "price_factor": 1, "available": true}
  ]'::jsonb check (jsonb_typeof(material_types) = 'array');

-- Tipos de filamento con los que se puede pedir el modelo. null = todos los disponibles.
alter table public.models
  add column allowed_materials text[];

create or replace function public.material_types()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select s.material_types from public.shop_settings s where s.id;
$$;

revoke all on function public.material_types() from public;
grant execute on function public.material_types() to anon, authenticated;
