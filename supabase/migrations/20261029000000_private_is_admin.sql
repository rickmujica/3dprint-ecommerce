-- is_admin() pasa a un esquema que la API no expone: las políticas lo siguen usando,
-- pero ya no se puede llamar por /rest/v1/rpc/is_admin (advertencia del Security Advisor de Supabase).
create schema if not exists private;
grant usage on schema private to anon, authenticated;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

revoke all on function private.is_admin() from public;
grant execute on function private.is_admin() to anon, authenticated;

drop policy "público ve modelos publicados" on public.models;
drop policy "admins gestionan modelos" on public.models;
drop policy "admins ven pedidos" on public.orders;
drop policy "admins actualizan pedidos" on public.orders;

create policy "público ve modelos publicados" on public.models
  for select to anon, authenticated using (published or (select private.is_admin()));

create policy "admins gestionan modelos" on public.models
  for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

create policy "admins ven pedidos" on public.orders
  for select to authenticated using ((select private.is_admin()));

create policy "admins actualizan pedidos" on public.orders
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

drop function public.is_admin();
