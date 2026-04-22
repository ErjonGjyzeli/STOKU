-- Helper
create or replace function get_available(p_product_id uuid, p_store_id int)
returns int language sql stable as $$
  select coalesce(quantity - reserved_quantity, 0)
  from stock where product_id = p_product_id and store_id = p_store_id;
$$;

-- Prenotazione alla creazione di order_items su ordine draft
create or replace function reserve_stock() returns trigger as $$
declare
  v_store_id int;
  v_available int;
begin
  select store_id into v_store_id from orders where id = new.order_id;
  select get_available(new.product_id, v_store_id) into v_available;

  if v_available < new.quantity then
    raise exception 'Stock insufficiente (disponibili: %, richiesti: %)', v_available, new.quantity;
  end if;

  update stock set reserved_quantity = reserved_quantity + new.quantity
  where product_id = new.product_id and store_id = v_store_id;

  insert into inventory_movements (product_id, change, reason, store_id, reference_order_id)
  values (new.product_id, new.quantity, 'reservation', v_store_id, new.order_id);

  return new;
end; $$ language plpgsql;

create trigger trg_order_item_reserve after insert on order_items
  for each row execute function reserve_stock();

-- Transizione status ordine → decremento stock o rilascio prenotazione
create or replace function apply_order_status_change() returns trigger as $$
begin
  if new.status = 'confirmed' and old.status = 'draft' then
    update stock s set
      quantity = s.quantity - oi.quantity,
      reserved_quantity = s.reserved_quantity - oi.quantity
    from order_items oi
    where oi.order_id = new.id
      and s.product_id = oi.product_id
      and s.store_id = new.store_id;

    insert into inventory_movements (product_id, change, reason, store_id, reference_order_id, staff_id)
    select oi.product_id, -oi.quantity, 'sale', new.store_id, new.id, new.staff_id
    from order_items oi where oi.order_id = new.id;

    new.confirmed_at = now();
  end if;

  if new.status = 'cancelled' and old.status = 'draft' then
    update stock s set reserved_quantity = s.reserved_quantity - oi.quantity
    from order_items oi
    where oi.order_id = new.id
      and s.product_id = oi.product_id
      and s.store_id = new.store_id;

    insert into inventory_movements (product_id, change, reason, store_id, reference_order_id)
    select oi.product_id, -oi.quantity, 'unreservation', new.store_id, new.id
    from order_items oi where oi.order_id = new.id;
  end if;

  return new;
end; $$ language plpgsql;

create trigger trg_order_status_change before update on orders
  for each row when (old.status is distinct from new.status)
  execute function apply_order_status_change();

-- Transizione status trasferimento
create or replace function apply_transfer_status_change() returns trigger as $$
begin
  if new.status = 'in_transit' and old.status = 'draft' then
    update stock s set quantity = s.quantity - ti.quantity
    from stock_transfer_items ti
    where ti.transfer_id = new.id
      and s.product_id = ti.product_id
      and s.store_id = new.from_store_id;

    insert into inventory_movements (product_id, change, reason, from_store_id, to_store_id, transfer_id)
    select ti.product_id, -ti.quantity, 'transfer_out', new.from_store_id, new.to_store_id, new.id
    from stock_transfer_items ti where ti.transfer_id = new.id;

    new.shipped_at = now();
  end if;

  if new.status = 'completed' and old.status = 'in_transit' then
    insert into stock (product_id, store_id, quantity)
    select ti.product_id, new.to_store_id, coalesce(ti.quantity_received, ti.quantity)
    from stock_transfer_items ti where ti.transfer_id = new.id
    on conflict (product_id, store_id)
    do update set quantity = stock.quantity + excluded.quantity;

    insert into inventory_movements (product_id, change, reason, from_store_id, to_store_id, transfer_id)
    select ti.product_id, coalesce(ti.quantity_received, ti.quantity), 'transfer_in',
           new.from_store_id, new.to_store_id, new.id
    from stock_transfer_items ti where ti.transfer_id = new.id;

    insert into inventory_movements (product_id, change, reason, from_store_id, transfer_id, notes)
    select ti.product_id, -(ti.quantity - ti.quantity_received), 'damage',
           new.from_store_id, new.id, 'Perdita in trasferimento'
    from stock_transfer_items ti
    where ti.transfer_id = new.id and ti.quantity_received is not null and ti.quantity_received < ti.quantity;

    new.received_at = now();
  end if;

  return new;
end; $$ language plpgsql;

create trigger trg_transfer_status_change before update on stock_transfers
  for each row when (old.status is distinct from new.status)
  execute function apply_transfer_status_change();

-- Totali ordine automatici
create or replace function recalc_order_totals() returns trigger as $$
declare v_order_id uuid;
begin
  v_order_id := coalesce(new.order_id, old.order_id);
  update orders o set
    subtotal = coalesce((select sum(line_total) from order_items where order_id = v_order_id), 0),
    tax_amount = round(coalesce((select sum(line_total) from order_items where order_id = v_order_id), 0) * o.tax_rate / 100, 2),
    total = round(coalesce((select sum(line_total) from order_items where order_id = v_order_id), 0) * (1 + o.tax_rate / 100) - o.discount_amount, 2)
  where o.id = v_order_id;
  return coalesce(new, old);
end; $$ language plpgsql;

create trigger trg_recalc_order_totals after insert or update or delete on order_items
  for each row execute function recalc_order_totals();
