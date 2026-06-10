delete from public.user_card_collection
where card_template_id in (
  select id from public.card_templates where slug = 'trait-foundation-map'
);

delete from public.gacha_pity
where banner_slug = 'trait-foundations-constellation';

delete from public.gacha_pull_history
where banner_slug = 'trait-foundations-constellation';

delete from public.card_templates
where slug = 'trait-foundation-map';

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
  'rowletforsenator-evil',
  'RowletForSenator (Evil)',
  'RowletForSenator after the campaign trail got corrupted and the study arc went fully sinister.',
  'DIVINE',
  'CHARACTER',
  10,
  12,
  5,
  9,
  'https://ibhtgdxruglejkpslqgx.supabase.co/storage/v1/object/public/card-art/cards/rowletforsenator.webp',
  'https://ibhtgdxruglejkpslqgx.supabase.co/storage/v1/object/public/sounds/rowletforsenator.mp3',
  true,
  'Still studying. Different syllabus.',
  '[{"id":"rowletforsenator-evil-opposition-research","label":"Opposition Research","trigger":"ACTIVATED","requiresTarget":true,"cooldownTurns":2,"effects":[{"type":"DAMAGE","target":"ENEMY_CHARACTER","amount":5},{"type":"BLIND","target":"ENEMY_CHARACTER","amount":1,"duration":"TURN"}]}]'::jsonb,
  'prototype-0.1',
  'AMERICAN',
  array['AMERICAN', 'CONTROL', 'AGGRESSIVE']
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
