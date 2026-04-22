create view v_product_stock_total as
select
  p.id as product_id,
  p.sku,
  p.name,
  coalesce(sum(s.quantity), 0) as total_quantity,
  coalesce(sum(s.reserved_quantity), 0) as total_reserved,
  coalesce(sum(s.quantity - s.reserved_quantity), 0) as total_available,
  count(distinct s.store_id) filter (where s.quantity > 0) as stores_with_stock
from products p
left join stock s on s.product_id = p.id
group by p.id, p.sku, p.name;
