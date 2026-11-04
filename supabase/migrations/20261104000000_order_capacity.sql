-- Capacidad de impresión: tope de cola, impresiones por día, lista de espera ("promesas de recontacto")
-- y pedidos multicolor. Correr en el SQL Editor de Supabase después de las migraciones anteriores.

-- Ajustes del taller (una sola fila) ----------------------------------------

create table public.shop_settings (
  id boolean primary key default true check (id),
  -- Interruptor manual: si está apagado, nadie puede hacer pedidos (van a la lista de espera).
  accepting_orders boolean not null default true,
  -- Cantidad tope de pedidos en cola. Al llegar a este número, los pedidos nuevos van a la lista de espera.
  max_queue integer not null default 10 check (max_queue between 0 and 1000),
  -- Pedidos que se pueden terminar por día. Sirve para calcular la fecha estimada de entrega.
  prints_per_day numeric(5, 2) not null default 1 check (prints_per_day > 0 and prints_per_day <= 100),
  updated_at timestamptz not null default now()
);

insert into public.shop_settings (id) values (true) on conflict do nothing;

create trigger shop_settings_touch before update on public.shop_settings
  for each row execute function public.touch_updated_at();

alter table public.shop_settings enable row level security;

create policy "admins ven ajustes" on public.shop_settings
  for select to authenticated using ((select private.is_admin()));
create policy "admins editan ajustes" on public.shop_settings
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

grant select, update on public.shop_settings to authenticated;

-- Pedidos: modo de color y fecha estimada ----------------------------------

alter table public.orders
  add column color_mode text not null default 'mono' check (color_mode in ('mono', 'multi')),
  add column estimated_delivery date;

-- Estados que ocupan lugar en la cola de la impresora.
create or replace function private.queue_size()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer from public.orders
  where status in ('nuevo', 'cotizado', 'pagado', 'imprimiendo');
$$;

create or replace function private.has_capacity()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select s.accepting_orders and private.queue_size() < s.max_queue
  from public.shop_settings s where s.id;
$$;

revoke all on function private.queue_size() from public;
revoke all on function private.has_capacity() from public;
grant execute on function private.queue_size() to anon, authenticated;
grant execute on function private.has_capacity() to anon, authenticated;

-- Lo que la web pública necesita para mostrar la fecha estimada: solo números, ningún dato de pedidos.
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
    'queue', private.queue_size()
  )
  from public.shop_settings s where s.id;
$$;

revoke all on function public.order_capacity() from public;
grant execute on function public.order_capacity() to anon, authenticated;

-- El público solo puede crear pedidos si hay lugar en la cola (control en la base, no solo en la web).
drop policy "público crea pedidos" on public.orders;
create policy "público crea pedidos" on public.orders
  for insert to anon, authenticated
  with check (status = 'nuevo' and quote_amount is null and (select private.has_capacity()));

-- El admin puede cargar pedidos aunque la cola esté llena (p. ej. al convertir una promesa de recontacto).
create policy "admins crean pedidos" on public.orders
  for insert to authenticated with check ((select private.is_admin()));

-- Lista de espera / promesas de recontacto ----------------------------------

create type public.waitlist_status as enum ('pendiente', 'contactado', 'convertido', 'descartado');

create table public.waitlist (
  id uuid primary key default gen_random_uuid(),
  kind public.order_kind not null default 'catalogo',
  model_id uuid references public.models (id) on delete set null,
  model_title text,
  customer_name text not null check (char_length(customer_name) between 2 and 120),
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone text check (phone is null or char_length(phone) <= 30),
  material text not null,
  color_mode text not null default 'mono' check (color_mode in ('mono', 'multi')),
  color text,
  size text not null,
  quantity integer not null default 1 check (quantity between 1 and 100),
  notes text check (notes is null or char_length(notes) <= 4000),
  reference_key text,
  status public.waitlist_status not null default 'pendiente',
  order_id uuid references public.orders (id) on delete set null,
  contacted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index waitlist_status_idx on public.waitlist (status, created_at);

create trigger waitlist_touch before update on public.waitlist
  for each row execute function public.touch_updated_at();

alter table public.waitlist enable row level security;

create policy "público se anota en la lista de espera" on public.waitlist
  for insert to anon, authenticated
  with check (status = 'pendiente' and order_id is null and contacted_at is null);
create policy "admins ven la lista de espera" on public.waitlist
  for select to authenticated using ((select private.is_admin()));
create policy "admins actualizan la lista de espera" on public.waitlist
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

grant insert on public.waitlist to anon, authenticated;
grant select, update on public.waitlist to authenticated;
