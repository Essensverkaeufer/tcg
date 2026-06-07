create table if not exists public.story_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  encounter_slug text not null,
  status text not null default 'ATTEMPTED' check (status in ('ATTEMPTED', 'COMPLETED')),
  wins integer not null default 0 check (wins >= 0),
  losses integer not null default 0 check (losses >= 0),
  best_turns integer check (best_turns is null or best_turns > 0),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, encounter_slug)
);

create index if not exists story_progress_user_status_idx
on public.story_progress(user_id, status);

alter table public.story_progress enable row level security;

drop policy if exists "players read own story progress" on public.story_progress;
create policy "players read own story progress"
on public.story_progress for select
using (auth.uid() = user_id);

drop trigger if exists story_progress_set_updated_at on public.story_progress;
create trigger story_progress_set_updated_at
before update on public.story_progress
for each row execute function public.set_updated_at();
