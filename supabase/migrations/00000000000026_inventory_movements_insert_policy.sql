-- Aggiunge policy INSERT mancante su inventory_movements.
-- Senza questa, i trigger (non SECURITY DEFINER) e le Server Actions
-- che girano come authenticated user ricevono "violates row-level security".

create policy "inv_mov_insert" on inventory_movements
  for insert
  with check (
    is_admin()
    or has_store_access(store_id)
    or has_store_access(from_store_id)
    or has_store_access(to_store_id)
  );
