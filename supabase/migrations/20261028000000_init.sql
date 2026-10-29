-- Esquema inicial: catálogo de modelos, pedidos y administradores.

create extension if not exists "pgcrypto";

-- Administradores: agregá tu usuario después de crearlo en Auth:
--   insert into public.admins (user_id) select id from auth.users where email = 'vos@ejemplo.com';
create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- Solo licencias que permiten vender impresiones (sin CC "NC").
create type public.model_license as enum ('cc0', 'cc-by', 'cc-by-sa', 'commercial', 'own', 'permission');

create table public.models (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null,
  description text not null default '',
  category text not null default 'General',
  tags text[] not null default '{}',
  license public.model_license not null,
  author_name text,
  author_url text,
  source_url text,
  glb_url text not null,
  thumbnail_url text,
  source_file_key text,
  size_x_mm numeric(7, 1),
  size_y_mm numeric(7, 1),
  size_z_mm numeric(7, 1),
  base_price numeric(12, 0) check (base_price is null or base_price >= 0),
  featured boolean not null default false,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Las licencias con atribución necesitan autor.
  constraint attribution_required check (
    license in ('cc0', 'own') or author_name is not null
  )
);

create index models_published_idx on public.models (published, featured desc, created_at desc);

create type public.order_status as enum ('nuevo', 'cotizado', 'pagado', 'imprimiendo', 'listo', 'entregado', 'cancelado');
create type public.order_kind as enum ('catalogo', 'personalizado');

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  kind public.order_kind not null default 'catalogo',
  model_id uuid references public.models (id) on delete set null,
  model_title text,
  customer_name text not null check (char_length(customer_name) between 2 and 120),
  email text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone text check (phone is null or char_length(phone) <= 30),
  material text not null,
  color text,
  size text not null,
  quantity integer not null default 1 check (quantity between 1 and 100),
  notes text check (notes is null or char_length(notes) <= 4000),
  reference_key text,
  status public.order_status not null default 'nuevo',
  quote_amount numeric(12, 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contact_required check (email is not null or phone is not null)
);

create index orders_status_idx on public.orders (status, created_at desc);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger models_touch before update on public.models
  for each row execute function public.touch_updated_at();
create trigger orders_touch before update on public.orders
  for each row execute function public.touch_updated_at();

-- RLS ---------------------------------------------------------------------

alter table public.admins enable row level security;
alter table public.models enable row level security;
alter table public.orders enable row level security;

create policy "admins ven su propia fila" on public.admins
  for select to authenticated using (user_id = (select auth.uid()));

create policy "público ve modelos publicados" on public.models
  for select to anon, authenticated using (published or (select public.is_admin()));

create policy "admins gestionan modelos" on public.models
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- Cualquiera puede crear un pedido, pero solo en estado inicial y sin precio.
create policy "público crea pedidos" on public.orders
  for insert to anon, authenticated
  with check (status = 'nuevo' and quote_amount is null);

create policy "admins ven pedidos" on public.orders
  for select to authenticated using ((select public.is_admin()));

create policy "admins actualizan pedidos" on public.orders
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- Permisos explícitos para la API (por si el proyecto no expone tablas nuevas por defecto).
grant usage on schema public to anon, authenticated;
grant select on public.models to anon, authenticated;
grant insert, update, delete on public.models to authenticated;
grant insert on public.orders to anon, authenticated;
grant select, update on public.orders to authenticated;
grant select on public.admins to authenticated;
grant execute on function public.is_admin() to anon, authenticated;
