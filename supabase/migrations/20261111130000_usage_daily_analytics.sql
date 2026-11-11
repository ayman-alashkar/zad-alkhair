-- إحصاءات الاستعمال المجهولة: صف لكل جهاز في كل يوم (بتوقيت مكة).
-- يكتب فيه الموقع عبر record_usage فقط؛ لا يقرؤه أحد من خارج قاعدة البيانات.
-- القراءة من محرر SQL عبر الاستعلامات الجاهزة في المخطط private (آخر الملف).

create table if not exists public.usage_daily (
  device_id uuid not null,
  day date not null,
  platform text not null default 'other' check (platform in ('android','ios','desktop','other')),
  installed boolean not null default false,
  home int not null default 0,
  prayer int not null default 0,
  khatmahs int not null default 0,
  adhkar int not null default 0,
  quran int not null default 0,
  reader int not null default 0,
  listen int not null default 0,
  listen_seconds int not null default 0,
  tayassar_seconds int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (device_id, day)
);

alter table public.usage_daily enable row level security;
revoke all on table public.usage_daily from public, anon, authenticated;

create index if not exists usage_daily_day_idx on public.usage_daily (day);

create or replace function public.record_usage(
  p_device uuid,
  p_day date,
  p_platform text,
  p_installed boolean,
  p_counts jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := (now() at time zone 'Asia/Riyadh')::date;
  v_platform text;
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

  -- كل رقم يُقص إلى حد معقول في الطلب الواحد وفي اليوم كله، فلا تدخل أرقام خيالية.
  insert into public.usage_daily as u (
    device_id, day, platform, installed,
    home, prayer, khatmahs, adhkar, quran, reader, listen,
    listen_seconds, tayassar_seconds
  ) values (
    p_device, p_day, v_platform, coalesce(p_installed, false),
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

revoke all on function public.record_usage(uuid,date,text,boolean,jsonb) from public;
grant execute on function public.record_usage(uuid,date,text,boolean,jsonb) to anon, authenticated;

-- ═══════════ الاستعلامات الجاهزة (للقراءة من محرر SQL) ═══════════
-- مثال: select * from private.usage_active;

-- ١. النشطون: الأجهزة المختلفة في كل يوم، وفي الأيام السبعة المنتهية به.
create or replace view private.usage_active as
with days as (
  select generate_series(min(day), (now() at time zone 'Asia/Riyadh')::date, interval '1 day')::date as day
  from public.usage_daily
)
select
  d.day as "اليوم",
  (select count(*) from public.usage_daily u where u.day = d.day) as "نشطون",
  (select count(*) from public.usage_daily u where u.day = d.day and u.installed) as "منهم مثبّت",
  (select count(distinct u.device_id) from public.usage_daily u where u.day between d.day - 6 and d.day) as "نشطون في ٧ أيام"
from days d
order by d.day desc;

-- ٢. العودة: الأجهزة حسب أسبوع ظهورها الأول، ونسبة من عاد منها.
--    «الأسبوع الثاني» = أي نشاط بين اليوم ٧ واليوم ١٣ بعد أول ظهور.
--    «بعد ٣٠ يومًا» = أي نشاط في اليوم ٣٠ أو بعده.
--    تبقى النسبة فارغة ما دام الوقت لم يمرّ بعد على كل أجهزة الأسبوع.
create or replace view private.usage_retention as
with firsts as (
  select device_id, min(day) as first_day from public.usage_daily group by device_id
), marks as (
  select f.device_id, f.first_day,
    bool_or(u.day between f.first_day + 7 and f.first_day + 13) as week2,
    bool_or(u.day >= f.first_day + 30) as day30
  from firsts f join public.usage_daily u using (device_id)
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

-- ٣. الانتشار: من أجهزة اليوم، كم في المئة فتح كل قسم.
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
from public.usage_daily
group by day
order by day desc;

-- ٤. الاستماع: الدقائق في كل يوم، ومتوسطها لكل من استمع، ونسبة «ما تيسّر» منها.
create or replace view private.usage_listening as
select
  day as "اليوم",
  count(*) filter (where listen_seconds > 0) as "مستمعون",
  round(sum(listen_seconds) / 60.0) as "دقائق الاستماع",
  round(sum(listen_seconds) / 60.0 / nullif(count(*) filter (where listen_seconds > 0), 0), 1) as "متوسط الدقائق لكل مستمع",
  round(100.0 * sum(tayassar_seconds) / nullif(sum(listen_seconds), 0), 1) as "% ما تيسّر من الاستماع"
from public.usage_daily
group by day
order by day desc;

revoke all on private.usage_active, private.usage_retention, private.usage_reach, private.usage_listening
  from public, anon, authenticated;
