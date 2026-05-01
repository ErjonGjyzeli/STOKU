-- Etichette stampate: timestamp ultima stampa per `products` e `shelves`.
--
-- Razionale: spec §3.7 + §7.bis "Stampa massiva". Filtro
-- `only_unprinted` nella generator UI seleziona elementi con
-- `last_label_printed_at is null` (semantica esplicita: mai stampati).
-- Aggiornato dalla route `/labels` dopo il render PDF in batch.
--
-- Idempotente per consentire ri-applicazione manuale durante lo
-- sviluppo locale (Supabase CLI). Nessun default: assente significa
-- "mai stampato".

alter table products
  add column if not exists last_label_printed_at timestamptz;

alter table shelves
  add column if not exists last_label_printed_at timestamptz;
