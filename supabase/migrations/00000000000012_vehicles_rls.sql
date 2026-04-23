-- Abilita RLS su vehicles e vehicle_makes (advisor Supabase le segnalava
-- entrambe come ERROR `rls_disabled_in_public`). Policy permissive per
-- tutto lo staff attivo in lettura, write riservato a admin/warehouse.

alter table vehicle_makes enable row level security;
alter table vehicles enable row level security;

create policy "vehicle_makes_read"
  on vehicle_makes for select
  using (
    exists (select 1 from staff_profiles where id = auth.uid() and is_active)
  );

create policy "vehicle_makes_write"
  on vehicle_makes for all
  using (
    exists (
      select 1 from staff_profiles
      where id = auth.uid() and role in ('admin', 'warehouse') and is_active
    )
  );

create policy "vehicles_read"
  on vehicles for select
  using (
    exists (select 1 from staff_profiles where id = auth.uid() and is_active)
  );

create policy "vehicles_write"
  on vehicles for all
  using (
    exists (
      select 1 from staff_profiles
      where id = auth.uid() and role in ('admin', 'warehouse') and is_active
    )
  );
