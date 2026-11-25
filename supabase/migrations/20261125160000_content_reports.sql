-- بلاغات الأخطاء في محتوى بطاقة الكلمة (القراءات، المعنى، التفسير، الإعراب…).
-- البلاغ لا يحمل بيانات شخصية: مكان النص ونصه وملاحظة المستخدم، ومعرّف عشوائي للمتصفح
-- يُحفظ مجزّأً فقط ليحدّ عدد البلاغات من الجهاز نفسه.
create table private.content_reports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  device_hash text not null,
  section text not null,
  location text not null,
  page int not null,
  word int,
  surah int not null,
  ayah int not null,
  riwaya text not null,
  excerpt text not null,
  note text not null default '',
  notified_at timestamptz,
  constraint content_reports_page check (page between 1 and 604),
  constraint content_reports_surah check (surah between 1 and 114),
  constraint content_reports_ayah check (ayah between 1 and 286)
);
alter table private.content_reports enable row level security;
create index content_reports_device_time on private.content_reports (device_hash, created_at);
create index content_reports_pending on private.content_reports (created_at) where notified_at is null;

-- يكتبها المتصفح. تعيد معرّف البلاغ، أو null إن رُفضت المدخلات أو تجاوز الحد:
-- ١٠ بلاغات في الساعة من الجهاز الواحد، و٣٠٠ في الساعة على التطبيق كله.
create or replace function public.submit_content_report(
  p_device text, p_section text, p_location text, p_page int, p_word int,
  p_surah int, p_ayah int, p_riwaya text, p_excerpt text, p_note text default '')
returns uuid
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_hash text;
  v_id uuid;
begin
  if p_device is null or length(p_device) not between 8 and 200
     or coalesce(length(p_section), 0) not between 1 and 40
     or coalesce(length(p_location), 0) not between 1 and 120
     or p_page is null or p_page not between 1 and 604
     or p_surah is null or p_surah not between 1 and 114
     or p_ayah is null or p_ayah not between 1 and 286
     or (p_word is not null and p_word not between 0 and 77431)
     or coalesce(length(p_riwaya), 0) not between 2 and 20
     or coalesce(length(trim(p_excerpt)), 0) not between 1 and 500
     or length(coalesce(p_note, '')) > 500 then
    return null;
  end if;
  v_hash := encode(extensions.digest(p_device, 'sha256'), 'hex');
  if (select count(*) from private.content_reports
       where device_hash = v_hash and created_at > now() - interval '1 hour') >= 10
     or (select count(*) from private.content_reports
          where created_at > now() - interval '1 hour') >= 300 then
    return null;
  end if;
  insert into private.content_reports
    (device_hash, section, location, page, word, surah, ayah, riwaya, excerpt, note)
  values (v_hash, p_section, p_location, p_page, p_word, p_surah, p_ayah, p_riwaya,
          trim(p_excerpt), trim(coalesce(p_note, '')))
  returning id into v_id;
  return v_id;
end;
$function$;

-- للخادم وحده (وظيفة report-notify): يعيد البلاغ مرة واحدة فقط ويعلّمه مُرسَلًا.
create or replace function public.take_content_report(p_id uuid)
returns json
language plpgsql
security definer
set search_path to ''
as $function$
declare
  r private.content_reports;
begin
  update private.content_reports set notified_at = now()
   where id = p_id and notified_at is null
  returning * into r;
  if r.id is null then
    return null;
  end if;
  return json_build_object('id', r.id, 'created_at', r.created_at, 'section', r.section,
    'location', r.location, 'page', r.page, 'word', r.word, 'surah', r.surah, 'ayah', r.ayah,
    'riwaya', r.riwaya, 'excerpt', r.excerpt, 'note', r.note);
end;
$function$;

revoke all on function public.submit_content_report from public, anon, authenticated, service_role;
revoke all on function public.take_content_report from public, anon, authenticated, service_role;
grant execute on function public.submit_content_report to anon, authenticated, service_role;
grant execute on function public.take_content_report to service_role;
