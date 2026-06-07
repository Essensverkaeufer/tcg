update public.card_templates
set ability_data = '[
  {
    "id": "gay-little-puppygirl-woke-mind-virus",
    "label": "Woke Mind Virus",
    "trigger": "ACTIVATED",
    "requiresTarget": false,
    "oncePerGame": true,
    "effects": [
      {
        "type": "COIN_FLIP",
        "target": "SELF",
        "metadata": {
          "heads": [
            {
              "type": "COIN_FLIP",
              "target": "SELF",
              "metadata": {
                "heads": [
                  {
                    "type": "DESTROY",
                    "target": "ENEMY_CHARACTER"
                  }
                ],
                "tails": []
              }
            }
          ],
          "tails": []
        }
      }
    ]
  }
]'::jsonb
where slug = 'gay-little-puppygirl';
