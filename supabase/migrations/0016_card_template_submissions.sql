create extension if not exists pgcrypto;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'card-art',
  'card-art',
  true,
  10485760,
  array[
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif',
    'audio/mpeg',
    'audio/mp3',
    'audio/ogg',
    'audio/wav',
    'audio/x-wav',
    'audio/mp4',
    'audio/x-m4a',
    'audio/webm'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.card_template_submissions (
  id uuid primary key default gen_random_uuid(),
  submitter_id uuid not null references auth.users(id) on delete cascade,
  reviewer_id uuid references auth.users(id) on delete set null,
  status text not null default 'PENDING' check (status in ('PENDING', 'APPROVED')),
  slug text not null,
  name text not null check (char_length(name) between 1 and 80),
  description text not null default '',
  rarity text not null check (rarity in ('COMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC', 'ULTRA_LEGENDARY', 'DIVINE')),
  card_type text not null check (card_type in ('CHARACTER', 'BUILDING', 'ITEM', 'LEADER')),
  attack integer not null default 0 check (attack >= 0),
  health integer not null default 0 check (health >= 0),
  size integer not null default 0 check (size >= 0),
  aura integer not null default 0 check (aura >= 0),
  image_url text not null default '',
  image_path text,
  sound_effect_url text not null default '',
  sound_effect_path text,
  flavor_text text,
  ability_data jsonb not null default '[]'::jsonb,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (slug)
);

drop trigger if exists card_template_submissions_set_updated_at on public.card_template_submissions;
create trigger card_template_submissions_set_updated_at
before update on public.card_template_submissions
for each row execute function public.set_updated_at();

create index if not exists card_template_submissions_status_idx
on public.card_template_submissions(status, submitted_at);

create index if not exists card_template_submissions_submitter_idx
on public.card_template_submissions(submitter_id, submitted_at);

alter table public.card_template_submissions enable row level security;

drop policy if exists "players read own card submissions" on public.card_template_submissions;
create policy "players read own card submissions"
on public.card_template_submissions for select
to authenticated
using (submitter_id = auth.uid());

drop policy if exists "players create own card submissions" on public.card_template_submissions;
create policy "players create own card submissions"
on public.card_template_submissions for insert
to authenticated
with check (submitter_id = auth.uid());

drop policy if exists "admins manage card submissions" on public.card_template_submissions;
create policy "admins manage card submissions"
on public.card_template_submissions for all
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.username in ('essens', 'essens2')
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.username in ('essens', 'essens2')
  )
);
