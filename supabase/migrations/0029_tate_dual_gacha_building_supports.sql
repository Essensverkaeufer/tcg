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
  category,
  traits,
  image_url,
  sound_effect_url,
  drop_enabled,
  flavor_text,
  ability_data,
  balance_version
)
values
(
  'andrew-tate',
  'Andrew Tate',
  'A loud DIVINE leader built around pressure, ego, and turning every board state into a sales pitch.',
  'DIVINE',
  'LEADER',
  11,
  13,
  5,
  12,
  'CONTROVERSIAL',
  array['AGGRESSIVE','CONTROL','CONTROVERSIAL'],
  'https://ibhtgdxruglejkpslqgx.supabase.co/storage/v1/object/public/card-art/cards/andrew-tate.webp',
  'https://ibhtgdxruglejkpslqgx.supabase.co/storage/v1/object/public/card-art/sounds/andrew-tate.mp3',
  true,
  'Top G energy, bottom-tier humility.',
  '[{"id":"andrew-tate-matrix-pressure","label":"Matrix Pressure","trigger":"ACTIVATED","requiresTarget":true,"cooldownTurns":2,"effects":[{"type":"DAMAGE","target":"ENEMY_CHARACTER","amount":6},{"type":"BLIND","target":"ENEMY_CHARACTER","amount":1,"duration":"TURN"},{"type":"BUFF_ATTACK","target":"SELF","amount":1,"duration":"PERMANENT"},{"type":"BUFF_AURA","target":"SELF","amount":1,"duration":"PERMANENT"}]}]'::jsonb,
  'prototype-0.1'
),
(
  'tristan-tate',
  'Tristan Tate',
  'A DIVINE support character who makes the leader harder to remove while acting like the whole table is beneath him.',
  'DIVINE',
  'CHARACTER',
  7,
  9,
  4,
  10,
  'CONTROVERSIAL',
  array['SUPPORT','CONTROVERSIAL','COMBO_PIECE'],
  'https://ibhtgdxruglejkpslqgx.supabase.co/storage/v1/object/public/card-art/cards/tristan-tate.webp',
  'https://ibhtgdxruglejkpslqgx.supabase.co/storage/v1/object/public/card-art/sounds/tristan-tate.mp3',
  true,
  'Second brother, first-class nuisance.',
  '[{"id":"tristan-tate-brother-buffer","label":"Brother Buffer","trigger":"ACTIVATED","requiresTarget":false,"cooldownTurns":3,"effects":[{"type":"HEAL","target":"FRIENDLY_LEADER","amount":8},{"type":"SHIELD","target":"FRIENDLY_LEADER"},{"type":"BUFF_AURA","target":"FRIENDLY_LEADER","amount":1,"duration":"PERMANENT"}]}]'::jsonb,
  'prototype-0.1'
),
(
  'zed',
  'Zed',
  'The shadow assassin enters as a high-pressure finisher with blind and scaling damage.',
  'MYTHIC',
  'CHARACTER',
  8,
  6,
  4,
  8,
  'ASSASSIN',
  array['AGGRESSIVE','CONTROL','ASSASSIN'],
  'https://ibhtgdxruglejkpslqgx.supabase.co/storage/v1/object/public/card-art/cards/zed.webp',
  'https://ibhtgdxruglejkpslqgx.supabase.co/storage/v1/object/public/card-art/sounds/zed.mp3',
  true,
  'The shadows already chose a target.',
  '[{"id":"zed-shadow-mark","label":"Shadow Mark","trigger":"ACTIVATED","requiresTarget":true,"cooldownTurns":2,"effects":[{"type":"DAMAGE","target":"ENEMY_CHARACTER","amount":7},{"type":"BLIND","target":"ENEMY_CHARACTER","amount":1,"duration":"TURN"},{"type":"BUFF_ATTACK","target":"SELF","amount":1,"duration":"PERMANENT"}]}]'::jsonb,
  'prototype-0.1'
)
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  rarity = excluded.rarity,
  card_type = excluded.card_type,
  attack = excluded.attack,
  health = excluded.health,
  size = excluded.size,
  aura = excluded.aura,
  category = excluded.category,
  traits = excluded.traits,
  image_url = excluded.image_url,
  sound_effect_url = excluded.sound_effect_url,
  drop_enabled = excluded.drop_enabled,
  flavor_text = excluded.flavor_text,
  ability_data = excluded.ability_data,
  balance_version = excluded.balance_version;

update public.card_templates
set
  attack = 5,
  health = 10,
  size = 3,
  aura = 6,
  category = 'BASED',
  traits = array['BASED','SUPPORT','TANK'],
  ability_data = '[{"id":"the-group-chat-hype-cycle","label":"Hype Cycle","trigger":"ACTIVATED","requiresTarget":false,"cooldownTurns":2,"effects":[{"type":"BUFF_ATTACK","target":"FRIENDLY_BOARD_CHARACTERS","amount":1,"duration":"PERMANENT"}]}]'::jsonb
where slug = 'the-group-chat';

update public.card_templates
set
  attack = 1,
  health = 5,
  size = 3,
  aura = 0,
  category = 'BASED',
  traits = array['BASED','SUPPORT'],
  ability_data = '[{"id":"hunie-pop-speedrunning-reset-route","label":"Reset Route","trigger":"ACTIVATED","requiresTarget":true,"cooldownTurns":2,"effects":[{"type":"HEAL","target":"FRIENDLY_CHARACTER","amount":4}]}]'::jsonb
where slug = 'hunie-pop-speedrunning';

update public.card_templates
set
  attack = 0,
  health = 3,
  size = 4,
  aura = 5,
  category = 'PEDOPHILE',
  traits = array['PEDOPHILE','SUPPORT'],
  ability_data = '[{"id":"huniepotheads-smoke-screen","label":"Smoke Screen","trigger":"ACTIVATED","requiresTarget":true,"cooldownTurns":2,"effects":[{"type":"SHIELD","target":"FRIENDLY_CHARACTER"}]}]'::jsonb
where slug = 'huniepotheads';

update public.card_templates
set
  attack = 3,
  health = 23,
  size = 7,
  aura = 5,
  category = 'BASED',
  traits = array['BASED','SUPPORT','TANK'],
  ability_data = '[{"id":"poland-fortify-line","label":"Fortify Line","trigger":"ACTIVATED","requiresTarget":false,"cooldownTurns":3,"effects":[{"type":"BUFF_HEALTH","target":"FRIENDLY_BOARD_CHARACTERS","amount":2,"duration":"PERMANENT"}]}]'::jsonb
where slug = 'poland';

update public.card_templates
set
  attack = 3,
  health = 15,
  size = 7,
  aura = 3,
  category = 'AMERICAN',
  traits = array['AMERICAN','SUPPORT','TANK'],
  ability_data = '[{"id":"florida-chaos-boost","label":"Chaos Boost","trigger":"ACTIVATED","requiresTarget":true,"cooldownTurns":2,"effects":[{"type":"BUFF_ATTACK","target":"FRIENDLY_CHARACTER","amount":2,"duration":"PERMANENT"},{"type":"BUFF_AURA","target":"FRIENDLY_CHARACTER","amount":1,"duration":"PERMANENT"}]}]'::jsonb
where slug = 'florida';

update public.card_templates
set
  attack = 4,
  health = 15,
  size = 7,
  aura = 4,
  category = 'AMERICAN',
  traits = array['AMERICAN','SUPPORT','TANK'],
  ability_data = '[{"id":"texas-stand-your-ground","label":"Stand Your Ground","trigger":"ACTIVATED","requiresTarget":true,"cooldownTurns":2,"effects":[{"type":"SHIELD","target":"FRIENDLY_CHARACTER"},{"type":"BUFF_ATTACK","target":"FRIENDLY_CHARACTER","amount":1,"duration":"PERMANENT"}]}]'::jsonb
where slug = 'texas';

update public.card_templates
set
  attack = 8,
  health = 23,
  size = 9,
  aura = 9,
  category = 'PEDOPHILE',
  traits = array['PEDOPHILE','SUPPORT','TANK'],
  ability_data = '[{"id":"jpjs-basement-trap","label":"Trap","trigger":"ACTIVATED","requiresTarget":true,"cooldownTurns":3,"conditions":[{"type":"CARD_IN_HAND","cardSlug":"jpj"}],"effects":[{"type":"STUN","target":"ENEMY_CHARACTER","amount":3,"duration":"TURN"}]},{"id":"jpjs-basement-lock-the-door","label":"Lock the Door","trigger":"ACTIVATED","requiresTarget":false,"cooldownTurns":3,"effects":[{"type":"SHIELD","target":"FRIENDLY_LEADER"},{"type":"HEAL","target":"FRIENDLY_LEADER","amount":3}]}]'::jsonb
where slug = 'jpjs-basement';

update public.card_templates
set
  category = 'MINOR',
  traits = array['MINOR','SUPPORT','TANK'],
  ability_data = '[{"id":"pillow-necrp-full-rest","label":"Full Rest","trigger":"ACTIVATED","requiresTarget":false,"cooldownTurns":3,"effects":[{"type":"HEAL","target":"SELF","amount":999}]},{"id":"pillow-necrp-nap-circle","label":"Nap Circle","trigger":"ACTIVATED","requiresTarget":false,"cooldownTurns":3,"effects":[{"type":"HEAL","target":"FRIENDLY_BOARD_CHARACTERS","amount":8}]}]'::jsonb
where slug = 'pillow-necrp';

create or replace function public.grant_gacha_pulls(
  p_user_id uuid,
  p_banner_slug text,
  p_pull_count integer,
  p_featured_slug text,
  p_price_per_pull integer default 100,
  p_hard_pity integer default 100,
  p_featured_slugs text[] default null
)
returns table (
  coins integer,
  pulls_since_featured integer,
  total_pulls integer,
  featured_copies integer,
  rewards jsonb,
  featured_hits integer,
  cost integer,
  pity_before integer,
  pity_after integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_profile public.profiles%rowtype;
  pity_row public.gacha_pity%rowtype;
  reward_card public.card_templates%rowtype;
  pull_index integer;
  current_pity integer;
  next_pity integer;
  featured_chance numeric;
  featured_roll numeric;
  rarity_roll numeric;
  reward_rarity text;
  reward_list jsonb := '[]'::jsonb;
  effective_featured_slugs text[];
  expected_featured_count integer;
  found_featured_count integer;
begin
  if p_user_id is null then
    raise exception 'Missing user id.';
  end if;

  if p_banner_slug is null or char_length(trim(p_banner_slug)) = 0 then
    raise exception 'Missing banner slug.';
  end if;

  if p_pull_count not in (1, 10) then
    raise exception 'Pull count must be 1 or 10.';
  end if;

  if p_price_per_pull <= 0 then
    raise exception 'Invalid pull price.';
  end if;

  if p_hard_pity <= 0 then
    raise exception 'Invalid hard pity.';
  end if;

  effective_featured_slugs := coalesce(array_remove(p_featured_slugs, null), array[]::text[]);
  if array_length(effective_featured_slugs, 1) is null then
    effective_featured_slugs := array[p_featured_slug];
  end if;
  effective_featured_slugs := array(select distinct slug from unnest(effective_featured_slugs) as slug where char_length(trim(slug)) > 0);

  if array_length(effective_featured_slugs, 1) is null then
    raise exception 'Featured card not found.';
  end if;

  expected_featured_count := array_length(effective_featured_slugs, 1);
  select count(*)
  into found_featured_count
  from public.card_templates
  where slug = any(effective_featured_slugs);

  if found_featured_count <> expected_featured_count then
    raise exception 'Featured card not found.';
  end if;

  select *
  into current_profile
  from public.profiles
  where id = p_user_id
  for update;

  if not found then
    raise exception 'Profile not found.';
  end if;

  cost := p_pull_count * p_price_per_pull;

  if current_profile.coins < cost then
    raise exception 'Not enough coins.';
  end if;

  insert into public.gacha_pity (user_id, banner_slug)
  values (p_user_id, p_banner_slug)
  on conflict (user_id, banner_slug) do nothing;

  select *
  into pity_row
  from public.gacha_pity
  where user_id = p_user_id
    and banner_slug = p_banner_slug
  for update;

  current_pity := pity_row.pulls_since_featured;
  pity_before := current_pity;
  featured_hits := 0;

  for pull_index in 1..p_pull_count loop
    next_pity := current_pity + 1;

    if next_pity >= p_hard_pity then
      featured_chance := 1;
    else
      featured_chance := least(0.65, 0.005 * power(1.05, greatest(next_pity - 1, 0)));
    end if;

    featured_roll := random();

    if featured_roll < featured_chance then
      if next_pity >= p_hard_pity then
        select ct.*
        into reward_card
        from public.card_templates ct
        left join public.user_card_collection ucc
          on ucc.card_template_id = ct.id
          and ucc.user_id = p_user_id
        where ct.slug = any(effective_featured_slugs)
        order by coalesce(ucc.quantity, 0) asc, random()
        limit 1;
      else
        select *
        into reward_card
        from public.card_templates
        where slug = any(effective_featured_slugs)
        order by random()
        limit 1;
      end if;

      current_pity := 0;
      featured_hits := featured_hits + 1;
    else
      rarity_roll := random();
      reward_rarity := case
        when rarity_roll < 0.78 then 'COMMON'
        when rarity_roll < 0.96 then 'RARE'
        when rarity_roll < 0.99 then 'EPIC'
        when rarity_roll < 0.9975 then 'LEGENDARY'
        when rarity_roll < 0.9995 then 'MYTHIC'
        else 'ULTRA_LEGENDARY'
      end;

      select *
      into reward_card
      from public.card_templates
      where rarity = reward_rarity
        and slug <> all(effective_featured_slugs)
        and drop_enabled = true
      order by random()
      limit 1;

      if not found then
        select *
        into reward_card
        from public.card_templates
        where rarity = 'COMMON'
          and slug <> all(effective_featured_slugs)
          and drop_enabled = true
        order by random()
        limit 1;
      end if;

      if not found then
        raise exception 'No eligible gacha reward cards found.';
      end if;

      current_pity := next_pity;
    end if;

    insert into public.user_card_collection (user_id, card_template_id, quantity)
    values (p_user_id, reward_card.id, 1)
    on conflict (user_id, card_template_id)
    do update set
      quantity = public.user_card_collection.quantity + 1,
      updated_at = now();

    reward_list := reward_list || jsonb_build_array(jsonb_build_object(
      'cardTemplateId', reward_card.id,
      'slug', reward_card.slug,
      'name', reward_card.name,
      'rarity', reward_card.rarity,
      'featured', reward_card.slug = any(effective_featured_slugs),
      'pityAfter', current_pity,
      'pullNumber', pull_index
    ));
  end loop;

  update public.profiles
  set coins = current_profile.coins - cost
  where id = p_user_id
  returning profiles.coins into coins;

  update public.gacha_pity as gp
  set
    pulls_since_featured = current_pity,
    total_pulls = gp.total_pulls + p_pull_count,
    featured_copies = gp.featured_copies + featured_hits,
    updated_at = now()
  where gp.user_id = p_user_id
    and gp.banner_slug = p_banner_slug
  returning gp.pulls_since_featured, gp.total_pulls, gp.featured_copies
  into pulls_since_featured, total_pulls, featured_copies;

  rewards := reward_list;
  pity_after := current_pity;

  insert into public.currency_transactions (user_id, amount, reason, metadata)
  values (
    p_user_id,
    -cost,
    'GACHA_PULL',
    jsonb_build_object('bannerSlug', p_banner_slug, 'pullCount', p_pull_count)
  );

  insert into public.gacha_pull_history (
    user_id,
    banner_slug,
    pull_count,
    cost,
    rewards,
    pity_before,
    pity_after,
    featured_hits
  )
  values (
    p_user_id,
    p_banner_slug,
    p_pull_count,
    cost,
    reward_list,
    pity_before,
    pity_after,
    featured_hits
  );

  return next;
end;
$$;

revoke all on function public.grant_gacha_pulls(uuid, text, integer, text, integer, integer, text[]) from public;
revoke all on function public.grant_gacha_pulls(uuid, text, integer, text, integer, integer, text[]) from anon;
revoke all on function public.grant_gacha_pulls(uuid, text, integer, text, integer, integer, text[]) from authenticated;
grant execute on function public.grant_gacha_pulls(uuid, text, integer, text, integer, integer, text[]) to service_role;
