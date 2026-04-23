-- Dati legali dell'azienda emittente fatture. Singola riga forzata
-- via CHECK (id = 1): evita la complessità di una tabella "vera" di
-- tenant quando c'è un solo soggetto emittente. In multi-tenant futuro
-- si toglie il check e si aggiunge tenant_id.
--
-- RLS: read tutto lo staff attivo (servirà per render PDF + header UI);
-- write solo admin.

create table company_settings (
  id int primary key default 1 check (id = 1),
  legal_name text not null default '',
  vat_number text,        -- NIPT in Albania / P.IVA in Italia
  tax_code text,
  address_line1 text,
  city text,
  postal_code text,
  country text default 'AL',
  phone text,
  email text,
  iban text,
  bank_name text,
  logo_url text,          -- URL pubblico del logo (Supabase Storage o CDN)
  invoice_footer text,    -- Nota legale/contatti in coda fattura
  default_tax_rate numeric(5, 2) default 20.00,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Riga iniziale vuota: l'UI la edita, non la crea.
insert into company_settings (id, legal_name) values (1, '')
  on conflict (id) do nothing;

alter table company_settings enable row level security;

create policy "company_settings_read"
  on company_settings for select
  using (
    exists (select 1 from staff_profiles where id = auth.uid() and is_active)
  );

create policy "company_settings_write"
  on company_settings for all
  using (is_admin());
