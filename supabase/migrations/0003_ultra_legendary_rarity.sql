alter table public.card_templates
  drop constraint if exists card_templates_rarity_check;

alter table public.card_templates
  add constraint card_templates_rarity_check
  check (rarity in ('COMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC', 'ULTRA_LEGENDARY'));
