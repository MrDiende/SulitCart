-- Run this in Supabase SQL Editor to fix sign-in for existing projects.
-- RLS controls which profile rows each role can access; SQL grants allow the
-- authenticated role to reach the table and evaluate those policies.
grant select, insert, update on table public.profiles to authenticated;
grant all on table public.profiles to service_role;

drop policy if exists "profiles_select_self_or_staff" on public.profiles;
create policy "profiles_select_self_or_staff" on public.profiles for select to authenticated
using (id = auth.uid() or public.is_staff_or_admin());

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles for update to authenticated
using (id = auth.uid()) with check (id = auth.uid() and role = public.current_user_role());

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self" on public.profiles for insert to authenticated
with check (id = auth.uid() and role = 'customer');

drop policy if exists "profiles_admin_update" on public.profiles;
create policy "profiles_admin_update" on public.profiles for update to authenticated
using (public.current_user_role() = 'admin') with check (public.current_user_role() = 'admin');
