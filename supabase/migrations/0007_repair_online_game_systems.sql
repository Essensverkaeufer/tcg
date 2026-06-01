create extension if not exists pgcrypto;

alter table public.profiles
  drop column if exists display_name;

alter table public.card_templates
  add column if not exists aura integer;

update public.card_templates
set aura = coalesce(aura, aura_value, aura_cost, 0)
where aura is null;

alter table public.card_templates
  alter column aura set default 0,
  alter column aura set not null,
  drop column if exists aura_cost,
  drop column if exists aura_value;

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

drop trigger if exists decks_set_updated_at on public.decks;
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
create index if not exists currency_user_idx on public.currency_transactions(user_id, created_at);

alter table public.pack_openings enable row level security;
alter table public.decks enable row level security;
alter table public.deck_cards enable row level security;
alter table public.currency_transactions enable row level security;

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

drop policy if exists "players read own currency ledger" on public.currency_transactions;
create policy "players read own currency ledger"
on public.currency_transactions for select
to authenticated
using (user_id = auth.uid());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('profile-pictures', 'profile-pictures', true, 5242880, array['image/png', 'image/jpeg', 'image/webp', 'image/gif']),
  ('card-art', 'card-art', true, 10485760, array['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
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
with check (bucket_id = 'profile-pictures' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "players update own profile pictures" on storage.objects;
create policy "players update own profile pictures"
on storage.objects for update
to authenticated
using (bucket_id = 'profile-pictures' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'profile-pictures' and (storage.foldername(name))[1] = auth.uid()::text);

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

create or replace function public.grant_pack_opening(
  p_user_id uuid,
  p_pack_slug text,
  p_price integer,
  p_card_template_ids uuid[]
)
returns table (coins integer, packs_opened integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_profile public.profiles%rowtype;
begin
  if p_user_id is null then
    raise exception 'Missing user id.';
  end if;

  if p_price < 0 then
    raise exception 'Invalid pack price.';
  end if;

  if coalesce(array_length(p_card_template_ids, 1), 0) = 0 then
    raise exception 'Pack must include cards.';
  end if;

  select *
  into current_profile
  from public.profiles
  where id = p_user_id
  for update;

  if not found then
    raise exception 'Profile not found.';
  end if;

  if current_profile.coins < p_price then
    raise exception 'Not enough coins.';
  end if;

  update public.profiles
  set
    coins = current_profile.coins - p_price,
    packs_opened = current_profile.packs_opened + 1
  where id = p_user_id
  returning profiles.coins, profiles.packs_opened
  into coins, packs_opened;

  insert into public.pack_openings (user_id, pack_slug, cards)
  values (p_user_id, p_pack_slug, to_jsonb(p_card_template_ids));

  insert into public.currency_transactions (user_id, amount, reason, metadata)
  values (p_user_id, -p_price, 'PACK_PURCHASE', jsonb_build_object('packSlug', p_pack_slug));

  insert into public.user_card_collection (user_id, card_template_id, quantity)
  select p_user_id, card_template_id, count(*)::integer
  from unnest(p_card_template_ids) as card_template_id
  group by card_template_id
  on conflict (user_id, card_template_id)
  do update set
    quantity = public.user_card_collection.quantity + excluded.quantity,
    updated_at = now();

  return next;
end;
$$;

revoke all on function public.grant_pack_opening(uuid, text, integer, uuid[]) from public;
revoke all on function public.grant_pack_opening(uuid, text, integer, uuid[]) from anon;
revoke all on function public.grant_pack_opening(uuid, text, integer, uuid[]) from authenticated;
grant execute on function public.grant_pack_opening(uuid, text, integer, uuid[]) to service_role;
