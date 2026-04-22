-- ORDINI
create table orders (
  id uuid primary key default gen_random_uuid(),
  order_number text unique not null,
  customer_id uuid references customers(id),
  store_id int references stores(id) not null,
  staff_id uuid references staff_profiles(id),
  status text not null default 'draft'
    check (status in ('draft','confirmed','paid','shipped','completed','cancelled')),
  payment_method text check (payment_method in ('cash','bank','card','other')),
  subtotal numeric(10,2) not null default 0,
  tax_rate numeric(5,2) default 20.00,
  tax_amount numeric(10,2) not null default 0,
  discount_amount numeric(10,2) default 0,
  total numeric(10,2) not null default 0,
  currency text default 'EUR',
  notes text,
  invoice_pdf_path text,
  created_at timestamptz default now(),
  confirmed_at timestamptz,
  completed_at timestamptz
);
create index orders_customer_idx on orders (customer_id);
create index orders_store_date_idx on orders (store_id, created_at desc);
create index orders_status_idx on orders (status);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  product_id uuid references products(id) on delete restrict,
  product_name_snapshot text not null,
  product_sku_snapshot text not null,
  quantity int not null check (quantity > 0),
  unit_price numeric(10,2) not null,
  line_total numeric(10,2) generated always as (quantity * unit_price) stored
);
create index order_items_order_idx on order_items (order_id);
create index order_items_product_idx on order_items (product_id);

-- TRASFERIMENTI
create table stock_transfers (
  id uuid primary key default gen_random_uuid(),
  transfer_number text unique not null,
  from_store_id int references stores(id) not null,
  to_store_id int references stores(id) not null,
  status text not null default 'draft'
    check (status in ('draft','in_transit','completed','cancelled')),
  initiated_by uuid references staff_profiles(id),
  received_by uuid references staff_profiles(id),
  notes text,
  created_at timestamptz default now(),
  shipped_at timestamptz,
  received_at timestamptz,
  check (from_store_id != to_store_id)
);

create table stock_transfer_items (
  id uuid primary key default gen_random_uuid(),
  transfer_id uuid references stock_transfers(id) on delete cascade,
  product_id uuid references products(id),
  quantity int not null check (quantity > 0),
  quantity_received int,
  notes text
);
create index stock_transfer_items_transfer_idx on stock_transfer_items (transfer_id);

-- MOVIMENTI MAGAZZINO (audit log)
create table inventory_movements (
  id bigserial primary key,
  product_id uuid references products(id),
  change int not null,
  reason text not null check (reason in (
    'sale','return','adjustment','intake','damage',
    'transfer_out','transfer_in','reservation','unreservation'
  )),
  store_id int references stores(id),
  from_store_id int references stores(id),
  to_store_id int references stores(id),
  reference_order_id uuid references orders(id),
  transfer_id uuid references stock_transfers(id),
  staff_id uuid references staff_profiles(id),
  notes text,
  created_at timestamptz default now()
);
create index inv_mov_product_date_idx on inventory_movements (product_id, created_at desc);
create index inv_mov_store_date_idx on inventory_movements (store_id, created_at desc);
