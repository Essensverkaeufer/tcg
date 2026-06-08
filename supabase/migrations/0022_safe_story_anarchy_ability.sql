update public.card_templates
set ability_data = '[{"id":"anarchy-story-ban-my-opps","label":"Ban My Opps","trigger":"ACTIVATED","oncePerGame":true,"requiresTarget":false,"effects":[{"type":"DESTROY","target":"RANDOM_ENEMY_CHARACTER"}]}]'::jsonb
where slug = 'anarchy-story-leader';
