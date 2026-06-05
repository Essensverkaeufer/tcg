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
  flavor_text,
  ability_data,
  balance_version
)
values (
  'pillow-necrp',
  'pillow necrp',
  'necrp but tucked in and basically unkillable. the whole enemy team is fighting a pillow fort and losing morale every turn.',
  'DIVINE',
  'BUILDING',
  0,
  50,
  9,
  12,
  '/card-art/cards/pillow-necrp.webp',
  '"YES!! "',
  '[
    {
      "id": "pillow-necrp-full-rest",
      "label": "Full Rest",
      "trigger": "ACTIVATED",
      "requiresTarget": false,
      "cooldownTurns": 3,
      "effects": [
        {
          "type": "HEAL",
          "target": "SELF",
          "amount": 999
        }
      ]
    }
  ]'::jsonb,
  'prototype-0.1'
)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  rarity = excluded.rarity,
  card_type = excluded.card_type,
  attack = excluded.attack,
  health = excluded.health,
  size = excluded.size,
  aura = excluded.aura,
  image_url = excluded.image_url,
  flavor_text = excluded.flavor_text,
  ability_data = excluded.ability_data,
  balance_version = excluded.balance_version;
