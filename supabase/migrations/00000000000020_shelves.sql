-- Scaffali (collocazione fisica strutturata dei prodotti per PV).
--
-- Razionale: spec funzionale STOKU v1.2 §7.bis ("cuore della v1.1+").
-- Oggi `stock.location_code` è solo testo libero, senza vincoli né
-- gerarchia. Lo scaffale diventa entità di prima classe: codice
-- gerarchico univoco per PV (es. `TIR-A-12-3`, `DUR-MAIN`), tipo
-- (open/cabinet/drawer/floor), capacità approssimativa, attivo/disattivo.
--
-- Invariante: un'eventuale assegnazione `stock.shelf_id` deve fare
-- riferimento a uno scaffale dello *stesso* PV di `stock.store_id`
-- (regola §7.bis: "stesso prodotto in PV diversi → scaffali diversi").
-- Garantita via trigger BEFORE su stock (no FK composita perché shelf_id
-- è nullable in fase di transizione e l'overhead della join è basso).
--
-- `inventory_movements` esteso con `from_shelf_id` / `to_shelf_id` e
-- nuova causale `internal_move` (spostamento tra scaffali stesso PV,
-- §7.bis "Spostamento interno"). Le esistenti causali resta intatte.
--
-- `stock.location_code` è preservato in fase di transizione: serve come
-- fonte di backfill per popolare gli scaffali nelle PR successive (PR-3
-- CRUD UI, poi script di migrazione dati). Verrà deprecato/rimosso
-- in una migration dedicata dopo il backfill, non qui.
--
-- Foundation per:
--   PR-3 CRUD scaffali UI (route /scaffali, form, lista per PV)
--   PR-4 route QR /s/<codice-scaffale>
--   PR-6 stampa massiva etichette scaffale (A4 + Brother QL)

------------------------------------------------------------
-- 1) Tabella shelves
------------------------------------------------------------
create table shelves (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  store_id int not null references stores(id) on delete restrict,
  description text,
  kind text not null default 'open'
    check (kind in ('open','cabinet','drawer','floor')),
  capacity int check (capacity is null or capacity > 0),
  is_active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (store_id, code)
);

create index shelves_store_idx on shelves (store_id);
create index shelves_store_active_idx on shelves (store_id) where is_active;

------------------------------------------------------------
-- 2) Trigger updated_at su shelves
------------------------------------------------------------
create or replace function set_shelves_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

alter function public.set_shelves_updated_at() set search_path = public, pg_catalog;

create trigger trg_shelves_updated_at before update on shelves
  for each row execute function set_shelves_updated_at();

------------------------------------------------------------
-- 3) Estensione stock: shelf_id + invariante store_id coerente
------------------------------------------------------------
alter table stock add column shelf_id uuid references shelves(id) on delete set null;

create index stock_shelf_idx on stock (shelf_id);

create or replace function check_stock_shelf_store() returns trigger as $$
declare
  v_shelf_store_id int;
begin
  if new.shelf_id is null then
    return new;
  end if;
  select store_id into v_shelf_store_id from shelves where id = new.shelf_id;
  if v_shelf_store_id is null then
    raise exception 'shelf_id % non esiste', new.shelf_id;
  end if;
  if v_shelf_store_id != new.store_id then
    raise exception 'shelf_id % appartiene a store % ma stock.store_id è %',
      new.shelf_id, v_shelf_store_id, new.store_id;
  end if;
  return new;
end;
$$ language plpgsql;

alter function public.check_stock_shelf_store() set search_path = public, pg_catalog;

create trigger trg_stock_shelf_store_check
  before insert or update of shelf_id, store_id on stock
  for each row execute function check_stock_shelf_store();

------------------------------------------------------------
-- 4) Estensione inventory_movements: shelf FK + nuova reason
------------------------------------------------------------
alter table inventory_movements
  add column from_shelf_id uuid references shelves(id) on delete set null,
  add column to_shelf_id   uuid references shelves(id) on delete set null;

-- Sostituzione del CHECK su `reason` per includere 'internal_move'.
-- Il nome generato da PostgreSQL per un CHECK inline su colonna è
-- `<table>_<column>_check`. Drop esplicito (no IF EXISTS: vogliamo
-- fallire rumorosamente se l'assunzione non vale).
alter table inventory_movements drop constraint inventory_movements_reason_check;

alter table inventory_movements add constraint inventory_movements_reason_check
  check (reason in (
    'sale','return','adjustment','intake','damage',
    'transfer_out','transfer_in','reservation','unreservation',
    'internal_move'
  ));

------------------------------------------------------------
-- 5) RLS su shelves (pattern stock: scoping per PV)
------------------------------------------------------------
alter table shelves enable row level security;

create policy "shelves_read" on shelves for select
  using (has_store_access(store_id));

create policy "shelves_write" on shelves for all
  using (
    has_store_access(store_id) and exists (
      select 1 from staff_profiles
      where id = auth.uid() and role in ('admin','warehouse') and is_active
    )
  );
