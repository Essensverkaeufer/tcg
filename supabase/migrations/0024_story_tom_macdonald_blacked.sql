with base_tom as (
  select
    image_url,
    sound_effect_url
  from public.card_templates
  where slug = 'tom-macdonald'
  limit 1
),
story_cards as (
  select
    card.slug,
    card.name,
    card.description,
    card.rarity,
    card.card_type,
    card.attack,
    card.health,
    card.size,
    card.aura,
    coalesce(base_tom.image_url, 'https://ibhtgdxruglejkpslqgx.supabase.co/storage/v1/object/public/card-art/cards/tom-macdonald.webp') as image_url,
    coalesce(base_tom.sound_effect_url, 'https://ibhtgdxruglejkpslqgx.supabase.co/storage/v1/object/public/card-art/sounds/tom-macdonald.mp3') as sound_effect_url,
    card.flavor_text,
    '[]'::jsonb as ability_data,
    card.balance_version,
    card.category,
    false as drop_enabled
  from (
    values
      (
        'tom-macdonald-blacked-chapter-2-leader',
        'Tom MacDonald (Blacked)',
        'A story-only leader guarding the last stretch before the ascended Woke Mind Virus.',
        'DIVINE',
        'LEADER',
        13,
        36,
        7,
        12,
        'The gate before the rematch got louder.',
        'story-2.5',
        'STORY_BOSS'
      ),
      (
        'tom-macdonald-blacked-chapter-2-reward',
        'Tom MacDonald (Blacked Reward)',
        'A story reward character version of Tom MacDonald (Blacked).',
        'DIVINE',
        'CHARACTER',
        9,
        11,
        5,
        7,
        'Less boss fight, still a warning shot.',
        'story-2.5',
        'STORY_REWARD'
      )
  ) as card(
    slug,
    name,
    description,
    rarity,
    card_type,
    attack,
    health,
    size,
    aura,
    flavor_text,
    balance_version,
    category
  )
  left join base_tom on true
)
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
select
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
from story_cards
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
  image_url = excluded.image_url,
  sound_effect_url = excluded.sound_effect_url,
  flavor_text = excluded.flavor_text,
  ability_data = excluded.ability_data,
  balance_version = excluded.balance_version,
  category = excluded.category,
  drop_enabled = excluded.drop_enabled;
