-- Helper
create or replace function is_admin() returns boolean language sql stable security definer as $$
  select exists (
    select 1 from staff_profiles where id = auth.uid() and role = 'admin' and is_active
  );
$$;

create or replace function has_store_access(p_store_id int) returns boolean language sql stable security definer as $$
  select is_admin() or exists (
    select 1 from staff_store_access where staff_id = auth.uid() and store_id = p_store_id
  );
$$;

-- Abilita RLS
alter table staff_profiles enable row level security;
alter table customers enable row level security;
alter table products enable row level security;
alter table product_images enable row level security;
alter table product_vehicle_compatibility enable row level security;
alter table stores enable row level security;
alter table stock enable row level security;
alter table staff_store_access enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table stock_transfers enable row level security;
alter table stock_transfer_items enable row level security;
alter table inventory_movements enable row level security;

-- Catalogo globale: tutto lo staff legge, solo admin/warehouse scrive
create policy "products_read" on products for select using (
  exists (select 1 from staff_profiles where id = auth.uid() and is_active)
);
create policy "products_write" on products for all using (
  exists (select 1 from staff_profiles where id = auth.uid() and role in ('admin','warehouse'))
);

-- Stock: scoping per store
create policy "stock_read" on stock for select using (has_store_access(store_id));
create policy "stock_write" on stock for all using (
  has_store_access(store_id) and exists (
    select 1 from staff_profiles where id = auth.uid() and role in ('admin','warehouse')
  )
);

-- Ordini: scoping per store
create policy "orders_read" on orders for select using (has_store_access(store_id));
create policy "orders_write" on orders for all using (
  has_store_access(store_id) and exists (
    select 1 from staff_profiles where id = auth.uid() and role in ('admin','sales')
  )
);
create policy "order_items_read" on order_items for select using (
  exists (select 1 from orders o where o.id = order_id and has_store_access(o.store_id))
);
create policy "order_items_write" on order_items for all using (
  exists (select 1 from orders o where o.id = order_id and has_store_access(o.store_id))
);

-- Trasferimenti: accesso se leggo almeno uno dei due store
create policy "transfers_read" on stock_transfers for select
  using (has_store_access(from_store_id) or has_store_access(to_store_id));
create policy "transfers_write" on stock_transfers for all using (
  (has_store_access(from_store_id) or has_store_access(to_store_id))
  and exists (select 1 from staff_profiles where id = auth.uid() and role in ('admin','warehouse'))
);

-- Clienti, categorie, veicoli: globali
create policy "customers_all" on customers for all using (
  exists (select 1 from staff_profiles where id = auth.uid() and is_active)
);

-- Staff profiles
create policy "staff_read" on staff_profiles for select using (
  exists (select 1 from staff_profiles sp where sp.id = auth.uid() and sp.is_active)
);
create policy "staff_write_admin" on staff_profiles for all using (is_admin());

-- Stores: tutti leggono, solo admin scrive
create policy "stores_read" on stores for select using (
  exists (select 1 from staff_profiles where id = auth.uid() and is_active)
);
create policy "stores_write" on stores for all using (is_admin());

create policy "staff_store_access_read" on staff_store_access for select using (
  staff_id = auth.uid() or is_admin()
);
create policy "staff_store_access_write" on staff_store_access for all using (is_admin());

-- Movimenti: visibili se hai accesso allo store coinvolto
create policy "inv_mov_read" on inventory_movements for select using (
  is_admin() or has_store_access(store_id)
  or has_store_access(from_store_id) or has_store_access(to_store_id)
);
