-- Nihongo Quest: letters sent from the dashboard (1.12.2, 2026-11-12). Run once in the Supabase SQL Editor.
-- A row of public.mail is a letter in everyone's mailbox it is meant for: add a row (Table Editor › mail › Insert row) and it
-- is sent, no new version of the app needed; delete it and it is taken back. The app reads the rows when it opens and when it
-- comes back, and each device decides from its own progress whether a letter is for it (who), so a learner who never logged
-- in gets them too. A letter's gift is taken once for the progress; a learner logged in also leaves a row in mail_taken.
create table if not exists public.mail (
  id         text primary key,                        -- never reuse one: a device keeps what it got under this id
  title      text not null,
  body       text not null,                           -- plain text; a blank line between paragraphs; one starting with —— is the signature
  sender     text,                                    -- whose face is on it: anyone of the town (mugi, koharu, nagisa, kenta …) or fuku; empty: Nihongo Quest
  gift       jsonb,                                   -- {"koto": 10} 言靈, or {"ware": "obake"} a ware of 古道具屋 (its id); empty: none
  who        jsonb not null default '{"everyone": true}',
  starts_at  timestamptz not null default now(),      -- not before it
  ends_at    timestamptz,                             -- not after it (empty: no end); a letter got before stays
  created_at timestamptz not null default now()
);
-- who, all of an object's rules holding (a rule the app does not know yet: not for it):
--   {"everyone": true}
--   {"accountBefore": "2026-11-11T23:59:59+08:00"}     logged in, the account made before that moment
--   {"practicedBy": "2026-11-11"}                       a day of practice on or before that day ({"practicedSince": …} on or after)
--   {"practicedIn": ["2026-10-21", "2026-11-10"]}       a day of practice in between
--   {"owns": "obake"} / {"lacks": "obake"}              has (or has not) that ware — e.g. to make up for one that went wrong
--   {"users": ["<account id>", …]}                      those accounts only (their ids: Authentication › Users)
--   {"some": [rule, …]}  any of them    {"every": [rule, …]}  all of them

alter table public.mail enable row level security;
drop policy if exists "anyone reads" on public.mail;
create policy "anyone reads" on public.mail for select using (true);   -- written from the dashboard only

-- who took which letter's gift (learners logged in): looked up from the dashboard, never by the app
create table if not exists public.mail_taken (
  user_id  uuid not null references auth.users(id) on delete cascade,
  mail_id  text not null,
  taken_at timestamptz not null default now(),
  primary key (user_id, mail_id)
);
alter table public.mail_taken enable row level security;
drop policy if exists "own taking" on public.mail_taken;
create policy "own taking" on public.mail_taken for insert with check (auth.uid() = user_id);

-- the first letter (the user, 2026-11-12): ムギ's Halloween record for everyone here by the end of 11/11 — an account made by then,
-- or a day of practice by then
insert into public.mail (id, title, body, sender, gift, who) values (
  'halloween-2026-record',
  '萬聖節的唱片',
  E'ワン！萬聖節那幾天，鎮上好熱鬧，你也在吧？\n\n新的唱片〈おばけの夜〉到了，有點可怕又有點可愛。第一張先送給你，放到書房的留聲機上聽聽看。\n\n——海邊的ムギ',
  'mugi',
  '{"ware": "obake"}',
  '{"some": [{"accountBefore": "2026-11-11T23:59:59+08:00"}, {"practicedBy": "2026-11-11"}]}'
) on conflict (id) do nothing;
