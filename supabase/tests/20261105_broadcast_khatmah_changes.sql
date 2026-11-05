-- اختبارات ترحيل ٢٠٢٦١١٠٥ (الإشارة الفورية). تُشغَّل بعد الترحيل داخل معاملة تُلغى
-- في آخرها (الخطأ المتعمد في النهاية يلغي كل ما سبقه)، فلا تبقى أي بيانات اختبار.
--
-- خدمة Realtime تنشئ أقسام realtime.messages حين تكون نشطة فقط، ولا نملك إنشاءها،
-- فيُستبدل هنا private.khatmah_live_send بسجلٍّ مؤقت يُحصي الإشارات ومواضيعها.

-- الإرسال الحقيقي لا يرفع خطأ حتى إن لم تكن الخدمة نشطة (realtime.send تلتقط أخطاءها).
select private.khatmah_live_send('khatmah:TEST');

create temp table live_log(topic text) on commit drop;
create or replace function private.khatmah_live_send(p_topic text)
returns void language sql as $$ insert into live_log values (p_topic) $$;

do $$
declare
  r json; c text; kid uuid; n int;
  log text := '';
  -- كل خطوة في التطبيق معاملة مستقلة؛ هنا نُفرغ علامة «أُرسلت» بين الخطوات.
  reset_seen text;
begin
  r := public.create_khatmah('اختبار البث', '', current_date + 7, 20, 0, 'منظم', 'منظم', '123456', 'dev-org', 'private');
  if not (r->>'ok')::boolean then raise exception 'FAIL: create %', r; end if;
  c := r->>'code';
  select id into kid from public.khatmah where code = c;
  reset_seen := 'zad.live_' || replace(kid::text, '-', '');

  -- إنشاء الختمة (صفها و٣٠ جزءًا وعضو المنظم): إشارة واحدة لا أكثر
  select count(*) into n from live_log where topic = 'khatmah:' || c;
  if n <> 1 then raise exception 'FAIL: create sent % signals, expected 1', n; end if;
  if exists (select 1 from live_log where topic <> 'khatmah:' || c) then raise exception 'FAIL: signal to another topic'; end if;
  log := log || 'create ';

  -- دخول عضو، وإعفاؤه، وحجزه جزءًا: إشارة لكل خطوة
  perform set_config(reset_seen, '', true);
  r := public.sign_in(c, 'قارئ', 'قارئ', 'dev-m1', null);
  if not (r->>'ok')::boolean then raise exception 'FAIL: sign-in %', r; end if;
  perform set_config(reset_seen, '', true);
  r := public.set_exempt(c, '123456', 'قارئ', true, 'dev-org');
  if not (r->>'ok')::boolean then raise exception 'FAIL: set_exempt %', r; end if;
  perform set_config(reset_seen, '', true);
  r := public.claim_juz(c, 'قارئ', 3, 'dev-m1');
  if not (r->>'ok')::boolean then raise exception 'FAIL: claim %', r; end if;
  select count(*) into n from live_log where topic = 'khatmah:' || c;
  if n <> 4 then raise exception 'FAIL: after sign-in, exempt and claim % signals, expected 4', n; end if;
  log := log || 'member-and-juz ';

  -- تغيير مباشر في الختمة نفسها (العنوان)
  perform set_config(reset_seen, '', true);
  update public.khatmah set title = 'اختبار البث ٢' where id = kid;
  select count(*) into n from live_log;
  if n <> 5 then raise exception 'FAIL: khatmah update % signals, expected 5', n; end if;
  log := log || 'khatmah ';

  -- ثلاثون جزءًا في عبارة واحدة: إشارة واحدة
  perform set_config(reset_seen, '', true);
  update public.juz set status = status where khatmah_id = kid;
  select count(*) into n from live_log;
  if n <> 6 then raise exception 'FAIL: bulk update % signals, expected 6', n; end if;
  log := log || 'bulk-once ';

  -- فشل الإرسال لا يمسّ الكتابة
  perform set_config(reset_seen, '', true);
  execute 'create or replace function private.khatmah_live_send(p_topic text) returns void language plpgsql as $f$ begin raise exception ''simulated failure''; end $f$';
  r := public.set_done(c, 'قارئ', 3, true, null, 'dev-m1');
  if not (r->>'ok')::boolean then raise exception 'FAIL: set_done blocked by a failing broadcast %', r; end if;
  if (select status from public.juz where khatmah_id = kid and number = 3) <> 'done' then raise exception 'FAIL: juz not saved'; end if;
  log := log || 'failure-safe ';

  -- لا يصل الزوار إلى الدالتين
  if has_function_privilege('anon', 'private.broadcast_khatmah_change()', 'execute')
     or has_function_privilege('authenticated', 'private.broadcast_khatmah_change()', 'execute')
     or has_function_privilege('anon', 'private.khatmah_live_send(text)', 'execute') then
    raise exception 'FAIL: broadcast functions exposed';
  end if;
  log := log || 'grants';

  raise exception 'ALL_TESTS_PASSED: %', log;
end $$;
