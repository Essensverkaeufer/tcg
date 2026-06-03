create or replace function public.grant_gacha_pulls(
  p_user_id uuid,
  p_banner_slug text,
  p_pull_count integer,
  p_featured_slug text,
  p_price_per_pull integer default 100,
  p_hard_pity integer default 100
)
returns table (
  coins integer,
  pulls_since_featured integer,
  total_pulls integer,
  featured_copies integer,
  rewards jsonb,
  featured_hits integer,
  cost integer,
  pity_before integer,
  pity_after integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_profile public.profiles%rowtype;
  pity_row public.gacha_pity%rowtype;
  featured_card public.card_templates%rowtype;
  reward_card public.card_templates%rowtype;
  pull_index integer;
  current_pity integer;
  next_pity integer;
  featured_chance numeric;
  featured_roll numeric;
  rarity_roll numeric;
  reward_rarity text;
  reward_list jsonb := '[]'::jsonb;
begin
  if p_user_id is null then
    raise exception 'Missing user id.';
  end if;

  if p_banner_slug is null or char_length(trim(p_banner_slug)) = 0 then
    raise exception 'Missing banner slug.';
  end if;

  if p_pull_count not in (1, 10) then
    raise exception 'Pull count must be 1 or 10.';
  end if;

  if p_price_per_pull <= 0 then
    raise exception 'Invalid pull price.';
  end if;

  if p_hard_pity <= 0 then
    raise exception 'Invalid hard pity.';
  end if;

  select *
  into current_profile
  from public.profiles
  where id = p_user_id
  for update;

  if not found then
    raise exception 'Profile not found.';
  end if;

  cost := p_pull_count * p_price_per_pull;

  if current_profile.coins < cost then
    raise exception 'Not enough coins.';
  end if;

  select *
  into featured_card
  from public.card_templates
  where slug = p_featured_slug;

  if not found then
    raise exception 'Featured card not found.';
  end if;

  insert into public.gacha_pity (user_id, banner_slug)
  values (p_user_id, p_banner_slug)
  on conflict (user_id, banner_slug) do nothing;

  select *
  into pity_row
  from public.gacha_pity
  where user_id = p_user_id
    and banner_slug = p_banner_slug
  for update;

  current_pity := pity_row.pulls_since_featured;
  pity_before := current_pity;
  featured_hits := 0;

  for pull_index in 1..p_pull_count loop
    next_pity := current_pity + 1;

    if next_pity >= p_hard_pity then
      featured_chance := 1;
    else
      featured_chance := least(0.65, 0.005 * power(1.05, greatest(next_pity - 1, 0)));
    end if;

    featured_roll := random();

    if featured_roll < featured_chance then
      reward_card := featured_card;
      current_pity := 0;
      featured_hits := featured_hits + 1;
    else
      rarity_roll := random();
      reward_rarity := case
        when rarity_roll < 0.78 then 'COMMON'
        when rarity_roll < 0.96 then 'RARE'
        when rarity_roll < 0.99 then 'EPIC'
        when rarity_roll < 0.9975 then 'LEGENDARY'
        when rarity_roll < 0.9995 then 'MYTHIC'
        else 'ULTRA_LEGENDARY'
      end;

      select *
      into reward_card
      from public.card_templates
      where rarity = reward_rarity
        and slug <> p_featured_slug
      order by random()
      limit 1;

      if not found then
        select *
        into reward_card
        from public.card_templates
        where rarity = 'COMMON'
          and slug <> p_featured_slug
        order by random()
        limit 1;
      end if;

      if not found then
        raise exception 'No eligible gacha reward cards found.';
      end if;

      current_pity := next_pity;
    end if;

    insert into public.user_card_collection (user_id, card_template_id, quantity)
    values (p_user_id, reward_card.id, 1)
    on conflict (user_id, card_template_id)
    do update set
      quantity = public.user_card_collection.quantity + 1,
      updated_at = now();

    reward_list := reward_list || jsonb_build_array(jsonb_build_object(
      'cardTemplateId', reward_card.id,
      'slug', reward_card.slug,
      'name', reward_card.name,
      'rarity', reward_card.rarity,
      'featured', reward_card.slug = p_featured_slug,
      'pityAfter', current_pity,
      'pullNumber', pull_index
    ));
  end loop;

  update public.profiles
  set coins = current_profile.coins - cost
  where id = p_user_id
  returning profiles.coins into coins;

  update public.gacha_pity as gp
  set
    pulls_since_featured = current_pity,
    total_pulls = gp.total_pulls + p_pull_count,
    featured_copies = gp.featured_copies + featured_hits,
    updated_at = now()
  where gp.user_id = p_user_id
    and gp.banner_slug = p_banner_slug
  returning gp.pulls_since_featured, gp.total_pulls, gp.featured_copies
  into pulls_since_featured, total_pulls, featured_copies;

  rewards := reward_list;
  pity_after := current_pity;

  insert into public.currency_transactions (user_id, amount, reason, metadata)
  values (
    p_user_id,
    -cost,
    'GACHA_PULL',
    jsonb_build_object('bannerSlug', p_banner_slug, 'pullCount', p_pull_count)
  );

  insert into public.gacha_pull_history (
    user_id,
    banner_slug,
    pull_count,
    cost,
    rewards,
    pity_before,
    pity_after,
    featured_hits
  )
  values (
    p_user_id,
    p_banner_slug,
    p_pull_count,
    cost,
    reward_list,
    pity_before,
    pity_after,
    featured_hits
  );

  return next;
end;
$$;

revoke all on function public.grant_gacha_pulls(uuid, text, integer, text, integer, integer) from public;
revoke all on function public.grant_gacha_pulls(uuid, text, integer, text, integer, integer) from anon;
revoke all on function public.grant_gacha_pulls(uuid, text, integer, text, integer, integer) from authenticated;
grant execute on function public.grant_gacha_pulls(uuid, text, integer, text, integer, integer) to service_role;
