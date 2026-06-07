alter table public.card_templates
add column if not exists drop_enabled boolean not null default true;

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
  flavor_text,
  ability_data,
  balance_version,
  category,
  drop_enabled
)
values
  (
    'gay-little-puppygirl-story-leader',
    'gay Little puppygirl (Story Leader)',
    'A story-only boss leader version of gay Little puppygirl.',
    'MYTHIC',
    'LEADER',
    8,
    16,
    5,
    9,
    'https://ibhtgdxruglejkpslqgx.supabase.co/storage/v1/object/public/card-art/cards/gay-little-puppygirl.webp',
    'https://ibhtgdxruglejkpslqgx.supabase.co/storage/v1/object/public/sounds/gay-little-puppygirl.mp3',
    'tiny bark, catastrophic consequences.',
    '[{"id":"gay-little-puppygirl-woke-mind-virus","label":"Woke Mind Virus","trigger":"ACTIVATED","oncePerGame":true,"requiresTarget":false,"effects":[{"type":"COIN_FLIP","target":"SELF","metadata":{"heads":[{"type":"COIN_FLIP","target":"SELF","metadata":{"heads":[{"type":"DESTROY","target":"ENEMY_CHARACTER"}],"tails":[]}}],"tails":[]}}]}]'::jsonb,
    'story-1.0',
    'STORY_BOSS',
    false
  ),
  (
    'buurazu-story-leader',
    'buurazu (Story Leader)',
    'A story-only boss leader version of buurazu.',
    'MYTHIC',
    'LEADER',
    7,
    20,
    7,
    10,
    'https://ibhtgdxruglejkpslqgx.supabase.co/storage/v1/object/public/card-art/cards/buurazu.webp',
    'https://ibhtgdxruglejkpslqgx.supabase.co/storage/v1/object/public/sounds/buurazu.mp3',
    'The pressure gets worse the longer this goes.',
    '[{"id":"buurazu-story-mythic-pressure","label":"Mythic Pressure","trigger":"ACTIVATED","requiresTarget":false,"cooldownTurns":3,"effects":[{"type":"BUFF_ATTACK","target":"SELF","amount":2,"duration":"PERMANENT"},{"type":"BUFF_HEALTH","target":"SELF","amount":3,"duration":"PERMANENT"},{"type":"BUFF_AURA","target":"SELF","amount":1,"duration":"PERMANENT"}]}]'::jsonb,
    'story-1.0',
    'STORY_BOSS',
    false
  ),
  (
    'anarchy-story-leader',
    'Anarchy (Story Leader)',
    'A story-only boss leader version of Anarchy.',
    'LEGENDARY',
    'LEADER',
    8,
    24,
    8,
    10,
    'https://ibhtgdxruglejkpslqgx.supabase.co/storage/v1/object/public/card-art/cards/anarchy.webp',
    'https://ibhtgdxruglejkpslqgx.supabase.co/storage/v1/object/public/sounds/anarchy.mp3',
    '"my lawyer took away my food stamps"',
    '[{"id":"anarchy-story-ban-my-opps","label":"Ban My Opps","trigger":"ACTIVATED","oncePerGame":true,"requiresTarget":false,"effects":[{"type":"DESTROY","target":"RANDOM_ENEMY"}]}]'::jsonb,
    'story-1.0',
    'STORY_BOSS',
    false
  ),
  (
    'pacmanpowerghost-corrupted-story-leader',
    'pacmanpowerghost (corrupted)',
    'A story-only corrupted boss leader version of pacmanpowerghost.',
    'DIVINE',
    'LEADER',
    10,
    32,
    7,
    11,
    'https://ibhtgdxruglejkpslqgx.supabase.co/storage/v1/object/public/card-art/cards/pacmanpowerghost.webp',
    'https://ibhtgdxruglejkpslqgx.supabase.co/storage/v1/object/public/sounds/pacmanpowerghost.mp3',
    'The ghost came back wrong.',
    '[{"id":"pacmanpowerghost-corrupted-haunt","label":"Corrupted Haunt","trigger":"ACTIVATED","requiresTarget":true,"cooldownTurns":2,"effects":[{"type":"DAMAGE","target":"ENEMY_CHARACTER","amount":5},{"type":"BLIND","target":"ENEMY_CHARACTER","amount":1,"duration":"TURN"}]}]'::jsonb,
    'story-1.0',
    'STORY_BOSS',
    false
  ),
  (
    'gay-little-puppygirl-story-reward',
    'gay Little puppygirl (Story Reward)',
    'A story reward character version of gay Little puppygirl.',
    'MYTHIC',
    'CHARACTER',
    7,
    6,
    4,
    6,
    'https://ibhtgdxruglejkpslqgx.supabase.co/storage/v1/object/public/card-art/cards/gay-little-puppygirl.webp',
    'https://ibhtgdxruglejkpslqgx.supabase.co/storage/v1/object/public/sounds/gay-little-puppygirl.mp3',
    'A smaller version of the boss bite.',
    '[]'::jsonb,
    'story-1.0',
    'STORY_REWARD',
    false
  ),
  (
    'buurazu-story-reward',
    'buurazu (Story Reward)',
    'A story reward character version of buurazu.',
    'MYTHIC',
    'CHARACTER',
    4,
    8,
    5,
    6,
    'https://ibhtgdxruglejkpslqgx.supabase.co/storage/v1/object/public/card-art/cards/buurazu.webp',
    'https://ibhtgdxruglejkpslqgx.supabase.co/storage/v1/object/public/sounds/buurazu.mp3',
    'Still heavy, just not boss-heavy.',
    '[]'::jsonb,
    'story-1.0',
    'STORY_REWARD',
    false
  ),
  (
    'anarchy-story-reward',
    'Anarchy (Story Reward)',
    'A story reward character version of Anarchy.',
    'EPIC',
    'CHARACTER',
    5,
    7,
    5,
    5,
    'https://ibhtgdxruglejkpslqgx.supabase.co/storage/v1/object/public/card-art/cards/anarchy.webp',
    'https://ibhtgdxruglejkpslqgx.supabase.co/storage/v1/object/public/sounds/anarchy.mp3',
    'A controlled dose of chaos.',
    '[]'::jsonb,
    'story-1.0',
    'STORY_REWARD',
    false
  ),
  (
    'pacmanpowerghost-corrupted-story-reward',
    'pacmanpowerghost (corrupted reward)',
    'A story reward character version of corrupted pacmanpowerghost.',
    'MYTHIC',
    'CHARACTER',
    6,
    7,
    4,
    6,
    'https://ibhtgdxruglejkpslqgx.supabase.co/storage/v1/object/public/card-art/cards/pacmanpowerghost.webp',
    'https://ibhtgdxruglejkpslqgx.supabase.co/storage/v1/object/public/sounds/pacmanpowerghost.mp3',
    'A ghost you actually get to keep.',
    '[]'::jsonb,
    'story-1.0',
    'STORY_REWARD',
    false
  )
on conflict (slug)
do update set
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
  flavor_text = excluded.flavor_text,
  ability_data = excluded.ability_data,
  balance_version = excluded.balance_version,
  category = excluded.category,
  drop_enabled = excluded.drop_enabled;

create or replace function public.grant_gacha_pulls(
  p_user_id uuid,
  p_banner_slug text,
  p_pull_count integer,
  p_featured_slug text,
  p_price_per_pull integer default 100,
  p_hard_pity integer default 100
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
  featured_card public.card_templates%rowtype;
  reward_card public.card_templates%rowtype;
  pull_index integer;
  current_pity integer;
  next_pity integer;
  featured_chance numeric;
  featured_roll numeric;
  rarity_roll numeric;
  reward_rarity text;
  reward_list jsonb := '[]'::jsonb;
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

  select *
  into featured_card
  from public.card_templates
  where slug = p_featured_slug;

  if not found then
    raise exception 'Featured card not found.';
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
      reward_card := featured_card;
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
        and slug <> p_featured_slug
        and drop_enabled = true
      order by random()
      limit 1;

      if not found then
        select *
        into reward_card
        from public.card_templates
        where rarity = 'COMMON'
          and slug <> p_featured_slug
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
      'featured', reward_card.slug = p_featured_slug,
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

revoke all on function public.grant_gacha_pulls(uuid, text, integer, text, integer, integer) from public;
revoke all on function public.grant_gacha_pulls(uuid, text, integer, text, integer, integer) from anon;
revoke all on function public.grant_gacha_pulls(uuid, text, integer, text, integer, integer) from authenticated;
grant execute on function public.grant_gacha_pulls(uuid, text, integer, text, integer, integer) to service_role;
