-- Sequenza + helper per transfer_number auto-generato.
-- Formato: `T-000001`. Stesso pattern di order_number (F5.1).

create sequence if not exists stock_transfers_number_seq start 1 increment 1;

create or replace function next_transfer_number()
returns text
language sql
security definer
set search_path = public, pg_catalog
as $$
  select 'T-' || lpad(nextval('stock_transfers_number_seq')::text, 6, '0');
$$;

grant execute on function next_transfer_number() to authenticated;
