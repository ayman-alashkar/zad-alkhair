-- التحديث الفوري للختمة (Realtime Broadcast من قاعدة البيانات).
--
-- عند أي تغيير في ختمة أو أعضائها أو أجزائها تُرسل إشارة فارغة «changed» إلى
-- القناة العامة khatmah:<الرمز>. الإشارة لا تحمل بيانات: من يتلقاها يطلب الحالة
-- بـ get_state كما يفعل اليوم، فلا يعرف المشترك شيئًا لا يعرفه برمز الختمة أصلًا.
--
-- إشارة واحدة لكل ختمة في المعاملة الواحدة (بدء دورة جديدة يغيّر ٣٠ جزءًا معًا).
-- فشل البث لا يمسّ الكتابة: realtime.send تلتقط أخطاءها، ونلتقط ما قد يفلت منها.

-- الإرسال نفسه في دالة صغيرة مستقلة، ليُستبدل بها سجلٌّ في الاختبار.
create or replace function private.khatmah_live_send(p_topic text)
returns void
language plpgsql
security definer
set search_path to ''
as $$
begin
  perform realtime.send('{}'::jsonb, 'changed', p_topic, false);
end $$;

revoke all on function private.khatmah_live_send(text) from public, anon, authenticated;

create or replace function private.broadcast_khatmah_change()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
declare
  kid uuid;
  kcode text;
  seen text;
begin
  begin
    if tg_table_name = 'khatmah' then
      kid := coalesce(new.id, old.id);
      kcode := coalesce(new.code, old.code);
    else
      kid := coalesce(new.khatmah_id, old.khatmah_id);
      select k.code into kcode from public.khatmah k where k.id = kid;
    end if;
    if kcode is null then return null; end if;

    seen := 'zad.live_' || replace(kid::text, '-', '');
    if coalesce(current_setting(seen, true), '') = '1' then return null; end if;
    perform set_config(seen, '1', true);

    perform private.khatmah_live_send('khatmah:' || kcode);
  exception when others then
    raise warning 'Khatmah live broadcast skipped: %', sqlerrm;
  end;
  return null;
end $$;

revoke all on function private.broadcast_khatmah_change() from public, anon, authenticated;

create trigger broadcast_khatmah_change
  after insert or update or delete on public.khatmah
  for each row execute function private.broadcast_khatmah_change();

create trigger broadcast_khatmah_change
  after insert or update or delete on public.members
  for each row execute function private.broadcast_khatmah_change();

create trigger broadcast_khatmah_change
  after insert or update or delete on public.juz
  for each row execute function private.broadcast_khatmah_change();
