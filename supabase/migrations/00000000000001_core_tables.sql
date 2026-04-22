-- STAFF
create table staff_profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text not null,
  role text not null check (role in ('admin','sales','warehouse','viewer')),
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- CLIENTI
create table customers (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  type text not null check (type in ('private','business')),
  name text not null,
  vat_number text,
  tax_code text,
  email text,
  phone text,
  address_line1 text,
  city text,
  postal_code text,
  country text default 'AL',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index customers_name_trgm_idx on customers using gin (name gin_trgm_ops);
create index customers_phone_idx on customers (phone);

-- VEICOLI
create table vehicle_makes (
  id serial primary key,
  name text unique not null
);

create table vehicles (
  id serial primary key,
  make_id int references vehicle_makes(id),
  model text not null,
  chassis_code text,
  year_from int,
  year_to int,
  engine text,
  unique (make_id, model, chassis_code, year_from, year_to, engine)
);
create index vehicles_model_idx on vehicles (model);

-- CATEGORIE
create table product_categories (
  id serial primary key,
  parent_id int references product_categories(id),
  name text not null,
  slug text unique not null
);

-- PRODOTTI (senza quantity: lo stock vive in `stock` per punto vendita)
create table products (
  id uuid primary key default gen_random_uuid(),
  sku text unique not null,
  legacy_nr text,
  name text not null,
  description text,
  category_id int references product_categories(id),
  condition text not null default 'used' check (condition in ('new','used','refurbished','damaged')),
  oem_code text,
  price_sell numeric(10,2),
  price_cost numeric(10,2),
  currency text default 'EUR',
  weight_kg numeric(6,2),
  notes text,
  is_active boolean default true,
  search_vector tsvector generated always as (
    to_tsvector('simple',
      coalesce(name,'') || ' ' ||
      coalesce(sku,'') || ' ' ||
      coalesce(oem_code,'') || ' ' ||
      coalesce(description,'')
    )
  ) stored,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index products_search_idx on products using gin (search_vector);
create index products_name_trgm_idx on products using gin (name gin_trgm_ops);
create index products_category_idx on products (category_id);

-- IMMAGINI PRODOTTI
create table product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade,
  storage_path text not null,
  is_primary boolean default false,
  sort_order int default 0,
  created_at timestamptz default now()
);

-- COMPATIBILITÀ PRODOTTO ↔ VEICOLO
create table product_vehicle_compatibility (
  product_id uuid references products(id) on delete cascade,
  vehicle_id int references vehicles(id) on delete cascade,
  notes text,
  primary key (product_id, vehicle_id)
);
