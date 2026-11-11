-- Nihongo Quest: keep the copies a progress row replaces (1.8.2, 2026-11-11). Run once in the Supabase SQL Editor.
-- On 2026-11-11 a device that could not read its own progress started over and its empty progress replaced a learner's whole
-- progress in the cloud, with no copy left. Since this: every change to a progress row (an update, an upsert, a delete) first files
-- the copy it replaces here. Kept per learner: the last 20, and for 60 days any copy a much smaller one replaced (half the size or
-- less: a loss like that one). No policies: only the dashboard (and the service role) reads it.
create table if not exists public.progress_history (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  state       jsonb not null,
  updated_at  timestamptz,
  device_id   text,
  replaced_at timestamptz not null default now(),
  replaced_by text,                      -- the device whose change replaced it ('deleted' when the row was deleted)
  shrunk      boolean not null default false
);
create index if not exists progress_history_user on public.progress_history (user_id, id desc);
alter table public.progress_history enable row level security;

create or replace function public.keep_progress_history()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  next_state jsonb := case when tg_op = 'DELETE' then null else new.state end;
begin
  if tg_op = 'DELETE' or old.state is distinct from new.state then
    insert into progress_history (user_id, state, updated_at, device_id, replaced_by, shrunk)
    values (old.user_id, old.state, old.updated_at, old.device_id,
            case when tg_op = 'DELETE' then 'deleted' else new.device_id end,
            next_state is null or length(next_state::text) * 2 <= length(old.state::text));
    delete from progress_history h
    where h.user_id = old.user_id
      and ((not h.shrunk and h.id not in (select x.id from progress_history x where x.user_id = old.user_id and not x.shrunk order by x.id desc limit 20))
        or (h.shrunk and h.replaced_at < now() - interval '60 days'));
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;

drop trigger if exists progress_keep_history on public.progress;
create trigger progress_keep_history before update or delete on public.progress
  for each row execute function public.keep_progress_history();

-- To put a learner's progress back (in the SQL Editor):
--   1. their copies, newest first (size shows where it fell):
--      select h.id, h.replaced_at, h.updated_at, h.device_id, h.replaced_by, h.shrunk, length(h.state::text) as size
--      from progress_history h join auth.users u on u.id = h.user_id where u.email = 'someone@example.com' order by h.id desc;
--   2. the copy to restore, by its id (updated_at moves on, so every device takes it at its next sync):
--      update progress set state = (select state from progress_history where id = 123), updated_at = now(), device_id = 'restored'
--      where user_id = (select user_id from progress_history where id = 123);
