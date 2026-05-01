-- Attributi dedicati per i prodotti di tipo "gomma" (spec funzionale v1.2 §3.3 + §8).
--
-- Razionale: la pagina /tires (vista filtrata) deve permettere ricerca per
-- misura LARG/SPALLA R DIAM, indici carico/velocità, battistrada, DOT,
-- runflat, rinforzata. La spec §8 elenca questi attributi come obbligatori
-- per il kind "gomma" (misura completa + marca obbligatori; gli altri
-- opzionali). Sono colonne dedicate sulla tabella `products` (anziché un
-- JSON attributes generico) per consentire indici efficienti per misura
-- e validazione tramite check constraint.
--
-- Dipendenza: mig 022 (`product_categories.kind`) — la pagina /tires
-- pre-filtra i prodotti via JOIN su product_categories.kind = 'gomma'.
-- Le tre categorie gomma (tires-summer, tires-winter, tires-allseason)
-- sono già seedate dalla mig 022.
--
-- Nota: tutti i campi sono nullable. I prodotti non-gomma li ignorano;
-- per i prodotti gomma la spec impone obbligatorietà a livello applicativo
-- (form dinamico per kind) — non a livello DB, per consentire bulk import
-- progressivo (vedi spec §migrazione dati, fasi A-D).

------------------------------------------------------------
-- 1) Misura
------------------------------------------------------------
alter table products add column if not exists tire_width int
  check (tire_width is null or tire_width between 100 and 400);

alter table products add column if not exists tire_aspect int
  check (tire_aspect is null or tire_aspect between 20 and 90);

alter table products add column if not exists tire_diameter numeric(4,1)
  check (tire_diameter is null or tire_diameter between 8 and 24);

------------------------------------------------------------
-- 2) Indici di carico/velocità
------------------------------------------------------------
alter table products add column if not exists tire_load_index int
  check (tire_load_index is null or tire_load_index between 50 and 130);

alter table products add column if not exists tire_speed_index text
  check (tire_speed_index is null or tire_speed_index in ('Q','R','S','T','H','V','W','Y','ZR'));

------------------------------------------------------------
-- 3) Stato/tracciabilità
------------------------------------------------------------
alter table products add column if not exists tire_tread_mm numeric(3,1)
  check (tire_tread_mm is null or tire_tread_mm between 0 and 20);

-- DOT: stringa libera (formato WWYY o WWYYYY). Il parsing rigoroso è
-- delegato al frontend per ora (vedi TODO in /tires page).
alter table products add column if not exists tire_dot text;

------------------------------------------------------------
-- 4) Flag tecnici
------------------------------------------------------------
alter table products add column if not exists tire_runflat boolean default false;
alter table products add column if not exists tire_reinforced boolean default false;

------------------------------------------------------------
-- 5) Indice composito per filtri di misura
------------------------------------------------------------
-- Indice parziale: solo righe con misura presente (= prodotti gomma popolati).
-- Velocizza la query tipica /tires?width=205&aspect=55&diameter=16.
create index if not exists products_tire_size_idx
  on products (tire_width, tire_aspect, tire_diameter)
  where tire_width is not null;
