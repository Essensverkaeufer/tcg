update public.card_templates
set ability_data = '[{"id":"woke-charlie-kirk-platform-shift","label":"Platform Shift","trigger":"ACTIVATED","requiresTarget":false,"cooldownTurns":3,"effects":[{"type":"DAMAGE","target":"ENEMY_BOARD_CHARACTERS","amount":3},{"type":"BLIND","target":"ENEMY_CHARACTER","amount":1,"duration":"TURN"},{"type":"BUFF_AURA","target":"SELF","amount":2,"duration":"PERMANENT"}]}]'::jsonb
where slug = 'woke-charlie-kirk-chapter-3-leader';

update public.card_templates
set ability_data = '[{"id":"king-von-pressure-story","label":"Story Pressure","trigger":"ACTIVATED","requiresTarget":true,"cooldownTurns":2,"effects":[{"type":"DAMAGE","target":"ENEMY_CHARACTER","amount":8},{"type":"BUFF_ATTACK","target":"SELF","amount":1,"duration":"PERMANENT"}]}]'::jsonb
where slug = 'king-von-chapter-3-leader';

update public.card_templates
set ability_data = '[{"id":"shrekel-not-in-poland-swamp-tax","label":"Swamp Tax","trigger":"ACTIVATED","requiresTarget":false,"cooldownTurns":3,"effects":[{"type":"HEAL","target":"SELF","amount":10},{"type":"SHIELD","target":"SELF"},{"type":"STUN","target":"ENEMY_CHARACTER","amount":1,"duration":"TURN"}]}]'::jsonb
where slug = 'shrekel-not-in-poland-chapter-3-leader';
