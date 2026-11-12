-- Nihongo Quest: looking up the learners (2026-11-12). Paste one into the Supabase SQL Editor and run it; nothing here changes
-- anything. Only learners who log in have a progress row here: one who never did keeps theirs on their own device (a letter to
-- them goes by what their progress holds — mail.sql's who, e.g. {"owns": …}).
-- (Should progress ever be stored packed — sync-packing-plan, step 2 — state becomes {"nqz": 1, "gz": …} and these read only
-- the rows not yet packed.)

-- everyone, newest account first: when they joined, the last day they practised, how many things they have learned
select u.email, u.created_at::date as joined,
       (select max(k) from jsonb_object_keys(p.state->'dailyLogs') k) as last_day,
       (select count(*) from jsonb_object_keys(p.state->'srs')) as learned
from auth.users u left join public.progress p on p.user_id = u.id
order by u.created_at desc;

-- who has a ware (change 'obake' to its id), and whether it was bought or given (gift: the letter's id)
select u.email, p.state->'owned'->'obake' as how
from public.progress p join auth.users u on u.id = p.user_id
where p.state->'owned' ? 'obake';

-- who took a letter's gift (change the letter's id)
select u.email, t.taken_at
from public.mail_taken t join auth.users u on u.id = t.user_id
where t.mail_id = 'halloween-2026-record'
order by t.taken_at;

-- the letters there are now
select id, title, sender, gift, who, starts_at, ends_at from public.mail order by created_at desc;
