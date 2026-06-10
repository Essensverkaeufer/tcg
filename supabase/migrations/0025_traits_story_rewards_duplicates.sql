alter table public.card_templates
  add column if not exists traits text[] not null default '{}';

alter table public.card_template_submissions
  add column if not exists traits text[] not null default '{}';

alter table public.profiles
  add column if not exists duplicate_credits integer not null default 0 check (duplicate_credits >= 0);

alter table public.currency_transactions
  drop constraint if exists currency_transactions_reason_check;

alter table public.currency_transactions
  add constraint currency_transactions_reason_check
  check (reason in (
    'DAILY_LOGIN',
    'MATCH_WIN',
    'MATCH_LOSS',
    'MATCH_DRAW',
    'PACK_PURCHASE',
    'GACHA_PULL',
    'ADMIN_GRANT',
    'STORY_FIRST_CLEAR',
    'STORY_REPLAY'
  ));

create table if not exists public.duplicate_credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount integer not null,
  reason text not null check (reason in ('CONVERT_DUPLICATES', 'CRAFT_CARD')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists duplicate_credit_transactions_user_idx
on public.duplicate_credit_transactions(user_id, created_at desc);

alter table public.duplicate_credit_transactions enable row level security;

drop policy if exists "players read own duplicate credit ledger" on public.duplicate_credit_transactions;
create policy "players read own duplicate credit ledger"
on public.duplicate_credit_transactions for select
using (auth.uid() = user_id);

grant select on public.duplicate_credit_transactions to authenticated;

with seeded as (
  select
    id,
    array(
      select distinct trait
      from unnest(array[
        case when category not in ('STORY_BOSS', 'STORY_REWARD') then nullif(regexp_replace(upper(coalesce(category, '')), '[^A-Z0-9]+', '_', 'g'), '') end,
        case when category in ('STORY_BOSS', 'STORY_REWARD') or drop_enabled = false then 'STORY' end,
        case when category = 'STORY_BOSS' then 'BOSS' end,
        case when category = 'STORY_REWARD' then 'REWARD' end,
        case when card_type = 'ITEM' then 'COMBO_PIECE' end,
        case when slug in ('pillow-necrp', 'jpjs-basement', 'poland', 'texas', 'florida', 'the-group-chat') then 'TANK' end,
        case when slug in ('white-monster', 'the-bong', 'zubr-beer', 'assault-rifle') then 'SUPPORT' end,
        case when slug in ('charlie-kirk', 'tyler-robinson', 'vanessa', 'tom-macdonald') then 'AGGRESSIVE' end,
        case when slug in ('jpj', 'anarchy', 'gay-little-puppygirl-story-leader', 'anarchy-story-leader') then 'CONTROL' end
      ]) as trait
      where trait is not null and trait <> ''
    ) as traits
  from public.card_templates
)
update public.card_templates as card
set traits = seeded.traits
from seeded
where card.id = seeded.id
  and cardinality(card.traits) = 0
  and cardinality(seeded.traits) > 0;

insert into public.card_templates (
  slug,
  name,
  description,
  rarity,
  card_type,
  attack,
  health,
  size,
  aura,
  image_url,
  sound_effect_url,
  drop_enabled,
  flavor_text,
  ability_data,
  balance_version,
  category,
  traits
) values (
  'trait-foundation-map',
  'Trait Foundation Map',
  'A constellation relic that rewards building around shared traits without giving away every hidden combo.',
  'DIVINE',
  'ITEM',
  2,
  4,
  0,
  2,
  'https://ibhtgdxruglejkpslqgx.supabase.co/storage/v1/object/public/card-art/cards/trait-foundation-map.webp',
  'https://ibhtgdxruglejkpslqgx.supabase.co/storage/v1/object/public/card-art/sounds/trait-foundation-map.mp3',
  true,
  'The map does not show the treasure. It shows why the treasure matters.',
  '[]'::jsonb,
  'prototype-0.1',
  'FOUNDATION',
  array['FOUNDATION', 'SUPPORT', 'COMBO_PIECE']
) on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  rarity = excluded.rarity,
  card_type = excluded.card_type,
  attack = excluded.attack,
  health = excluded.health,
  size = excluded.size,
  aura = excluded.aura,
  image_url = excluded.image_url,
  sound_effect_url = excluded.sound_effect_url,
  drop_enabled = excluded.drop_enabled,
  flavor_text = excluded.flavor_text,
  ability_data = excluded.ability_data,
  balance_version = excluded.balance_version,
  category = excluded.category,
  traits = excluded.traits;

create or replace function public.duplicate_credit_value(p_rarity text)
returns integer
language sql
immutable
as $$
  select case p_rarity
    when 'COMMON' then 5
    when 'RARE' then 15
    when 'EPIC' then 50
    when 'LEGENDARY' then 150
    when 'MYTHIC' then 400
    when 'ULTRA_LEGENDARY' then 900
    when 'DIVINE' then 1500
    else 0
  end;
$$;

create or replace function public.card_craft_cost(p_rarity text)
returns integer
language sql
immutable
as $$
  select case p_rarity
    when 'COMMON' then 30
    when 'RARE' then 90
    when 'EPIC' then 300
    when 'LEGENDARY' then 900
    when 'MYTHIC' then 2400
    when 'ULTRA_LEGENDARY' then 5000
    when 'DIVINE' then 9000
    else 999999
  end;
$$;

create or replace function public.protected_duplicate_copies(p_card_type text, p_rarity text)
returns integer
language sql
immutable
as $$
  select case
    when p_card_type = 'LEADER' then 1
    when p_rarity in ('LEGENDARY', 'MYTHIC', 'ULTRA_LEGENDARY', 'DIVINE') then 1
    else 2
  end;
$$;

create or replace function public.convert_duplicate_extras(p_user_id uuid)
returns table (credits integer, converted jsonb, duplicate_credits integer)
language plpgsql
as $$
declare
  entry record;
  keep_quantity integer;
  extra_quantity integer;
  gained integer;
  total integer := 0;
  converted_list jsonb := '[]'::jsonb;
begin
  perform 1 from public.profiles where id = p_user_id for update;

  for entry in
    select collection.card_template_id, collection.quantity, card.slug, card.name, card.rarity, card.card_type
    from public.user_card_collection as collection
    join public.card_templates as card on card.id = collection.card_template_id
    where collection.user_id = p_user_id
    order by card.name
  loop
    keep_quantity := public.protected_duplicate_copies(entry.card_type, entry.rarity);
    extra_quantity := greatest(0, entry.quantity - keep_quantity);
    if extra_quantity <= 0 then
      continue;
    end if;

    gained := extra_quantity * public.duplicate_credit_value(entry.rarity);
    total := total + gained;
    converted_list := converted_list || jsonb_build_array(jsonb_build_object(
      'cardTemplateId', entry.card_template_id,
      'slug', entry.slug,
      'name', entry.name,
      'rarity', entry.rarity,
      'converted', extra_quantity,
      'credits', gained
    ));

    update public.user_card_collection
    set quantity = keep_quantity,
        updated_at = now()
    where user_id = p_user_id
      and card_template_id = entry.card_template_id;
  end loop;

  if total > 0 then
    update public.profiles
    set duplicate_credits = duplicate_credits + total
    where id = p_user_id
    returning profiles.duplicate_credits into duplicate_credits;

    insert into public.duplicate_credit_transactions (user_id, amount, reason, metadata)
    values (p_user_id, total, 'CONVERT_DUPLICATES', jsonb_build_object('converted', converted_list));
  else
    select profiles.duplicate_credits into duplicate_credits
    from public.profiles
    where profiles.id = p_user_id;
  end if;

  credits := total;
  converted := converted_list;
  return next;
end;
$$;

create or replace function public.craft_collection_card(p_user_id uuid, p_card_slug text)
returns table (card_template_id uuid, duplicate_credits integer, quantity integer, cost integer)
language plpgsql
as $$
declare
  profile_row public.profiles%rowtype;
  card_row public.card_templates%rowtype;
  owned_quantity integer;
begin
  select * into profile_row
  from public.profiles
  where id = p_user_id
  for update;

  if not found then
    raise exception 'Profile not found.';
  end if;

  select * into card_row
  from public.card_templates
  where slug = p_card_slug
    and drop_enabled = true;

  if not found then
    raise exception 'Card cannot be crafted.';
  end if;

  select user_card_collection.quantity into owned_quantity
  from public.user_card_collection
  where user_id = p_user_id
    and user_card_collection.card_template_id = card_row.id;

  if coalesce(owned_quantity, 0) > 0 then
    raise exception 'Only missing cards can be crafted.';
  end if;

  cost := public.card_craft_cost(card_row.rarity);
  if profile_row.duplicate_credits < cost then
    raise exception 'Not enough crafting credits.';
  end if;

  update public.profiles
  set duplicate_credits = duplicate_credits - cost
  where id = p_user_id
  returning profiles.duplicate_credits into duplicate_credits;

  insert into public.user_card_collection (user_id, card_template_id, quantity)
  values (p_user_id, card_row.id, 1)
  on conflict (user_id, card_template_id)
  do update set quantity = public.user_card_collection.quantity + 1,
                updated_at = now()
  returning user_card_collection.card_template_id, user_card_collection.quantity
  into card_template_id, quantity;

  insert into public.duplicate_credit_transactions (user_id, amount, reason, metadata)
  values (p_user_id, -cost, 'CRAFT_CARD', jsonb_build_object('slug', card_row.slug, 'name', card_row.name, 'rarity', card_row.rarity));

  return next;
end;
$$;

revoke all on function public.convert_duplicate_extras(uuid) from public;
revoke all on function public.convert_duplicate_extras(uuid) from anon;
revoke all on function public.convert_duplicate_extras(uuid) from authenticated;
grant execute on function public.convert_duplicate_extras(uuid) to service_role;

revoke all on function public.craft_collection_card(uuid, text) from public;
revoke all on function public.craft_collection_card(uuid, text) from anon;
revoke all on function public.craft_collection_card(uuid, text) from authenticated;
grant execute on function public.craft_collection_card(uuid, text) to service_role;
