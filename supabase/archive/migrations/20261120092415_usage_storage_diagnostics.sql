-- تشخيص ضياع تخزين الموقع على الأجهزة (نوفمبر ٢٠٢٦): ظهرت شاشة «You're offline» في التطبيق
-- المثبّت وأُعيد تنزيل ملفات المصحف، وعامل الخدمة لا يمسح شيئًا من ذلك. هذه الأعمدة تبيّن
-- هل يمنح المتصفح الموقع تخزينًا دائمًا، وكم مرة يُفتح التطبيق المثبّت على تخزين ممسوح.
--   persisted     آخر ما أجاب به navigator.storage.persisted() في ذلك اليوم (فارغ إن لم يُعرف).
--   storage_reset مرات فتح التطبيق المثبّت على أندرويد دون معرّفه المحفوظ، أي بعد مسح تخزين الموقع كله.
--   pack_fresh    مرات بدء تنزيل حزمة المصحف من الصفر (لا استكمال ملفات ناقصة).

alter table public.usage_daily add column if not exists persisted boolean;
alter table public.usage_daily add column if not exists storage_reset integer not null default 0;
alter table public.usage_daily add column if not exists pack_fresh integer not null default 0;

drop function if exists public.record_usage(uuid,date,text,boolean,jsonb,text,text);

create or replace function public.record_usage(
  p_device uuid,
  p_day date,
  p_platform text,
  p_installed boolean,
  p_counts jsonb,
  p_tz text default null,
  p_bot text default null,
  p_persisted boolean default null
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
    device_id, day, platform, installed, tz, bot, persisted,
    home, prayer, khatmahs, adhkar, quran, reader, listen,
    listen_seconds, tayassar_seconds, storage_reset, pack_fresh
  ) values (
    p_device, p_day, v_platform, coalesce(p_installed, false), v_tz, v_bot, p_persisted,
    least(greatest(coalesce((c->>'home')::numeric, 0), 0), 500)::int,
    least(greatest(coalesce((c->>'prayer')::numeric, 0), 0), 500)::int,
    least(greatest(coalesce((c->>'khatmahs')::numeric, 0), 0), 500)::int,
    least(greatest(coalesce((c->>'adhkar')::numeric, 0), 0), 500)::int,
    least(greatest(coalesce((c->>'quran')::numeric, 0), 0), 500)::int,
    least(greatest(coalesce((c->>'reader')::numeric, 0), 0), 500)::int,
    least(greatest(coalesce((c->>'listen')::numeric, 0), 0), 500)::int,
    least(greatest(coalesce((c->>'listen_seconds')::numeric, 0), 0), 86400)::int,
    least(greatest(coalesce((c->>'tayassar_seconds')::numeric, 0), 0), 86400)::int,
    least(greatest(coalesce((c->>'storage_reset')::numeric, 0), 0), 20)::int,
    least(greatest(coalesce((c->>'pack_fresh')::numeric, 0), 0), 20)::int
  )
  on conflict (device_id, day) do update set
    platform = excluded.platform,
    installed = u.installed or excluded.installed,
    tz = coalesce(excluded.tz, u.tz),
    bot = coalesce(excluded.bot, u.bot),
    persisted = coalesce(excluded.persisted, u.persisted),
    home = least(u.home + excluded.home, 500),
    prayer = least(u.prayer + excluded.prayer, 500),
    khatmahs = least(u.khatmahs + excluded.khatmahs, 500),
    adhkar = least(u.adhkar + excluded.adhkar, 500),
    quran = least(u.quran + excluded.quran, 500),
    reader = least(u.reader + excluded.reader, 500),
    listen = least(u.listen + excluded.listen, 500),
    listen_seconds = least(u.listen_seconds + excluded.listen_seconds, 86400),
    tayassar_seconds = least(u.tayassar_seconds + excluded.tayassar_seconds, 86400),
    storage_reset = least(u.storage_reset + excluded.storage_reset, 20),
    pack_fresh = least(u.pack_fresh + excluded.pack_fresh, 20),
    updated_at = now();
end;
$$;

revoke all on function public.record_usage(uuid,date,text,boolean,jsonb,text,text,boolean) from public;
grant execute on function public.record_usage(uuid,date,text,boolean,jsonb,text,text,boolean) to anon, authenticated;

-- الأعمدة الجديدة تُضاف إلى آخر private.usage_human، والشرط كما في usage_exclude_crawler.
create or replace view private.usage_human as
select * from public.usage_daily
where bot is null
  and not (
    tz = 'America/Los_Angeles'
    and not installed
    and home + prayer + khatmahs + adhkar + quran + reader + listen <= 1
  );
revoke all on private.usage_human from public, anon, authenticated;

-- لكل يوم: كم جهاز أندرويد مثبّت حصل على التخزين الدائم، وكم مرة وُجد التخزين ممسوحًا،
-- وكم تنزيلًا للمصحف بدأ من الصفر.
create or replace view private.usage_storage as
select
  day as "اليوم",
  count(*) filter (where platform = 'android' and installed) as "أندرويد مثبّت",
  count(*) filter (where platform = 'android' and installed and persisted) as "منها بتخزين دائم",
  count(*) filter (where platform = 'android' and installed and persisted = false) as "منها دون تخزين دائم",
  coalesce(sum(storage_reset), 0) as "فتح على تخزين ممسوح",
  coalesce(sum(pack_fresh), 0) as "تنزيل المصحف من الصفر"
from private.usage_human
group by day
order by day desc;
revoke all on private.usage_storage from public, anon, authenticated;
