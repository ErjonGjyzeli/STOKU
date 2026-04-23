-- Sequenza + helper per order_number auto-generato.
-- Formato: `O-000001`. Sequence globale (non per store/anno) per
-- semplicità; rinumerare per esercizio fiscale sarà parte di F8/F9.

create sequence if not exists orders_number_seq start 1 increment 1;

create or replace function next_order_number()
returns text
language sql
security definer
set search_path = public, pg_catalog
as $$
  select 'O-' || lpad(nextval('orders_number_seq')::text, 6, '0');
$$;

grant execute on function next_order_number() to authenticated;

-- Release di una riga ordine ancora in bozza: inverte la prenotazione
-- stock + log inventory + delete della riga, tutto atomicamente.
-- Il trigger trg_order_item_reserve sull'INSERT incrementa
-- reserved_quantity + logga 'reservation'; qui facciamo il contrario
-- con reason='unreservation'. Equivale all'inverso del percorso
-- status=cancelled del trigger apply_order_status_change.
create or replace function release_order_item(p_item_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_product_id uuid;
  v_quantity int;
  v_order_id uuid;
  v_store_id int;
  v_status text;
begin
  select oi.product_id, oi.quantity, oi.order_id, o.store_id, o.status
    into v_product_id, v_quantity, v_order_id, v_store_id, v_status
  from order_items oi
  join orders o on o.id = oi.order_id
  where oi.id = p_item_id;

  if v_product_id is null then
    raise exception 'Riga ordine non trovata';
  end if;
  if v_status != 'draft' then
    raise exception 'Ordine non in bozza (stato: %)', v_status;
  end if;

  update stock
    set reserved_quantity = greatest(reserved_quantity - v_quantity, 0)
  where product_id = v_product_id and store_id = v_store_id;

  insert into inventory_movements (product_id, change, reason, store_id, reference_order_id)
  values (v_product_id, -v_quantity, 'unreservation', v_store_id, v_order_id);

  delete from order_items where id = p_item_id;
end;
$$;

grant execute on function release_order_item(uuid) to authenticated;
