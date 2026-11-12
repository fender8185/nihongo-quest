-- Nihongo Quest: looking up the learners (2026-11-12). Paste one into the Supabase SQL Editor and run it; nothing here changes
-- anything. Only learners who log in have a progress row here: one who never did keeps theirs on their own device (a letter to
-- them goes by what their progress holds — mail.sql's who, e.g. {"owns": …}).
-- Since 1.14.0-test.2 (2026-11-12) progress goes up packed: state is {"nqz": 1, "gz": …, "n", "resetAt", "day", "owned"}, the
-- gzip unreadable here, so these read n (things learned), day (the last day practised) and owned outside it, or the plain
-- fields of a row not packed yet.

-- everyone, newest account first: when they joined, the last day they practised, how many things they have learned
select u.email, u.created_at::date as joined,
       coalesce(nullif(p.state->>'day', ''), (select max(k) from jsonb_object_keys(p.state->'dailyLogs') k)) as last_day,
       coalesce((p.state->>'n')::int, (select count(*)::int from jsonb_object_keys(p.state->'srs'))) as learned
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

-- what broke in the last 14 days (supabase/app-errors.sql): the same message together, newest first
select left(message, 120) as message, kind, count(*) as reports, sum(times) as times, count(distinct device_id) as devices,
       max(at) as last, min(version) as first_version, max(version) as last_version, (array_agg(place order by at desc))[1] as place
from public.app_errors where at > now() - interval '14 days'
group by left(message, 120), kind order by last desc;

-- the latest reports in full (who, where, the stack)
select e.at, e.version, e.site, e.place, e.kind, e.times, e.message, e.stack, e.agent, u.email
from public.app_errors e left join auth.users u on u.id = e.user_id
order by e.at desc limit 30;
