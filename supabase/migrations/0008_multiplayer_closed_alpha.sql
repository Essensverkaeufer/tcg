create extension if not exists pgcrypto;

alter table public.currency_transactions
  drop constraint if exists currency_transactions_reason_check;

alter table public.currency_transactions
  add constraint currency_transactions_reason_check
  check (reason in ('DAILY_LOGIN', 'MATCH_WIN', 'MATCH_LOSS', 'MATCH_DRAW', 'PACK_PURCHASE', 'ADMIN_GRANT'));

create table if not exists public.matchmaking_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  deck_id uuid not null references public.decks(id) on delete cascade,
  status text not null default 'QUEUED' check (status in ('QUEUED', 'MATCHED', 'CANCELLED', 'EXPIRED')),
  region text not null default 'local',
  server_id text,
  matched_match_id uuid,
  created_at timestamptz not null default now(),
  heartbeat_at timestamptz not null default now(),
  matched_at timestamptz
);

create unique index if not exists matchmaking_one_active_ticket_idx
on public.matchmaking_tickets(user_id)
where status = 'QUEUED';

create index if not exists matchmaking_queue_idx
on public.matchmaking_tickets(status, region, heartbeat_at);

alter table public.matches
  add column if not exists server_id text,
  add column if not exists current_turn integer not null default 1,
  add column if not exists active_player_id uuid references auth.users(id),
  add column if not exists state_snapshot jsonb,
  add column if not exists finish_reason text,
  add column if not exists reward_granted_at timestamptz;

create index if not exists matches_status_idx on public.matches(status, created_at);
create index if not exists matches_server_idx on public.matches(server_id, status);

alter table public.match_players
  add column if not exists connection_state text not null default 'OFFLINE'
    check (connection_state in ('ONLINE', 'OFFLINE', 'DISCONNECTED')),
  add column if not exists deck_snapshot jsonb,
  add column if not exists disconnected_at timestamptz;

alter table public.match_action_logs
  add column if not exists action_seq integer,
  add column if not exists client_action_id text,
  add column if not exists resolved_state_hash text;

create index if not exists match_logs_order_idx
on public.match_action_logs(match_id, action_seq, created_at);

create table if not exists public.match_events (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  event_type text not null,
  message text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists match_events_match_idx
on public.match_events(match_id, created_at);

alter table public.matchmaking_tickets enable row level security;
alter table public.match_events enable row level security;

drop policy if exists "players read own matchmaking tickets" on public.matchmaking_tickets;
create policy "players read own matchmaking tickets"
on public.matchmaking_tickets for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "players read events for own matches" on public.match_events;
create policy "players read events for own matches"
on public.match_events for select
to authenticated
using (exists (
  select 1
  from public.match_players
  where match_players.match_id = match_events.match_id
    and match_players.user_id = auth.uid()
));

create or replace function public.finish_multiplayer_match(
  p_match_id uuid,
  p_winner_id uuid,
  p_finish_reason text,
  p_winner_reward integer default 100,
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
