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
