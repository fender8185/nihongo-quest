-- Nihongo Quest: what breaks on a learner's device (1.14.0-test.3, 2026-11-12). Run once in the Supabase SQL Editor.
-- The app (js/30_report.js) sends an error nobody caught, a promise nobody handled, and the 現在沒辦法開始 screen here, with
-- its version, page and device, so a problem shows up without anyone having to tell us. Anyone may add a row, logged in or
-- not (the app works logged out too); nobody reads them but the dashboard. Rows go after 90 days, and after 500 in an hour
-- the rest of that hour is dropped, so a broken build or someone with the public key cannot fill the database.
create table if not exists public.app_errors (
  id        uuid primary key default gen_random_uuid(),
  at        timestamptz not null default now(),
  user_id   uuid default auth.uid() references auth.users(id) on delete cascade,   -- the learner logged in, if any
  device_id text,
  version   text,          -- APP_VERSION, with the test site's -test.N
  site      text,          -- nihongoquest.app or the test site
  place     text,          -- the page (#/today …)
  kind      text,          -- error | rejection | stop
  message   text,
  stack     text,
  agent     text,          -- the browser
  times     int not null default 1,   -- how often it happened on that page before it went up (after that it is not sent again)
  first_at  timestamptz    -- when it first happened (a report made offline goes up later)
);
create index if not exists app_errors_at on public.app_errors (at desc);
alter table public.app_errors enable row level security;
grant insert on public.app_errors to anon, authenticated;
drop policy if exists "anyone reports" on public.app_errors;
create policy "anyone reports" on public.app_errors for insert to anon, authenticated
  with check ((user_id is null or user_id = auth.uid())
    and length(coalesce(message, '')) <= 1000 and length(coalesce(stack, '')) <= 4000 and length(coalesce(agent, '')) <= 400
    and length(coalesce(device_id, '') || coalesce(version, '') || coalesce(site, '') || coalesce(place, '') || coalesce(kind, '')) <= 400
    and times between 1 and 10000);

create or replace function public.app_errors_keep_small()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from app_errors where at > now() - interval '1 hour') >= 500 then return null; end if;
  delete from app_errors where at < now() - interval '90 days';
  return new;
end $$;

drop trigger if exists app_errors_keep_small on public.app_errors;
create trigger app_errors_keep_small before insert on public.app_errors
  for each row execute function public.app_errors_keep_small();
