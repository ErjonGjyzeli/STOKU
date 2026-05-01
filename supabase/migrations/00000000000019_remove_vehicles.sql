-- Rimozione tabelle veicoli rigide.
--
-- Razionale: spec funzionale STOKU v1.2 §8 ("no tabella veicoli rigida —
-- sei tu in negozio che sai se quel pezzo va sull'auto del cliente,
-- l'app non si mette a controllare"). La tabella di compatibilità
-- prodotto↔veicolo era contraddittoria con la decisione del titolare:
-- niente vincolo strutturale, marca/modello/anno/OEM diventano testo
-- libero su `products`, ricercabili via trigram (pg_trgm già abilitato
-- in 00000000000000_extensions.sql).
--
-- Migrazioni storiche toccate (solo per riferimento, NON modificate):
--   001 core_tables       → create vehicles, vehicle_makes, product_vehicle_compatibility
--   006 rls               → no policy diretta su vehicles*; abilita RLS su product_vehicle_compatibility
--   012 vehicles_rls      → policy su vehicles, vehicle_makes
--   013 security_hardening → policy su product_vehicle_compatibility
--
-- ATTENZIONE: i dati esistenti in `vehicles`, `vehicle_makes` e
-- `product_vehicle_compatibility` verranno persi. In F1-F3 il dataset
-- è di test, quindi accettabile.

------------------------------------------------------------
-- 1) Drop policy (idempotente)
------------------------------------------------------------
drop policy if exists "product_vehicle_compatibility_read"  on product_vehicle_compatibility;
drop policy if exists "product_vehicle_compatibility_write" on product_vehicle_compatibility;

drop policy if exists "vehicles_read"  on vehicles;
drop policy if exists "vehicles_write" on vehicles;

drop policy if exists "vehicle_makes_read"  on vehicle_makes;
drop policy if exists "vehicle_makes_write" on vehicle_makes;

------------------------------------------------------------
-- 2) Drop tabelle in ordine (figlie → padri)
------------------------------------------------------------
drop table if exists product_vehicle_compatibility cascade;
drop table if exists vehicles cascade;
drop table if exists vehicle_makes cascade;

------------------------------------------------------------
-- 3) Colonne libere su products (idempotente)
------------------------------------------------------------
alter table products add column if not exists vehicle_make      text;
alter table products add column if not exists vehicle_model     text;
alter table products add column if not exists vehicle_year_from int;
alter table products add column if not exists vehicle_year_to   int;
alter table products add column if not exists oem_codes         text[] not null default '{}';

------------------------------------------------------------
-- 4) Index trigram per ricerca su marca/modello
------------------------------------------------------------
create index if not exists products_vehicle_make_trgm_idx
  on products using gin (vehicle_make gin_trgm_ops);

create index if not exists products_vehicle_model_trgm_idx
  on products using gin (vehicle_model gin_trgm_ops);
