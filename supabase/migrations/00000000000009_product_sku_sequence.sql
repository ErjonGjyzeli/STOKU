-- Sequenza + helper per SKU auto-generato dei prodotti.
--
-- Formato: `P-000001`, `P-000002`, … padded a 6 cifre, prefisso fisso.
-- L'utente può comunque inserire un SKU libero in UI; se lo lascia
-- vuoto l'app chiama `next_product_sku()` per ottenere il prossimo.
-- Il vincolo UNIQUE su products.sku resta autorevole: se il manual
-- clash, l'insert fallisce e ripropone.

create sequence if not exists products_sku_seq start 1 increment 1;

create or replace function next_product_sku()
returns text
language sql
security definer
set search_path = public
as $$
  select 'P-' || lpad(nextval('products_sku_seq')::text, 6, '0');
$$;

-- Permette al ruolo authenticated di richiamare la funzione (RLS su
-- products limita comunque la successiva insert a admin/warehouse).
grant execute on function next_product_sku() to authenticated;
