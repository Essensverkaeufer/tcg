alter table public.card_templates
  drop column if exists aura_cost,
  drop column if exists aura_value,
  add column if not exists aura integer not null default 0;
