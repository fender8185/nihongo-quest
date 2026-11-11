-- Nihongo Quest: the cloud refuses to shrink a learner's progress (1.9.1, 2026-11-11). Run once in the Supabase SQL Editor.
-- On 2026-11-11 a device that could not read its own progress started over and sent the empty one up over a whole progress.
-- The app no longer does that (1.8.2), but an older copy of the app on some phone still could, until that phone updates: so the
-- database itself refuses any change that would leave a progress with fewer than half of its learning records (when it had 10 or
-- more). 重設所有進度 gets through: it marks the state with a new resetAt. The app then merges the two copies record by record
-- and sends the merge (1.9.1), so a refused change costs nothing. Runs before progress-history.sql's trigger (names in order), so a
-- refused change files no copy.
create or replace function public.progress_records(s jsonb)
returns int language sql immutable as $$
  select case when s ? 'nqz' then coalesce((s->>'n')::int, 0)   -- a packed state carries its count outside the gzip
              when jsonb_typeof(s->'srs') = 'object' then (select count(*)::int from jsonb_object_keys(s->'srs'))
              else 0 end
$$;

create or replace function public.guard_progress_shrink()
returns trigger language plpgsql as $$
declare
  was int := public.progress_records(old.state);
  now_n int := public.progress_records(new.state);
  reset boolean := coalesce(new.state->>'resetAt', '') <> '' and (new.state->>'resetAt') is distinct from (old.state->>'resetAt');
begin
  if was >= 10 and now_n * 2 < was and not reset then
    raise exception 'refused: this would replace % learning records with %', was, now_n
      using errcode = 'check_violation', hint = 'progress shrink';
  end if;
  return new;
end $$;

drop trigger if exists progress_guard on public.progress;
create trigger progress_guard before update on public.progress
  for each row execute function public.guard_progress_shrink();
