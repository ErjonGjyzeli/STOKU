-- Sequenza + helper per code auto-generato dei clienti.
-- Stesso pattern di next_product_sku (F2.2): prefix `C-` padded 6 cifre.

create sequence if not exists customers_code_seq start 1 increment 1;

create or replace function next_customer_code()
returns text
language sql
security definer
set search_path = public, pg_catalog
as $$
  select 'C-' || lpad(nextval('customers_code_seq')::text, 6, '0');
$$;

grant execute on function next_customer_code() to authenticated;
