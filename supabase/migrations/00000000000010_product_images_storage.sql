-- Bucket e policy per le foto prodotto.
--
-- Layout storage: `product-images/<product_id>/<image_uuid>.<ext>`.
-- Bucket public (read anonymous) per evitare di firmare URL per ogni thumb;
-- upload e delete restano vincolati a admin/warehouse via RLS su
-- storage.objects.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Storage.objects policy: chiunque legge dal bucket pubblico.
create policy "product_images_storage_read"
  on storage.objects for select
  using (bucket_id = 'product-images');

create policy "product_images_storage_write"
  on storage.objects for insert
  with check (
    bucket_id = 'product-images'
    and exists (
      select 1 from public.staff_profiles
      where id = auth.uid() and role in ('admin', 'warehouse') and is_active
    )
  );

create policy "product_images_storage_update"
  on storage.objects for update
  using (
    bucket_id = 'product-images'
    and exists (
      select 1 from public.staff_profiles
      where id = auth.uid() and role in ('admin', 'warehouse') and is_active
    )
  );

create policy "product_images_storage_delete"
  on storage.objects for delete
  using (
    bucket_id = 'product-images'
    and exists (
      select 1 from public.staff_profiles
      where id = auth.uid() and role in ('admin', 'warehouse') and is_active
    )
  );

-- Policy mancanti su public.product_images (RLS era abilitata dalla F1
-- ma senza policy → blocco totale; advisor Supabase le segnalava).
create policy "product_images_read"
  on public.product_images for select
  using (
    exists (select 1 from public.staff_profiles where id = auth.uid() and is_active)
  );

create policy "product_images_write"
  on public.product_images for all
  using (
    exists (
      select 1 from public.staff_profiles
      where id = auth.uid() and role in ('admin', 'warehouse') and is_active
    )
  );
