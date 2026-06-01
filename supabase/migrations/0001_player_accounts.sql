-- Friend TCG Supabase foundation.
-- Passwords are intentionally not stored here. Supabase Auth manages credentials in auth.users
-- and stores only bcrypt hashes in encrypted_password.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-zA-Z0-9_]{3,24}$'),
  avatar_path text,
  avatar_url text,
  bio text check (char_length(coalesce(bio, '')) <= 280),
  coins integer not null default 1000 check (coins >= 0),
  wins integer not null default 0 check (wins >= 0),
  losses integer not null default 0 check (losses >= 0),
  matches_played integer not null default 0 check (matches_played >= 0),
  packs_opened integer not null default 0 check (packs_opened >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_username text;
  safe_username text;
begin
  requested_username := coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1), 'player');
  safe_username := regexp_replace(requested_username, '[^a-zA-Z0-9_]', '_', 'g');
  if char_length(safe_username) < 3 then
    safe_username := 'player_' || substr(new.id::text, 1, 8);
  end if;

  insert into public.profiles (id, username)
  values (
    new.id,
    lower(substr(safe_username, 1, 24))
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create table if not exists public.card_templates (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null,
  rarity text not null check (rarity in ('COMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC', 'ULTRA_LEGENDARY')),
  card_type text not null check (card_type in ('CHARACTER', 'BUILDING', 'ITEM', 'LEADER')),
  attack integer not null default 0,
  health integer not null default 0,
  size integer not null default 1,
  aura integer not null default 0,
  image_url text not null default '',
  flavor_text text,
  ability_data jsonb not null default '[]'::jsonb,
  balance_version text not null default 'prototype-0.1',
  created_at timestamptz not null default now()
);

create index if not exists card_templates_type_idx on public.card_templates(card_type);
create index if not exists card_templates_rarity_idx on public.card_templates(rarity);

create table if not exists public.user_card_collection (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  card_template_id uuid not null references public.card_templates(id) on delete cascade,
  quantity integer not null default 0 check (quantity >= 0),
  first_owned_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, card_template_id)
);

create trigger collection_set_updated_at
before update on public.user_card_collection
for each row execute function public.set_updated_at();

create table if not exists public.pack_openings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  pack_slug text not null,
  cards jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.decks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger decks_set_updated_at
before update on public.decks
for each row execute function public.set_updated_at();

create table if not exists public.deck_cards (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references public.decks(id) on delete cascade,
  card_template_id uuid not null references public.card_templates(id) on delete cascade,
  quantity integer not null check (quantity > 0),
  unique (deck_id, card_template_id)
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'QUEUED' check (status in ('QUEUED', 'ACTIVE', 'FINISHED', 'CANCELLED')),
  winner_id uuid references auth.users(id),
  final_state jsonb,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);

create table if not exists public.match_players (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  deck_id uuid references public.decks(id),
  seat integer not null check (seat in (1, 2)),
  result text check (result in ('WIN', 'LOSS', 'DRAW')),
  coins_earned integer not null default 0 check (coins_earned >= 0),
  unique (match_id, user_id),
  unique (match_id, seat)
);

create table if not exists public.match_action_logs (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  user_id uuid references auth.users(id),
  action text not null,
  payload jsonb not null default '{}'::jsonb,
  state_hash text,
  created_at timestamptz not null default now()
);

create table if not exists public.currency_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount integer not null,
  reason text not null check (reason in ('DAILY_LOGIN', 'MATCH_WIN', 'MATCH_LOSS', 'PACK_PURCHASE', 'ADMIN_GRANT')),
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists collection_user_idx on public.user_card_collection(user_id);
create index if not exists decks_user_idx on public.decks(user_id, is_active);
create index if not exists match_players_user_idx on public.match_players(user_id);
create index if not exists match_logs_match_idx on public.match_action_logs(match_id, created_at);
create index if not exists currency_user_idx on public.currency_transactions(user_id, created_at);

alter table public.profiles enable row level security;
alter table public.card_templates enable row level security;
alter table public.user_card_collection enable row level security;
alter table public.pack_openings enable row level security;
alter table public.decks enable row level security;
alter table public.deck_cards enable row level security;
alter table public.matches enable row level security;
alter table public.match_players enable row level security;
alter table public.match_action_logs enable row level security;
alter table public.currency_transactions enable row level security;

drop policy if exists "profiles are visible to signed in users" on public.profiles;
create policy "profiles are visible to signed in users"
on public.profiles for select
to authenticated
using (true);

drop policy if exists "players update own profile" on public.profiles;
create policy "players update own profile"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "card library is visible" on public.card_templates;
create policy "card library is visible"
on public.card_templates for select
to authenticated
using (true);

drop policy if exists "players read own collection" on public.user_card_collection;
create policy "players read own collection"
on public.user_card_collection for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "players read own pack openings" on public.pack_openings;
create policy "players read own pack openings"
on public.pack_openings for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "players read own decks" on public.decks;
create policy "players read own decks"
on public.decks for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "players manage own decks" on public.decks;
create policy "players manage own decks"
on public.decks for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "players read cards in own decks" on public.deck_cards;
create policy "players read cards in own decks"
on public.deck_cards for select
to authenticated
using (exists (select 1 from public.decks where decks.id = deck_cards.deck_id and decks.user_id = auth.uid()));

drop policy if exists "players manage cards in own decks" on public.deck_cards;
create policy "players manage cards in own decks"
on public.deck_cards for all
to authenticated
using (exists (select 1 from public.decks where decks.id = deck_cards.deck_id and decks.user_id = auth.uid()))
with check (exists (select 1 from public.decks where decks.id = deck_cards.deck_id and decks.user_id = auth.uid()));

drop policy if exists "players read own matches" on public.matches;
create policy "players read own matches"
on public.matches for select
to authenticated
using (exists (select 1 from public.match_players where match_players.match_id = matches.id and match_players.user_id = auth.uid()));

drop policy if exists "players read own match rows" on public.match_players;
create policy "players read own match rows"
on public.match_players for select
to authenticated
using (user_id = auth.uid() or exists (select 1 from public.match_players own where own.match_id = match_players.match_id and own.user_id = auth.uid()));

drop policy if exists "players read logs for own matches" on public.match_action_logs;
create policy "players read logs for own matches"
on public.match_action_logs for select
to authenticated
using (exists (select 1 from public.match_players where match_players.match_id = match_action_logs.match_id and match_players.user_id = auth.uid()));

drop policy if exists "players read own currency ledger" on public.currency_transactions;
create policy "players read own currency ledger"
on public.currency_transactions for select
to authenticated
using (user_id = auth.uid());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-pictures',
  'profile-pictures',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "profile pictures are publicly readable" on storage.objects;
create policy "profile pictures are publicly readable"
on storage.objects for select
using (bucket_id = 'profile-pictures');

drop policy if exists "players upload own profile pictures" on storage.objects;
create policy "players upload own profile pictures"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'profile-pictures'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "players update own profile pictures" on storage.objects;
create policy "players update own profile pictures"
on storage.objects for update
to authenticated
using (
  bucket_id = 'profile-pictures'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'profile-pictures'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "players delete own profile pictures" on storage.objects;
create policy "players delete own profile pictures"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'profile-pictures'
  and (storage.foldername(name))[1] = auth.uid()::text
);
