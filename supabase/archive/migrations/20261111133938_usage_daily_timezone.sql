-- المنطقة الزمنية للجهاز (مثل Asia/Damascus) دلالةً على البلد، دون عنوان IP.
-- p_tz اختياري، فتبقى نسخ التطبيق المحفوظة التي لا ترسله تعمل كما هي.

alter table public.usage_daily add column if not exists tz text;

drop function if exists public.record_usage(uuid,date,text,boolean,jsonb);

create or replace function public.record_usage(
  p_device uuid,
  p_day date,
  p_platform text,
  p_installed boolean,
  p_counts jsonb,
  p_tz text default null
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
    device_id, day, platform, installed, tz,
    home, prayer, khatmahs, adhkar, quran, reader, listen,
    listen_seconds, tayassar_seconds
  ) values (
    p_device, p_day, v_platform, coalesce(p_installed, false), v_tz,
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

revoke all on function public.record_usage(uuid,date,text,boolean,jsonb,text) from public;
grant execute on function public.record_usage(uuid,date,text,boolean,jsonb,text) to anon, authenticated;

-- ٥. البلدان تقريبًا: الأجهزة حسب منطقتها الزمنية (آخر منطقة أرسلها الجهاز في المدة).
create or replace view private.usage_countries as
with today as (select (now() at time zone 'Asia/Riyadh')::date as d),
latest as (
  select distinct on (device_id) device_id, coalesce(tz, 'غير معروفة') as tz, day
  from public.usage_daily, today
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

revoke all on private.usage_countries from public, anon, authenticated;
