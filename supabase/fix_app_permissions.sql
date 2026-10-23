-- Run this in Supabase SQL Editor to restore page data access on an existing project.
-- RLS policies still restrict which rows each role can read or change.
grant select on table public.categories, public.products, public.shipping_rates to anon, authenticated;
grant insert, update, delete on table public.categories, public.products, public.shipping_rates to authenticated;
grant select, insert, update, delete on table public.orders, public.order_items,
  public.inventory_transactions, public.audit_logs to authenticated;
