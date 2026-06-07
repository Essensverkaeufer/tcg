update public.card_templates
set ability_data = '[
  {
    "id": "jpjs-basement-trap",
    "label": "Trap",
    "trigger": "ACTIVATED",
    "requiresTarget": true,
    "cooldownTurns": 3,
    "conditions": [
      {
        "type": "CARD_IN_HAND",
        "cardSlug": "jpj"
      }
    ],
    "effects": [
      {
        "type": "STUN",
        "target": "ENEMY_CHARACTER",
        "amount": 3,
        "duration": "TURN"
      }
    ]
  }
]'::jsonb
where slug = 'jpjs-basement';

update public.card_templates
set ability_data = '[
  {
    "id": "vanessa-heartbroken",
    "label": "Heartbroken",
    "trigger": "ACTIVATED",
    "requiresTarget": false,
    "cooldownTurns": 3,
    "conditions": [
      {
        "type": "LEADER_IS",
        "cardSlugs": ["garrett-current", "garrett-prime"]
      }
    ],
    "effects": [
      {
        "type": "BUFF_ATTACK",
        "target": "SELF",
        "amount": 3,
        "duration": "PERMANENT"
      }
    ]
  }
]'::jsonb
where slug = 'vanessa';
