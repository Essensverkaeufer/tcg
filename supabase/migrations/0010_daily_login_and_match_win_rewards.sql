create extension if not exists pgcrypto;

create table if not exists public.daily_login_rewards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reward_date date not null default (timezone('utc', now())::date),
  amount integer not null default 100 check (amount > 0),
  created_at timestamptz not null default now(),
  unique (user_id, reward_date)
);

create index if not exists daily_login_rewards_user_date_idx
on public.daily_login_rewards(user_id, reward_date desc);

alter table public.daily_login_rewards enable row level security;

drop policy if exists "players read own daily login rewards" on public.daily_login_rewards;
create policy "players read own daily login rewards"
on public.daily_login_rewards for select
to authenticated
using (user_id = auth.uid());

create or replace function public.claim_daily_login_reward(
  p_user_id uuid,
  p_reward integer default 100
)
returns table (coins integer, claimed boolean, reward_date date)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_profile public.profiles%rowtype;
  today date := timezone('utc', now())::date;
  reward_id uuid;
begin
  if p_user_id is null then
    raise exception 'Missing user id.';
  end if;

  if p_reward <= 0 then
    raise exception 'Invalid daily login reward.';
  end if;

  select *
  into current_profile
  from public.profiles
  where id = p_user_id
  for update;

  if not found then
    raise exception 'Profile not found.';
  end if;

  insert into public.daily_login_rewards (user_id, reward_date, amount)
  values (p_user_id, today, p_reward)
  on conflict (user_id, reward_date) do nothing
  returning id into reward_id;

  reward_date := today;

  if reward_id is null then
    coins := current_profile.coins;
    claimed := false;
    return next;
    return;
  end if;

  update public.profiles
  set coins = coins + p_reward
  where id = p_user_id
  returning profiles.coins into coins;

  insert into public.currency_transactions (user_id, amount, reason, metadata)
  values (
    p_user_id,
    p_reward,
    'DAILY_LOGIN',
    jsonb_build_object('rewardDate', today)
  );

  claimed := true;
  return next;
end;
$$;

revoke all on function public.claim_daily_login_reward(uuid, integer) from public;
revoke all on function public.claim_daily_login_reward(uuid, integer) from anon;
revoke all on function public.claim_daily_login_reward(uuid, integer) from authenticated;
grant execute on function public.claim_daily_login_reward(uuid, integer) to service_role;

create or replace function public.finish_multiplayer_match(
  p_match_id uuid,
  p_winner_id uuid,
  p_finish_reason text,
  p_winner_reward integer default 300,
  p_loser_reward integer default 25,
  p_draw_reward integer default 40
)
returns table (match_id uuid, rewards_granted boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  match_row public.matches%rowtype;
  player_row public.match_players%rowtype;
  reward_amount integer;
  result_value text;
begin
  select *
  into match_row
  from public.matches
  where id = p_match_id
  for update;

  if not found then
    raise exception 'Match not found.';
  end if;

  if match_row.reward_granted_at is not null then
    match_id := p_match_id;
    rewards_granted := false;
    return next;
    return;
  end if;

  update public.matches
  set
    status = 'FINISHED',
    winner_id = p_winner_id,
    finish_reason = p_finish_reason,
    finished_at = coalesce(finished_at, now()),
    reward_granted_at = now()
  where id = p_match_id;

  for player_row in
    select *
    from public.match_players
    where public.match_players.match_id = p_match_id
  loop
    if p_winner_id is null then
      result_value := 'DRAW';
      reward_amount := p_draw_reward;
    elsif player_row.user_id = p_winner_id then
      result_value := 'WIN';
      reward_amount := p_winner_reward;
    else
      result_value := 'LOSS';
      reward_amount := p_loser_reward;
    end if;

    update public.match_players
    set
      result = result_value,
      coins_earned = reward_amount
    where id = player_row.id;

    update public.profiles
    set
      coins = coins + reward_amount,
      matches_played = matches_played + 1,
      wins = wins + case when result_value = 'WIN' then 1 else 0 end,
      losses = losses + case when result_value = 'LOSS' then 1 else 0 end
    where id = player_row.user_id;

    insert into public.currency_transactions (user_id, amount, reason, metadata)
    values (
      player_row.user_id,
      reward_amount,
      case
        when result_value = 'WIN' then 'MATCH_WIN'
        when result_value = 'DRAW' then 'MATCH_DRAW'
        else 'MATCH_LOSS'
      end,
      jsonb_build_object('matchId', p_match_id, 'finishReason', p_finish_reason)
    );
  end loop;

  match_id := p_match_id;
  rewards_granted := true;
  return next;
end;
$$;

revoke all on function public.finish_multiplayer_match(uuid, uuid, text, integer, integer, integer) from public;
revoke all on function public.finish_multiplayer_match(uuid, uuid, text, integer, integer, integer) from anon;
revoke all on function public.finish_multiplayer_match(uuid, uuid, text, integer, integer, integer) from authenticated;
grant execute on function public.finish_multiplayer_match(uuid, uuid, text, integer, integer, integer) to service_role;
