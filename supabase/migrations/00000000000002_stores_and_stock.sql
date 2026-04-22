-- PUNTI VENDITA
create table stores (
  id serial primary key,
  code text unique not null,
  name text not null,
  type text not null default 'mixed' check (type in ('shop','warehouse','mixed')),
  address_line1 text,
  city text,
  postal_code text,
  country text default 'AL',
  phone text,
  email text,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- STOCK per (prodotto × punto vendita)
create table stock (
  product_id uuid references products(id) on delete cascade,
  store_id int references stores(id) on delete restrict,
  quantity int not null default 0 check (quantity >= 0),
  reserved_quantity int not null default 0 check (reserved_quantity >= 0),
  min_stock int default 0,
  location_code text,
  last_counted_at timestamptz,
  updated_at timestamptz default now(),
  primary key (product_id, store_id),
  check (reserved_quantity <= quantity)
);
create index stock_store_idx on stock (store_id);
create index stock_low_idx on stock (store_id, (quantity - reserved_quantity))
  where quantity - reserved_quantity <= min_stock;

-- ACCESSO STAFF → STORE
create table staff_store_access (
  staff_id uuid references staff_profiles(id) on delete cascade,
  store_id int references stores(id) on delete cascade,
  is_default boolean default false,
  primary key (staff_id, store_id)
);
create unique index staff_default_store_idx on staff_store_access (staff_id) where is_default;
