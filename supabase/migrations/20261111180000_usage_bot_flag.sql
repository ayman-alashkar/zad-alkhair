-- المتصفحات الآلية تُعلَّم ولا تُسقط: يرسل الموقع سبب التعليم (webdriver أو كلمة من userAgent)،
-- وتقرأ الاستعلامات كلها من private.usage_human التي تستبعد الصفوف المعلَّمة.
-- هكذا يظهر في الجدول أي جهاز حقيقي أخطأ الفحص في تعليمه، بدل أن يختفي بصمت.

alter table public.usage_daily add column if not exists bot text;

drop function if exists public.record_usage(uuid,date,text,boolean,jsonb,text);

create or replace function public.record_usage(
  p_device uuid,
  p_day date,
  p_platform text,
  p_installed boolean,
  p_counts jsonb,
  p_tz text default null,
  p_bot text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := (now() at time zone 'Asia/Riyadh')::date;
  v_platform text;
  v_tz text;
  v_bot text := nullif(left(coalesce(p_bot, ''), 32), '');
  c jsonb := coalesce(p_counts, '{}'::jsonb);
begin
  if p_device is null or p_day is null then
    raise exception 'device and day required';
  end if;
  -- الجهاز يحفظ أرقام الأسبوع الأخير فقط؛ ويوم واحد للأمام يغطي اختلاف ساعة الجهاز.
  if p_day < v_today - 7 or p_day > v_today + 1 then
    raise exception 'day out of range';
  end if;
  if jsonb_typeof(c) <> 'object' then
    raise exception 'counts must be an object';
  end if;

  v_platform := case when p_platform in ('android','ios','desktop','other') then p_platform else 'other' end;
  -- اسم منطقة بصيغة IANA فقط (Asia/Damascus، America/Argentina/Buenos_Aires، UTC)؛ غيره يُهمل.
  v_tz := case when p_tz ~ '^[A-Za-z_]+(/[A-Za-z0-9_+-]+){0,2}$' and length(p_tz) <= 64 then p_tz end;

  -- كل رقم يُقص إلى حد معقول في الطلب الواحد وفي اليوم كله، فلا تدخل أرقام خيالية.
  insert into public.usage_daily as u (
    device_id, day, platform, installed, tz, bot,
    home, prayer, khatmahs, adhkar, quran, reader, listen,
    listen_seconds, tayassar_seconds
  ) values (
    p_device, p_day, v_platform, coalesce(p_installed, false), v_tz, v_bot,
    least(greatest(coalesce((c->>'home')::numeric, 0), 0), 500)::int,
    least(greatest(coalesce((c->>'prayer')::numeric, 0), 0), 500)::int,
    least(greatest(coalesce((c->>'khatmahs')::numeric, 0), 0), 500)::int,
    least(greatest(coalesce((c->>'adhkar')::numeric, 0), 0), 500)::int,
    least(greatest(coalesce((c->>'quran')::numeric, 0), 0), 500)::int,
    least(greatest(coalesce((c->>'reader')::numeric, 0), 0), 500)::int,
    least(greatest(coalesce((c->>'listen')::numeric, 0), 0), 500)::int,
    least(greatest(coalesce((c->>'listen_seconds')::numeric, 0), 0), 86400)::int,
    least(greatest(coalesce((c->>'tayassar_seconds')::numeric, 0), 0), 86400)::int
  )
  on conflict (device_id, day) do update set
    platform = excluded.platform,
    installed = u.installed or excluded.installed,
    tz = coalesce(excluded.tz, u.tz),
    bot = coalesce(excluded.bot, u.bot),
    home = least(u.home + excluded.home, 500),
    prayer = least(u.prayer + excluded.prayer, 500),
    khatmahs = least(u.khatmahs + excluded.khatmahs, 500),
    adhkar = least(u.adhkar + excluded.adhkar, 500),
    quran = least(u.quran + excluded.quran, 500),
    reader = least(u.reader + excluded.reader, 500),
    listen = least(u.listen + excluded.listen, 500),
    listen_seconds = least(u.listen_seconds + excluded.listen_seconds, 86400),
    tayassar_seconds = least(u.tayassar_seconds + excluded.tayassar_seconds, 86400),
    updated_at = now();
end;
$$;

revoke all on function public.record_usage(uuid,date,text,boolean,jsonb,text,text) from public;
grant execute on function public.record_usage(uuid,date,text,boolean,jsonb,text,text) to anon, authenticated;

create or replace view private.usage_human as
select * from public.usage_daily where bot is null;
revoke all on private.usage_human from public, anon, authenticated;

create or replace view private.usage_active as
with days as (
  select generate_series(min(day), (now() at time zone 'Asia/Riyadh')::date, interval '1 day')::date as day
  from private.usage_human
)
select
  d.day as "اليوم",
  (select count(*) from private.usage_human u where u.day = d.day) as "نشطون",
  (select count(*) from private.usage_human u where u.day = d.day and u.installed) as "منهم مثبّت",
  (select count(distinct u.device_id) from private.usage_human u where u.day between d.day - 6 and d.day) as "نشطون في ٧ أيام"
from days d
order by d.day desc;

create or replace view private.usage_retention as
with firsts as (
  select device_id, min(day) as first_day from private.usage_human group by device_id
), marks as (
  select f.device_id, f.first_day,
    bool_or(u.day between f.first_day + 7 and f.first_day + 13) as week2,
    bool_or(u.day >= f.first_day + 30) as day30
  from firsts f join private.usage_human u using (device_id)
  group by f.device_id, f.first_day
), today as (select (now() at time zone 'Asia/Riyadh')::date as d)
select
  date_trunc('week', m.first_day)::date as "أسبوع أول ظهور",
  count(*) as "أجهزة جديدة",
  case when max(m.first_day) + 13 < (select d from today)
    then round(100.0 * count(*) filter (where m.week2) / count(*), 1) end as "% عادت في الأسبوع الثاني",
  case when max(m.first_day) + 30 < (select d from today)
    then round(100.0 * count(*) filter (where m.day30) / count(*), 1) end as "% عادت بعد ٣٠ يومًا"
from marks m
group by 1
order by 1 desc;

create or replace view private.usage_reach as
select
  day as "اليوم",
  count(*) as "نشطون",
  round(100.0 * count(*) filter (where home > 0) / count(*), 1) as "% الرئيسية",
  round(100.0 * count(*) filter (where quran > 0) / count(*), 1) as "% فهرس القرآن",
  round(100.0 * count(*) filter (where reader > 0) / count(*), 1) as "% المصحف",
  round(100.0 * count(*) filter (where listen > 0) / count(*), 1) as "% مشغّل التلاوة",
  round(100.0 * count(*) filter (where khatmahs > 0) / count(*), 1) as "% الختمات",
  round(100.0 * count(*) filter (where prayer > 0) / count(*), 1) as "% المواقيت",
  round(100.0 * count(*) filter (where adhkar > 0) / count(*), 1) as "% الأذكار"
from private.usage_human
group by day
order by day desc;

create or replace view private.usage_listening as
select
  day as "اليوم",
  count(*) filter (where listen_seconds > 0) as "مستمعون",
  round(sum(listen_seconds) / 60.0) as "دقائق الاستماع",
  round(sum(listen_seconds) / 60.0 / nullif(count(*) filter (where listen_seconds > 0), 0), 1) as "متوسط الدقائق لكل مستمع",
  round(100.0 * sum(tayassar_seconds) / nullif(sum(listen_seconds), 0), 1) as "% ما تيسّر من الاستماع"
from private.usage_human
group by day
order by day desc;

create or replace view private.usage_countries as
with today as (select (now() at time zone 'Asia/Riyadh')::date as d),
latest as (
  select distinct on (device_id) device_id, coalesce(tz, 'غير معروفة') as tz, day
  from private.usage_human, today
  where day > today.d - 30
  order by device_id, day desc
)
select
  tz as "المنطقة الزمنية",
  count(*) filter (where day > (select d from today) - 7) as "أجهزة في ٧ أيام",
  count(*) as "أجهزة في ٣٠ يومًا"
from latest
group by tz
order by 3 desc, 2 desc, 1;

create or replace view private.usage_summary as
with t as (select (now() at time zone 'Asia/Riyadh')::date as d),
p(k, since) as (
  select 1, d from t union all select 2, d - 6 from t union all select 3, d - 29 from t
),
firsts as (select device_id, min(day) as first_day from private.usage_human group by device_id),
rows as (
  select p.k, p.since, u.*, f.first_day
  from p
  join private.usage_human u on u.day between p.since and (select d from t)
  join firsts f on f.device_id = u.device_id
),
agg as (
  select p.k,
    count(distinct r.device_id) as active,
    count(distinct r.device_id) filter (where r.installed) as installed,
    count(distinct r.device_id) filter (where r.first_day >= p.since) as fresh,
    count(distinct r.device_id) filter (where r.home > 0) as home,
    count(distinct r.device_id) filter (where r.quran > 0) as quran,
    count(distinct r.device_id) filter (where r.reader > 0) as reader,
    count(distinct r.device_id) filter (where r.listen > 0) as listen,
    count(distinct r.device_id) filter (where r.khatmahs > 0) as khatmahs,
    count(distinct r.device_id) filter (where r.prayer > 0) as prayer,
    count(distinct r.device_id) filter (where r.adhkar > 0) as adhkar,
    count(distinct r.device_id) filter (where r.listen_seconds > 0) as listeners,
    coalesce(sum(r.listen_seconds), 0) as secs,
    coalesce(sum(r.tayassar_seconds), 0) as tsecs
  from p left join rows r on r.k = p.k
  group by p.k
),
regions as (
  select k, string_agg(tz || ' ' || n, '، ' order by n desc, tz) as list
  from (
    select k, coalesce(tz, 'غير معروفة') as tz, count(distinct device_id) as n
    from rows group by k, coalesce(tz, 'غير معروفة')
  ) x
  group by k
),
metrics as (
  select a.k, m.n, m.name, m.v
  from agg a
  left join regions g on g.k = a.k
  cross join lateral (values
    (1,  'أجهزة نشطة', a.active::text),
    (2,  'منها مثبّت', a.installed::text),
    (3,  'منها جديدة', a.fresh::text),
    (4,  '% فتحت الرئيسية', round(100.0 * a.home / nullif(a.active, 0))::text),
    (5,  '% فتحت فهرس القرآن', round(100.0 * a.quran / nullif(a.active, 0))::text),
    (6,  '% فتحت المصحف', round(100.0 * a.reader / nullif(a.active, 0))::text),
    (7,  '% فتحت مشغّل التلاوة', round(100.0 * a.listen / nullif(a.active, 0))::text),
    (8,  '% فتحت الختمات', round(100.0 * a.khatmahs / nullif(a.active, 0))::text),
    (9,  '% فتحت المواقيت', round(100.0 * a.prayer / nullif(a.active, 0))::text),
    (10, '% فتحت الأذكار', round(100.0 * a.adhkar / nullif(a.active, 0))::text),
    (11, 'مستمعون', a.listeners::text),
    (12, 'دقائق الاستماع', round(a.secs / 60.0)::text),
    (13, 'متوسط دقائق المستمع', round(a.secs / 60.0 / nullif(a.listeners, 0), 1)::text),
    (14, '% ما تيسّر من الاستماع', round(100.0 * a.tsecs / nullif(a.secs, 0))::text),
    (15, 'المناطق الزمنية', g.list)
  ) as m(n, name, v)
)
select
  name as "المقياس",
  max(v) filter (where k = 1) as "اليوم",
  max(v) filter (where k = 2) as "آخر ٧ أيام",
  max(v) filter (where k = 3) as "آخر ٣٠ يومًا"
from metrics
group by n, name
order by n;

