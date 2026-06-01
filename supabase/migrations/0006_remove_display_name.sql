alter table public.profiles
drop column if exists display_name;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_username text;
  safe_username text;
begin
  requested_username := coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1), 'player');
  safe_username := regexp_replace(requested_username, '[^a-zA-Z0-9_]', '_', 'g');
  if char_length(safe_username) < 3 then
    safe_username := 'player_' || substr(new.id::text, 1, 8);
  end if;

  insert into public.profiles (id, username)
  values (
    new.id,
    lower(substr(safe_username, 1, 24))
  )
  on conflict (id) do nothing;

  return new;
end;
$$;
