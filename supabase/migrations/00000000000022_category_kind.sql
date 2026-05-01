-- Aggiunge `kind` a product_categories e completa il set di categorie
-- previste dalla spec funzionale v1.2 §8.
--
-- Il `kind` determina i campi del form di inserimento prodotto (vedi
-- spec §8 "Categorie prodotto e campi specifici"): ricambio, gomma,
-- cerchio, batteria, utensile, generico. È associato alla categoria
-- (non al singolo prodotto) per semplicità d'uso.
--
-- Numerazione: 020 è scaffali (PR-2 in flight), 021 è tire_attributes
-- (PR-7), 022 è questa. Slot 022 perché kind serve a PR-7 ma può
-- atterrare indipendentemente come piccola foundation.

------------------------------------------------------------
-- 1) Colonna kind con check enum
------------------------------------------------------------
alter table product_categories
  add column if not exists kind text;

-- Backfill prima dei vincoli per categorie esistenti (mig 001 + seed)
update product_categories set kind = 'ricambio'
  where slug in ('abs','ecu','body','suspension','electrical','spare-other')
    and kind is null;
update product_categories set kind = 'utensile'
  where slug = 'tools' and kind is null;

-- Default per future categorie
alter table product_categories
  alter column kind set default 'generico';

-- Vincolo NOT NULL + check enum (idempotente)
do $$
begin
  if not exists (
    select 1 from information_schema.check_constraints
    where constraint_name = 'product_categories_kind_check'
  ) then
    -- Imposta NOT NULL solo dopo backfill
    update product_categories set kind = 'generico' where kind is null;
    alter table product_categories alter column kind set not null;
    alter table product_categories
      add constraint product_categories_kind_check
      check (kind in ('ricambio','gomma','cerchio','batteria','utensile','generico'));
  end if;
end $$;

------------------------------------------------------------
-- 2) Categorie mancanti spec §8 (idempotente)
------------------------------------------------------------
insert into product_categories (name, slug, kind) values
  ('Altri ricambi',           'spare-other',     'ricambio'),
  ('Pneumatici estivi',       'tires-summer',    'gomma'),
  ('Pneumatici invernali',    'tires-winter',    'gomma'),
  ('Pneumatici 4 stagioni',   'tires-allseason', 'gomma'),
  ('Cerchi in lega',          'rims-alloy',      'cerchio'),
  ('Cerchi in ferro',         'rims-steel',      'cerchio'),
  ('Batterie',                'batteries',       'batteria'),
  ('Generico',                'generic',         'generico')
on conflict (slug) do update
  set kind = excluded.kind,
      name = excluded.name;

------------------------------------------------------------
-- 3) Index per filtri kind
------------------------------------------------------------
create index if not exists product_categories_kind_idx
  on product_categories (kind);
