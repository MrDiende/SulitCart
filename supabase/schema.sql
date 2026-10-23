-- SulitCart database schema for Supabase (PostgreSQL)
-- Run in Supabase Dashboard > SQL Editor. Never put service_role keys in the frontend.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null unique,
  phone text not null default '',
  address text not null default '',
  role text not null default 'customer' check (role in ('customer','staff','admin')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text not null default '',
  image_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  sku text unique,
  name text not null,
  description text not null default '',
  price numeric(12,2) not null default 0 check (price >= 0),
  stock integer not null default 0 check (stock >= 0),
  low_stock_threshold integer not null default 5 check (low_stock_threshold >= 0),
  image_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products add column if not exists low_stock_threshold integer not null default 5 check (low_stock_threshold >= 0);

create table if not exists public.shipping_rates (
  id uuid primary key default gen_random_uuid(),
  municipality text not null,
  barangay text not null,
  fee numeric(12,2) not null default 0 check (fee >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (municipality, barangay)
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default ('SC-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10))),
  customer_id uuid references public.profiles(id) on delete set null,
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null default '',
  delivery_address text not null default '',
  order_type text not null default 'online' check (order_type in ('online','walk_in')),
  status text not null default 'pending' check (status in ('pending','confirmed','packed','out_for_delivery','delivered','cancelled')),
  subtotal numeric(12,2) not null default 0 check (subtotal >= 0),
  shipping_fee numeric(12,2) not null default 0 check (shipping_fee >= 0),
  total numeric(12,2) not null default 0 check (total >= 0),
  notes text not null default '',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  sku text not null default '',
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  line_total numeric(12,2) generated always as (quantity * unit_price) stored
);

create table if not exists public.inventory_transactions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  transaction_type text not null,
  quantity integer not null,
  note text not null default '',
  actor_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  actor_name text not null default 'System',
  actor_role text not null default 'customer',
  action text not null,
  entity text not null default '',
  description text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists products_category_id_idx on public.products(category_id);
create index if not exists orders_customer_id_idx on public.orders(customer_id);
create index if not exists orders_status_idx on public.orders(status);
create index if not exists orders_created_at_idx on public.orders(created_at desc);
create index if not exists order_items_order_id_idx on public.order_items(order_id);
create index if not exists inventory_transactions_product_id_idx on public.inventory_transactions(product_id);
create index if not exists audit_logs_created_at_idx on public.audit_logs(created_at desc);

create or replace function public.current_user_role()
returns text language sql stable security definer set search_path = public
as $$ select role from public.profiles where id = auth.uid() and active = true limit 1 $$;

create or replace function public.is_staff_or_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select coalesce(public.current_user_role() in ('staff','admin'), false) $$;

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.shipping_rates enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.inventory_transactions enable row level security;
alter table public.audit_logs enable row level security;

-- RLS policies do not grant SQL table privileges; authenticated users need
-- table access before the profile policies can allow per-role reads/writes.
grant select, insert, update on table public.profiles to authenticated;
grant all on table public.profiles to service_role;
grant select on table public.categories, public.products, public.shipping_rates to anon, authenticated;
grant insert, update, delete on table public.categories, public.products, public.shipping_rates to authenticated;
grant select, insert, update, delete on table public.orders, public.order_items,
  public.inventory_transactions, public.audit_logs to authenticated;

-- Profiles: customers can read/update only themselves. Staff/admin can read profiles.
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

-- Catalog is public-readable; only staff/admin can mutate it.
drop policy if exists "categories_public_read" on public.categories;
create policy "categories_public_read" on public.categories for select to anon, authenticated using (active = true or public.is_staff_or_admin());
drop policy if exists "categories_staff_manage" on public.categories;
create policy "categories_staff_manage" on public.categories for all to authenticated using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());
drop policy if exists "products_public_read" on public.products;
create policy "products_public_read" on public.products for select to anon, authenticated using (active = true or public.is_staff_or_admin());
drop policy if exists "products_staff_manage" on public.products;
create policy "products_staff_manage" on public.products for all to authenticated using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'categories'
  ) then
    alter publication supabase_realtime add table public.categories;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'products'
  ) then
    alter publication supabase_realtime add table public.products;
  end if;
end $$;

drop policy if exists "shipping_public_read" on public.shipping_rates;
create policy "shipping_public_read" on public.shipping_rates for select to anon, authenticated using (active = true or public.is_staff_or_admin());
drop policy if exists "shipping_staff_manage" on public.shipping_rates;
create policy "shipping_staff_manage" on public.shipping_rates for all to authenticated using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());

-- Customers can see their own orders; staff/admin can manage all orders.
drop policy if exists "orders_read_own_or_staff" on public.orders;
create policy "orders_read_own_or_staff" on public.orders for select to authenticated using (customer_id = auth.uid() or public.is_staff_or_admin());
drop policy if exists "orders_customer_create" on public.orders;
create policy "orders_customer_create" on public.orders for insert to authenticated with check (customer_id = auth.uid() or public.is_staff_or_admin());
drop policy if exists "orders_staff_update" on public.orders;
create policy "orders_staff_update" on public.orders for update to authenticated using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());
drop policy if exists "orders_staff_delete" on public.orders;
create policy "orders_staff_delete" on public.orders for delete to authenticated using (public.is_staff_or_admin());

drop policy if exists "order_items_read_own_or_staff" on public.order_items;
create policy "order_items_read_own_or_staff" on public.order_items for select to authenticated using (exists (select 1 from public.orders o where o.id = order_id and (o.customer_id = auth.uid() or public.is_staff_or_admin())));
drop policy if exists "order_items_create_own_or_staff" on public.order_items;
create policy "order_items_create_own_or_staff" on public.order_items for insert to authenticated with check (exists (select 1 from public.orders o where o.id = order_id and (o.customer_id = auth.uid() or public.is_staff_or_admin())));
drop policy if exists "order_items_staff_manage" on public.order_items;
create policy "order_items_staff_manage" on public.order_items for all to authenticated using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());

drop policy if exists "inventory_staff_manage" on public.inventory_transactions;
create policy "inventory_staff_manage" on public.inventory_transactions for all to authenticated using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());
drop policy if exists "audit_staff_read" on public.audit_logs;
create policy "audit_staff_read" on public.audit_logs for select to authenticated using (public.is_staff_or_admin());
drop policy if exists "audit_authenticated_insert" on public.audit_logs;
create policy "audit_authenticated_insert" on public.audit_logs for insert to authenticated with check (actor_id = auth.uid() or public.is_staff_or_admin());

-- New signups receive a customer profile. Never accept role from client metadata.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, phone, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''), new.email,
          coalesce(new.raw_user_meta_data->>'phone',''), 'customer')
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();
