-- Hardening basato sugli advisor Supabase accumulati da F1 a F3.3.
--
-- ERROR risolti (3):
--   1. security_definer_view su v_product_stock_total
--   2. rls_disabled_in_public su product_categories
--   3. bug latente F3.2: product_vehicle_compatibility ha RLS abilitata
--      (da F1) ma nessuna policy → setProductCompatibility sarebbe
--      fallita silenziosamente. Idem stock_transfer_items.
-- WARN risolti (8):
--   - function_search_path_mutable su 7 funzioni + public_bucket_allows
--     _listing sul bucket product-images.
-- Rimandati (non critici ora):
--   - pg_trgm/unaccent in schema public (WARN): spostarli implica
--     ricostruzione indici GIN trgm sulle colonne products/customers.
--     Da fare in una migrazione dedicata con test prima di F8.
--   - auth_leaked_password_protection: setting auth, non SQL.

------------------------------------------------------------
-- 1) View senza SECURITY DEFINER
------------------------------------------------------------
alter view v_product_stock_total set (security_invoker = on);

------------------------------------------------------------
-- 2) product_categories: RLS + policy
------------------------------------------------------------
alter table product_categories enable row level security;

create policy "product_categories_read"
  on product_categories for select
  using (
    exists (select 1 from staff_profiles where id = auth.uid() and is_active)
  );

create policy "product_categories_write"
  on product_categories for all
  using (is_admin());

------------------------------------------------------------
-- 3) product_vehicle_compatibility: policy mancanti
------------------------------------------------------------
create policy "product_vehicle_compatibility_read"
  on product_vehicle_compatibility for select
  using (
    exists (select 1 from staff_profiles where id = auth.uid() and is_active)
  );

create policy "product_vehicle_compatibility_write"
  on product_vehicle_compatibility for all
  using (
    exists (
      select 1 from staff_profiles
      where id = auth.uid() and role in ('admin', 'warehouse') and is_active
    )
  );

------------------------------------------------------------
-- 4) stock_transfer_items: policy mancanti
------------------------------------------------------------
-- Scoping attraverso stock_transfers padre: puoi leggere/scrivere
-- le righe di un trasferimento se hai accesso ad almeno uno dei
-- due store coinvolti (come la policy su stock_transfers stessa).
create policy "stock_transfer_items_read"
  on stock_transfer_items for select
  using (
    exists (
      select 1 from stock_transfers st
      where st.id = transfer_id
        and (has_store_access(st.from_store_id) or has_store_access(st.to_store_id))
    )
  );

create policy "stock_transfer_items_write"
  on stock_transfer_items for all
  using (
    exists (
      select 1 from stock_transfers st
      where st.id = transfer_id
        and (has_store_access(st.from_store_id) or has_store_access(st.to_store_id))
    )
    and exists (
      select 1 from staff_profiles
      where id = auth.uid() and role in ('admin', 'warehouse') and is_active
    )
  );

------------------------------------------------------------
-- 5) search_path immutabile sulle 7 funzioni flaggate
------------------------------------------------------------
-- `pg_catalog` al secondo posto è pratica Supabase standard: garantisce
-- che i tipi built-in si risolvano anche se public viene spostato.
alter function public.is_admin() set search_path = public, pg_catalog;
alter function public.has_store_access(int) set search_path = public, pg_catalog;
alter function public.get_available(uuid, int) set search_path = public, pg_catalog;
alter function public.reserve_stock() set search_path = public, pg_catalog;
alter function public.apply_order_status_change() set search_path = public, pg_catalog;
alter function public.apply_transfer_status_change() set search_path = public, pg_catalog;
alter function public.recalc_order_totals() set search_path = public, pg_catalog;

------------------------------------------------------------
-- 6) Bucket product-images: rimuovi SELECT policy
------------------------------------------------------------
-- Bucket pubblici non hanno bisogno di una SELECT policy per il GET
-- via public URL (Supabase lo bypassa). La policy esistente permetteva
-- invece LIST di tutti gli oggetti, esponendo la struttura dei path.
drop policy if exists "product_images_storage_read" on storage.objects;
