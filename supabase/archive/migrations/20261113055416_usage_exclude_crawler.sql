-- زاحف Google يشغّل صفحات السور كاملة، ومعها شيفرة القياس، من مراكزه في كاليفورنيا:
-- كل صفحة في متصفح جديد، فتظهر جهازًا جديدًا بمنطقة America/Los_Angeles، غير مثبّت،
-- فتح صفحة واحدة فقط. تُستبعد هذه الصفوف من الاستعلامات، وتبقى في الجدول للمراجعة.
create or replace view private.usage_human as
select * from public.usage_daily
where bot is null
  and not (
    tz = 'America/Los_Angeles'
    and not installed
    and home + prayer + khatmahs + adhkar + quran + reader + listen <= 1
  );
revoke all on private.usage_human from public, anon, authenticated;
