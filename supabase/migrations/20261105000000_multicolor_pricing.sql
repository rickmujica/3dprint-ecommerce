-- Multicolor por zonas, precios por tamaño/multicolor y peso de los pedidos multicolor en la cola.
-- Correr en el SQL Editor de Supabase ANTES de desplegar el código que la usa (el catálogo lee las columnas nuevas).

-- Modelos ------------------------------------------------------------------

alter table public.models
  -- Zonas de color del modelo: [{"name": "Pelo", "color": "negro", "material": "Hair"}].
  -- Vacío = pieza de un solo color. "material" (opcional) es el material del GLB que se tiñe en la vista previa.
  add column color_zones jsonb not null default '[]'::jsonb check (jsonb_typeof(color_zones) = 'array'),
  -- Colores fijos: el cliente no puede cambiarlos (p. ej. figuras con más colores de los que carga la impresora).
  add column colors_locked boolean not null default false,
  -- Precio multicolor al 100 %. null = precio base × recargo multicolor de los ajustes.
  add column multicolor_price numeric(12, 0) check (multicolor_price is null or multicolor_price >= 0);

-- Ajustes ------------------------------------------------------------------

alter table public.shop_settings
  -- Precio multicolor = precio base × este factor (1,5 = +50 %), salvo que el modelo tenga precio multicolor propio.
  add column multicolor_price_factor numeric(4, 2) not null default 1.5 check (multicolor_price_factor >= 1 and multicolor_price_factor <= 10),
  -- Un pedido multicolor ocupa este número de lugares en la cola (2 = tarda el doble).
  add column multicolor_time_factor numeric(4, 2) not null default 2 check (multicolor_time_factor >= 1 and multicolor_time_factor <= 10),
  -- Multiplicador de precio por tamaño (clave = id de tamaño de la web).
  add column size_price_factors jsonb not null default '{"50": 0.6, "100": 1, "150": 2}'::jsonb
    check (jsonb_typeof(size_price_factors) = 'object');

-- Pedidos y lista de espera ------------------------------------------------

alter table public.orders
  add column color_zones jsonb check (color_zones is null or jsonb_typeof(color_zones) = 'array'),
  -- Precio estimado que vio el cliente (el definitivo es quote_amount).
  add column estimated_price numeric(12, 0) check (estimated_price is null or estimated_price >= 0);

alter table public.waitlist
  add column color_zones jsonb check (color_zones is null or jsonb_typeof(color_zones) = 'array'),
  add column estimated_price numeric(12, 0) check (estimated_price is null or estimated_price >= 0);

-- Cola ponderada: un multicolor cuenta como multicolor_time_factor lugares ---------

drop function private.queue_size();
create function private.queue_size()
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(case when o.color_mode = 'multi' then s.multicolor_time_factor else 1 end), 0)
  from public.orders o
  cross join public.shop_settings s
  where s.id and o.status in ('nuevo', 'cotizado', 'pagado', 'imprimiendo');
$$;

revoke all on function private.queue_size() from public;
grant execute on function private.queue_size() to anon, authenticated;

create or replace function public.order_capacity()
returns json
language sql
stable
security definer
set search_path = ''
as $$
  select json_build_object(
    'accepting_orders', s.accepting_orders,
    'max_queue', s.max_queue,
    'prints_per_day', s.prints_per_day,
    'queue', private.queue_size(),
    'multicolor_time_factor', s.multicolor_time_factor,
    'multicolor_price_factor', s.multicolor_price_factor,
    'size_price_factors', s.size_price_factors
  )
  from public.shop_settings s where s.id;
$$;
