update public.card_templates
set
  description = 'necrp, but locked in and way more tuff.',
  flavor_text = 'Same necrp. Heavier aura.',
  ability_data = '[
    {
      "id": "necrp-tuff-board-wipe",
      "label": "Tuff Sweep",
      "trigger": "ACTIVATED",
      "requiresTarget": false,
      "cooldownTurns": 3,
      "effects": [
        {
          "type": "DAMAGE",
          "target": "ENEMY_BOARD_CHARACTERS",
          "amount": 8
        }
      ]
    }
  ]'::jsonb,
where slug = 'necrp-tuff-edition';
