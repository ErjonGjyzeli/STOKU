-- Estende apply_order_status_change per coprire tutte le transizioni di
-- status. Il trigger F1 gestiva solo draft→confirmed e draft→cancelled;
-- aggiungiamo:
--   • confirmed|paid|shipped → cancelled: restore stock (inverso del sale),
--     logga inventory_movements reason='return'.
--   • shipped → completed: set completed_at = now() (no stock).
-- confirm→paid, paid→shipped restano no-op lato stock.

create or replace function apply_order_status_change() returns trigger as $$
begin
  -- draft → confirmed: decrementa stock + log sale (logica F1 originale)
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

  -- draft → cancelled: rilascia prenotazione
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

  -- confirmed/paid/shipped → cancelled: restore stock (rimborso/reso)
  if new.status = 'cancelled'
     and old.status in ('confirmed', 'paid', 'shipped') then
    update stock s set quantity = s.quantity + oi.quantity
    from order_items oi
    where oi.order_id = new.id
      and s.product_id = oi.product_id
      and s.store_id = new.store_id;

    insert into inventory_movements (product_id, change, reason, store_id, reference_order_id, staff_id)
    select oi.product_id, oi.quantity, 'return', new.store_id, new.id, new.staff_id
    from order_items oi where oi.order_id = new.id;
  end if;

  -- shipped → completed
  if new.status = 'completed' and old.status = 'shipped' then
    new.completed_at = now();
  end if;

  return new;
end; $$ language plpgsql
set search_path = public, pg_catalog;
