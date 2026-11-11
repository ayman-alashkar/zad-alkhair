-- ملخص واحد لكل الإحصاءات: select * from private.usage_summary;
-- كل صف مقياس، والأعمدة: اليوم، وآخر ٧ أيام، وآخر ٣٠ يومًا (بتوقيت مكة).
-- النسب من أجهزة المدة نفسها. نسب العودة تبقى في private.usage_retention.

create or replace view private.usage_summary as
with t as (select (now() at time zone 'Asia/Riyadh')::date as d),
p(k, since) as (
  select 1, d from t union all select 2, d - 6 from t union all select 3, d - 29 from t
),
firsts as (select device_id, min(day) as first_day from public.usage_daily group by device_id),
rows as (
  select p.k, p.since, u.*, f.first_day
  from p
  join public.usage_daily u on u.day between p.since and (select d from t)
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

revoke all on private.usage_summary from public, anon, authenticated;
