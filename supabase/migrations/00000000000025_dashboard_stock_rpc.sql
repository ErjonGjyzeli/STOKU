-- RPC per aggregati stock dashboard: evita fetch di migliaia di righe
-- in memoria con .limit() che taglia il totale (bug precedente 2851 vs 16408).
-- Restituisce total_units, low_stock_count, low_stock_top (6 righe) e tire_total_units.

create or replace function get_dashboard_stock(
  p_store_id    int     default null,
  p_tire_ids    uuid[]  default null
)
returns json
language plpgsql
stable
security definer
set search_path = public, pg_catalog
as $$
declare
  v_total_units      bigint;
  v_low_count        bigint;
  v_low_top          json;
  v_tire_total_units bigint;
begin
  select
    coalesce(sum(s.quantity), 0),
    count(*) filter (
      where s.quantity - s.reserved_quantity <= coalesce(s.min_stock, 0)
    )
  into v_total_units, v_low_count
  from stock s
  where (p_store_id is null or s.store_id = p_store_id);

  select json_agg(t)
  into v_low_top
  from (
    select
      s.product_id,
      s.store_id,
      s.quantity,
      s.reserved_quantity,
      s.min_stock,
      st.code  as store_code,
      p.sku    as product_sku,
      p.name   as product_name
    from stock s
    join stores   st on st.id = s.store_id
    join products p  on p.id  = s.product_id
    where (p_store_id is null or s.store_id = p_store_id)
      and s.quantity - s.reserved_quantity <= coalesce(s.min_stock, 0)
    order by s.quantity - s.reserved_quantity asc
    limit 6
  ) t;

  if p_tire_ids is not null and array_length(p_tire_ids, 1) > 0 then
    select coalesce(sum(s.quantity), 0)
    into v_tire_total_units
    from stock s
    where s.product_id = any(p_tire_ids)
      and (p_store_id is null or s.store_id = p_store_id);
  else
    v_tire_total_units := 0;
  end if;

  return json_build_object(
    'total_units',       v_total_units,
    'low_stock_count',   v_low_count,
    'low_stock_top',     coalesce(v_low_top, '[]'::json),
    'tire_total_units',  v_tire_total_units
  );
end;
$$;
