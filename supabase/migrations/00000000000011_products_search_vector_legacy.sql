-- Estende `products.search_vector` con `legacy_nr` (numero ex-Excel).
-- I 5.920 pezzi storici sono riferiti per ID Excel dagli operatori, quindi
-- devono entrare anche nel full-text search, non solo nome / SKU / OEM /
-- descrizione come in F1.
--
-- Le colonne generated STORED non si possono alterare in-place: drop +
-- readd con la stessa espressione, poi ricrea l'indice GIN.

alter table products drop column if exists search_vector;

alter table products add column search_vector tsvector generated always as (
  to_tsvector('simple',
    coalesce(name, '') || ' ' ||
    coalesce(sku, '') || ' ' ||
    coalesce(oem_code, '') || ' ' ||
    coalesce(legacy_nr, '') || ' ' ||
    coalesce(description, '')
  )
) stored;

create index if not exists products_search_idx
  on products using gin (search_vector);
