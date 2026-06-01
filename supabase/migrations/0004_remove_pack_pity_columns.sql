alter table public.pack_openings
  drop column if exists legendary_pity_after,
  drop column if exists mythic_pity_after;
