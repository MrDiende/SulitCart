-- Run after schema.sql. These functions keep stock, order and inventory writes
-- atomic while validating the caller independently of client-side checks.
alter table public.orders
  add column if not exists payment_method text not null default 'Cash on Delivery';

grant select, insert, update, delete on table public.categories to authenticated;
grant select, delete on table public.products to authenticated;
revoke insert, update on table public.products from authenticated;
grant select, insert, update, delete on table public.shipping_rates to authenticated;
grant select on table public.orders to authenticated;
revoke insert, update, delete on table public.orders from authenticated;
grant select on table public.order_items to authenticated;
revoke insert, update, delete on table public.order_items from authenticated;
grant select on table public.inventory_transactions to authenticated;
revoke insert, update, delete on table public.inventory_transactions from authenticated;
grant select, insert on table public.audit_logs to authenticated;
grant select, insert, update on table public.profiles to authenticated;
grant all on table public.profiles to service_role;

drop policy if exists "profiles_admin_read_all" on public.profiles;
create policy "profiles_admin_read_all" on public.profiles for select to authenticated
using (id = auth.uid() or public.is_staff_or_admin());
drop policy if exists "inventory_staff_manage" on public.inventory_transactions;
create policy "inventory_staff_manage" on public.inventory_transactions for all to authenticated
using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());
drop policy if exists "audit_staff_read" on public.audit_logs;
create policy "audit_staff_read" on public.audit_logs for select to authenticated
using (public.is_staff_or_admin());
drop policy if exists "audit_authenticated_insert" on public.audit_logs;
create policy "audit_authenticated_insert" on public.audit_logs for insert to authenticated
with check (actor_id = auth.uid() and public.is_staff_or_admin());

create or replace function public.save_store_product(
  p_product_id uuid,
  p_category_id uuid,
  p_sku text,
  p_name text,
  p_description text,
  p_price numeric,
  p_stock integer,
  p_low_stock_threshold integer,
  p_image_url text,
  p_active boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_role text := public.current_user_role();
  v_product public.products%rowtype;
  v_old_stock integer := 0;
  v_difference integer;
begin
  if v_actor is null or v_role is null or v_role not in ('admin', 'staff') then
    raise exception 'Only active staff or admins can save products.';
  end if;
  if nullif(trim(p_name), '') is null or nullif(trim(p_sku), '') is null
    or p_price is null or p_price < 0
    or p_stock is null or p_stock < 0
    or p_low_stock_threshold is null or p_low_stock_threshold < 0 then
    raise exception 'Product fields contain invalid values.';
  end if;

  if p_product_id is null then
    insert into public.products (
      category_id, sku, name, description, price, stock,
      low_stock_threshold, image_url, active
    ) values (
      p_category_id, trim(p_sku), trim(p_name), coalesce(p_description, ''),
      p_price, p_stock, p_low_stock_threshold, p_image_url, coalesce(p_active, true)
    )
    returning * into v_product;
  else
    select stock into v_old_stock from public.products where id = p_product_id for update;
    if not found then raise exception 'Product does not exist.'; end if;
    update public.products
    set category_id = p_category_id,
        sku = trim(p_sku),
        name = trim(p_name),
        description = coalesce(p_description, ''),
        price = p_price,
        stock = p_stock,
        low_stock_threshold = p_low_stock_threshold,
        image_url = p_image_url,
        active = coalesce(p_active, true),
        updated_at = now()
    where id = p_product_id
    returning * into v_product;
  end if;

  v_difference := v_product.stock - v_old_stock;
  if v_difference <> 0 then
    insert into public.inventory_transactions
      (product_id, product_name, transaction_type, quantity, note, actor_id)
    values
      (v_product.id, v_product.name,
       case when v_difference > 0 then 'Stock received' else 'Stock adjustment' end,
       v_difference,
       case when p_product_id is null then 'Initial stock' else 'Stock updated through product form' end,
       v_actor);
  end if;

  return to_jsonb(v_product);
end;
$$;

create or replace function public.adjust_inventory(
  p_product_id uuid,
  p_difference integer,
  p_note text default 'Manual stock adjustment'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_actor_role text := public.current_user_role();
  v_product public.products%rowtype;
  v_type text;
begin
  if v_actor is null or v_actor_role is null or v_actor_role not in ('admin', 'staff') then
    raise exception 'Only active staff or admins can adjust inventory.';
  end if;
  if p_difference is null or p_difference = 0 then
    raise exception 'Stock adjustment must be a non-zero whole number.';
  end if;

  update public.products
  set stock = stock + p_difference, updated_at = now()
  where id = p_product_id and stock + p_difference >= 0
  returning * into v_product;
  if not found then
    raise exception 'Product does not exist or the adjustment would make stock negative.';
  end if;

  v_type := case when p_difference > 0 then 'Stock received' else 'Stock adjustment' end;
  insert into public.inventory_transactions
    (product_id, product_name, transaction_type, quantity, note, actor_id)
  values
    (v_product.id, v_product.name, v_type, p_difference, coalesce(p_note, ''), v_actor);
  insert into public.audit_logs
    (actor_id, actor_name, actor_role, action, entity, description)
  select v_actor, full_name, v_actor_role, v_type, v_product.name,
         (case when p_difference > 0 then '+' else '' end) || p_difference::text || ' units. ' || coalesce(p_note, '')
  from public.profiles where id = v_actor;

  return to_jsonb(v_product);
end;
$$;

create or replace function public.create_store_order(
  p_items jsonb,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_delivery_address text,
  p_municipality text,
  p_barangay text,
  p_notes text default '',
  p_payment_method text default 'Cash on Delivery',
  p_order_type text default 'online'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_role text := public.current_user_role();
  v_order_id uuid;
  v_order_number text;
  v_status text;
  v_shipping numeric(12,2) := 0;
  v_subtotal numeric(12,2) := 0;
  v_item jsonb;
  v_product public.products%rowtype;
  v_product_id uuid;
  v_quantity integer;
  v_order_type text := lower(coalesce(p_order_type, 'online'));
begin
  if v_actor is null or v_role is null then
    raise exception 'Sign in with an active account to place an order.';
  end if;
  if coalesce(jsonb_typeof(p_items), '') <> 'array' then
    raise exception 'Order items must be submitted as an array.';
  end if;
  if jsonb_array_length(p_items) = 0 then
    raise exception 'An order must contain at least one item.';
  end if;
  if v_order_type not in ('online', 'walk_in') then
    raise exception 'Unsupported order type.';
  end if;
  if v_order_type = 'online' and v_role <> 'customer' then
    raise exception 'Online orders require a customer account.';
  end if;
  if v_order_type = 'walk_in' and v_role not in ('admin', 'staff') then
    raise exception 'Only staff or admins can record walk-in sales.';
  end if;

  if v_order_type = 'online' then
    select fee into v_shipping
    from public.shipping_rates
    where active and municipality = p_municipality and barangay = p_barangay
    limit 1;
    if v_shipping is null then
      select fee into v_shipping
      from public.shipping_rates
      where active and municipality = p_municipality and barangay = '*'
      limit 1;
    end if;
    v_shipping := coalesce(v_shipping, 0);
  end if;

  v_status := case when v_order_type = 'walk_in' then 'delivered' else 'pending' end;
  insert into public.orders (
    customer_id, customer_name, customer_email, customer_phone,
    delivery_address, order_type, status, subtotal, shipping_fee, total,
    notes, created_by, payment_method
  ) values (
    case when v_order_type = 'online' then v_actor else null end,
    coalesce(nullif(trim(p_customer_name), ''), 'Walk-in customer'),
    coalesce(p_customer_email, ''),
    coalesce(p_customer_phone, ''),
    coalesce(p_delivery_address, ''),
    v_order_type, v_status, 0, v_shipping, v_shipping,
    coalesce(p_notes, ''), v_actor, coalesce(nullif(p_payment_method, ''), 'Cash on Delivery')
  )
  returning id, order_number into v_order_id, v_order_number;

  if v_order_type = 'walk_in' then
    update public.orders
    set order_number = 'POS-' || upper(substr(replace(v_order_id::text, '-', ''), 1, 10))
    where id = v_order_id
    returning order_number into v_order_number;
  end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    begin
      v_product_id := (v_item->>'product_id')::uuid;
      v_quantity := (v_item->>'quantity')::integer;
    exception when others then
      raise exception 'Order item has an invalid product or quantity.';
    end;
    if v_quantity <= 0 then
      raise exception 'Order quantities must be positive whole numbers.';
    end if;

    update public.products
    set stock = stock - v_quantity, updated_at = now()
    where id = v_product_id and active and stock >= v_quantity
    returning * into v_product;
    if not found then
      raise exception 'A product is unavailable or has insufficient stock.';
    end if;

    v_subtotal := v_subtotal + v_product.price * v_quantity;
    insert into public.order_items
      (order_id, product_id, product_name, sku, quantity, unit_price)
    values
      (v_order_id, v_product.id, v_product.name, coalesce(v_product.sku, ''), v_quantity, v_product.price);
    insert into public.inventory_transactions
      (product_id, product_name, transaction_type, quantity, note, actor_id)
    values
      (v_product.id, v_product.name,
       case when v_order_type = 'walk_in' then 'Walk-in sale' else 'Online order' end,
       -v_quantity, v_order_number, v_actor);
  end loop;

  update public.orders
  set subtotal = v_subtotal, total = v_subtotal + v_shipping
  where id = v_order_id;
  insert into public.audit_logs
    (actor_id, actor_name, actor_role, action, entity, description)
  select v_actor, full_name, v_role,
    case when v_order_type = 'walk_in' then 'Walk-in sale' else 'Order placed' end,
    v_order_number, jsonb_array_length(p_items)::text || ' item lines'
  from public.profiles where id = v_actor;

  return jsonb_build_object('id', v_order_id, 'number', v_order_number);
end;
$$;

create or replace function public.update_store_order_status(
  p_order_id uuid,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_role text := public.current_user_role();
  v_order public.orders%rowtype;
  v_next_status text := lower(p_status);
  v_item record;
begin
  if v_actor is null or v_role is null then
    raise exception 'Sign in with an active account to update an order.';
  end if;
  if v_next_status not in ('pending', 'confirmed', 'packed', 'shipped', 'completed', 'cancelled') then
    raise exception 'Unsupported order status.';
  end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'Order does not exist.'; end if;

  if v_role = 'customer' then
    if v_order.customer_id <> v_actor
      or v_next_status <> 'cancelled'
      or v_order.status not in ('pending', 'confirmed') then
      raise exception 'Customers can only cancel their own pending or confirmed orders.';
    end if;
  elsif v_role not in ('admin', 'staff') then
    raise exception 'Only active staff or admins can update an order.';
  else
    if not (
      (v_order.status = 'pending' and v_next_status in ('confirmed', 'cancelled'))
      or (v_order.status = 'confirmed' and v_next_status in ('packed', 'cancelled'))
      or (v_order.status = 'packed' and v_next_status in ('shipped', 'cancelled'))
      or (v_order.status = 'out_for_delivery' and v_next_status = 'completed')
      or v_order.status = v_next_status
    ) then
      raise exception 'Order status must follow the fulfillment sequence.';
    end if;
  end if;

  if v_order.status = 'cancelled' and v_next_status <> 'cancelled' then
    raise exception 'A cancelled order cannot be reopened.';
  end if;
  if v_order.status <> 'cancelled' and v_next_status = 'cancelled' then
    if v_order.status not in ('pending', 'confirmed', 'packed') then
      raise exception 'Only orders that have not shipped can be cancelled.';
    end if;
    for v_item in
      select product_id, product_name, quantity
      from public.order_items where order_id = p_order_id
    loop
      if v_item.product_id is not null then
        update public.products set stock = stock + v_item.quantity, updated_at = now()
        where id = v_item.product_id;
      end if;
      insert into public.inventory_transactions
        (product_id, product_name, transaction_type, quantity, note, actor_id)
      values
        (v_item.product_id, v_item.product_name, 'Order cancellation',
         v_item.quantity, v_order.order_number, v_actor);
    end loop;
  end if;

  update public.orders
  set status = case v_next_status
    when 'shipped' then 'out_for_delivery'
    when 'completed' then 'delivered'
    else v_next_status
  end,
  updated_at = now()
  where id = p_order_id;
  insert into public.audit_logs
    (actor_id, actor_name, actor_role, action, entity, description)
  select v_actor, full_name, v_role, 'Order status changed',
         v_order.order_number, v_order.status || ' to ' || v_next_status
  from public.profiles where id = v_actor;

  return jsonb_build_object('id', p_order_id, 'status', v_next_status);
end;
$$;

revoke all on function public.adjust_inventory(uuid, integer, text) from public, anon;
revoke all on function public.save_store_product(uuid, uuid, text, text, text, numeric, integer, integer, text, boolean) from public, anon;
revoke all on function public.create_store_order(jsonb, text, text, text, text, text, text, text, text, text) from public, anon;
revoke all on function public.update_store_order_status(uuid, text) from public, anon;
grant execute on function public.adjust_inventory(uuid, integer, text) to authenticated;
grant execute on function public.save_store_product(uuid, uuid, text, text, text, numeric, integer, integer, text, boolean) to authenticated;
grant execute on function public.create_store_order(jsonb, text, text, text, text, text, text, text, text, text) to authenticated;
grant execute on function public.update_store_order_status(uuid, text) to authenticated;
