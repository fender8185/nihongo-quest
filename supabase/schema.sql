-- Nihongo Quest: one row of progress per user. Run once in the Supabase SQL Editor.
create table if not exists public.progress (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  state      jsonb not null,
  updated_at timestamptz not null,
  device_id  text,
  saved_at   timestamptz not null default now()
);

alter table public.progress enable row level security;

drop policy if exists "own row" on public.progress;
create policy "own row" on public.progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- AI on the owner's Gemini key (supabase/functions/ai): one row per learner and Pacific day.
-- No policies: only ai_take() below reads or writes it.
create table if not exists public.ai_usage (
  day     date not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  n       int  not null default 0,
  primary key (day, user_id)
);

alter table public.ai_usage enable row level security;

-- Counts one AI question for the caller unless today's cap is reached; also returns the day's total,
-- which the function uses to move from the main model to the spare one. Change the cap here and run it again.
create or replace function public.ai_take()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  cap constant int := 50;   -- AI questions per learner per day
  d date := (now() at time zone 'America/Los_Angeles')::date;   -- Gemini's daily quota resets at Pacific midnight
  mine int;
begin
  if auth.uid() is null then raise exception 'login required' using errcode = '42501'; end if;
  insert into ai_usage as u (day, user_id, n) values (d, auth.uid(), 1)
    on conflict (day, user_id) do update set n = u.n + 1 where u.n < cap
    returning u.n into mine;
  return jsonb_build_object('ok', mine is not null, 'mine', coalesce(mine, cap), 'cap', cap,
    'total', (select coalesce(sum(n), 0) from ai_usage where day = d));
end $$;

revoke all on function public.ai_take() from public, anon;
grant execute on function public.ai_take() to authenticated;
