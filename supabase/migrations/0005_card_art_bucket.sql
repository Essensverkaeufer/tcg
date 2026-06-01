insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'card-art',
  'card-art',
  true,
  10485760,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "card art is publicly readable" on storage.objects;
create policy "card art is publicly readable"
on storage.objects for select
using (bucket_id = 'card-art');

drop policy if exists "authenticated users upload card art" on storage.objects;
create policy "authenticated users upload card art"
on storage.objects for insert
to authenticated
with check (bucket_id = 'card-art');

drop policy if exists "authenticated users update card art" on storage.objects;
create policy "authenticated users update card art"
on storage.objects for update
to authenticated
using (bucket_id = 'card-art')
with check (bucket_id = 'card-art');
