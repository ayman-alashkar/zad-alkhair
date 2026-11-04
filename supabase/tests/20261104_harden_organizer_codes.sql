-- اختبارات ترحيل ٢٠٢٦١١٠٤. تُشغَّل بعد الترحيل داخل معاملة تُلغى في آخرها
-- (الخطأ المتعمد في النهاية يلغي كل ما سبقه)، فلا تبقى أي بيانات اختبار.
do $$
declare
  r json; c text; kid uuid; ok boolean; n int; i int;
  log text := '';
begin
  -- رموز المشرف الحالية: كلها مجزأة، وما زالت تطابق قيمها الأصلية
  select count(*) into n from public.khatmah where organizer_code !~ '^\$2[abxy]\$';
  if n <> 0 then raise exception 'FAIL: % plaintext organizer codes remain', n; end if;
  for kid, c in select id, organizer_code from private.backup_20261104_organizer_codes loop
    if not private.organizer_code_ok(kid, c, null) then
      raise exception 'FAIL: existing khatmah % no longer accepts its code', kid;
    end if;
  end loop;
  select count(*) into n from public.members m join public.khatmah k on k.id = m.khatmah_id and k.organizer_id = m.mid
   where coalesce(m.device, '') <> '' and not (m.device = any(m.devices));
  if n <> 0 then raise exception 'FAIL: organizer primary device missing from devices'; end if;
  log := log || 'existing-codes ';

  -- إنشاء: رمز قصير مرفوض، وتاريخ خارج المدى مرفوض
  r := public.create_khatmah('اختبار', '', current_date + 7, 20, 0, 'منظم', 'منظم', '12345', 'dev-org', 'private');
  if (r->>'ok')::boolean then raise exception 'FAIL: 5-char organizer code accepted'; end if;
  r := public.create_khatmah('اختبار', '', current_date + 2000, 20, 0, 'منظم', 'منظم', '123456', 'dev-org', 'private');
  if (r->>'ok')::boolean then raise exception 'FAIL: far end date accepted'; end if;
  r := public.create_khatmah('اختبار', '', current_date + 7, 20, 0, 'منظم', 'منظم', '123456', 'dev-org', 'private');
  if not (r->>'ok')::boolean then raise exception 'FAIL: create %', r; end if;
  c := r->>'code';
  if length(c) <> 4 then raise exception 'FAIL: code length %', length(c); end if;
  select id into kid from public.khatmah where code = c;
  if (select organizer_code from public.khatmah where id = kid) !~ '^\$2' then
    raise exception 'FAIL: new organizer code not hashed';
  end if;
  log := log || 'create ';

  -- دخول المشرف: الرمز الصحيح من جهاز جديد يعمل
  r := public.sign_in(c, 'منظم', 'منظم', 'dev-laptop', '123456');
  if not (r->>'isOrganizer')::boolean then raise exception 'FAIL: organizer sign-in %', r; end if;
  r := public.sign_in(c, 'منظم', 'منظم', 'dev-laptop', 'wrong');
  if coalesce((r->>'needCode')::boolean, false) is not true then raise exception 'FAIL: wrong code accepted'; end if;

  -- عشر محاولات خاطئة تقفل الأجهزة الغريبة، والجهاز المعروف يبقى يعمل
  for i in 1..9 loop
    r := public.sign_in(c, 'منظم', 'منظم', 'dev-evil', 'guess' || i);
  end loop;
  r := public.sign_in(c, 'منظم', 'منظم', 'dev-evil', '123456');
  if coalesce((r->>'needCode')::boolean, false) is not true then
    raise exception 'FAIL: unknown device not locked out after 10 failures: %', r;
  end if;
  if public.update_settings(c, '123456', 'x', '', current_date + 7, 20, 0, 'dev-evil', 'private')->>'ok' = 'true' then
    raise exception 'FAIL: organizer action allowed from unknown device during lock';
  end if;
  r := public.sign_in(c, 'منظم', 'منظم', 'dev-org', '123456');
  if not coalesce((r->>'isOrganizer')::boolean, false) then raise exception 'FAIL: first trusted device locked out: %', r; end if;
  log := log || 'lockout ';

  -- مشارك: دخول، إعفاء من المشرف، حجز، إتمام
  r := public.sign_in(c, 'قارئ', 'قارئ', 'dev-m1', null);
  if not (r->>'ok')::boolean then raise exception 'FAIL: member sign-in %', r; end if;
  r := public.sign_in(c, 'قارئ٢', '', 'dev-m2', null);
  if (r->>'ok')::boolean then raise exception 'FAIL: empty name accepted'; end if;
  r := public.sign_in(c, repeat('x', 121), 'طويل', 'dev-m3', null);
  if (r->>'ok')::boolean then raise exception 'FAIL: 121-char id accepted'; end if;
  r := public.set_exempt(c, '123456', 'قارئ', true, 'dev-org');
  if not (r->>'ok')::boolean then raise exception 'FAIL: set_exempt %', r; end if;
  r := public.claim_juz(c, 'قارئ', 3, 'dev-m1');
  if not (r->>'ok')::boolean then raise exception 'FAIL: claim %', r; end if;
  r := public.set_done(c, 'قارئ', 3, true, null, 'dev-m1');
  if not (r->>'ok')::boolean then raise exception 'FAIL: set_done %', r; end if;
  r := public.assign_juz(c, '123456', 4, 'قارئ', 'dev-org');
  if not (r->>'ok')::boolean then raise exception 'FAIL: assign %', r; end if;
  r := public.release_juz(c, 'منظم', 4, '123456', 'dev-org');
  if not (r->>'ok')::boolean then raise exception 'FAIL: organizer release %', r; end if;
  r := public.release_juz(c, 'قارئ', 3, null, 'dev-m1');
  if (r->>'ok')::boolean then raise exception 'FAIL: done juz released'; end if;
  log := log || 'member-flow ';

  -- من غادر لا يُسند إليه ولا يُعفى
  r := public.leave_khatmah(c, 'قارئ', 'dev-m1');
  if not (r->>'ok')::boolean then raise exception 'FAIL: leave %', r; end if;
  r := public.assign_juz(c, '123456', 5, 'قارئ', 'dev-org');
  if (r->>'ok')::boolean then raise exception 'FAIL: assigned to departed member'; end if;
  r := public.set_exempt(c, '123456', 'قارئ', true, 'dev-org');
  if (r->>'ok')::boolean then raise exception 'FAIL: exempted departed member'; end if;
  log := log || 'left_at ';

  -- إعدادات: التاريخ نفسه مقبول ولو مضى، والجديد البعيد مرفوض
  update public.khatmah set end_date = current_date - 10 where id = kid;
  r := public.update_settings(c, '123456', 'اختبار', '', current_date - 10, 20, 0, 'dev-org', 'private');
  if not (r->>'ok')::boolean then raise exception 'FAIL: unchanged past end rejected %', r; end if;
  r := public.update_settings(c, '123456', 'اختبار', '', current_date + 2000, 20, 0, 'dev-org', 'private');
  if (r->>'ok')::boolean then raise exception 'FAIL: far end date accepted in settings'; end if;
  log := log || 'settings ';

  -- تغيير الرمز وتسليم الإشراف
  r := public.change_organizer_code(c, '123456', 'dev-org', '9999');
  if (r->>'ok')::boolean then raise exception 'FAIL: 4-char new code accepted'; end if;
  r := public.change_organizer_code(c, '123456', 'dev-org', '123456');
  if (r->>'ok')::boolean then raise exception 'FAIL: same code accepted as new'; end if;
  r := public.change_organizer_code(c, '123456', 'dev-org', 'abcdef');
  if not (r->>'ok')::boolean then raise exception 'FAIL: change code %', r; end if;
  if public._organizer_device_ok(kid, '123456', 'dev-x') then raise exception 'FAIL: old code still works'; end if;
  if not public._organizer_device_ok(kid, 'abcdef', 'dev-x') then raise exception 'FAIL: new code rejected'; end if;
  r := public.sign_in(c, 'قارئ٣', 'قارئ٣', 'dev-m4', null);
  r := public.transfer_organizer(c, 'abcdef', 'dev-org', 'قارئ٣', 'newcode1');
  if not (r->>'ok')::boolean then raise exception 'FAIL: transfer %', r; end if;
  r := public.sign_in(c, 'قارئ٣', 'قارئ٣', 'dev-m4', 'newcode1');
  if not coalesce((r->>'isOrganizer')::boolean, false) then raise exception 'FAIL: new organizer sign-in %', r; end if;
  -- المشرف السابق برمزه القديم لا يُحسب عليه فشل في set_done/release_juz
  r := public.release_juz(c, 'منظم', 6, 'abcdef', 'dev-org');
  if exists (select 1 from private.organizer_code_attempts where khatmah_id = kid and failures > 0) then
    raise exception 'FAIL: former organizer stale code counted as failure';
  end if;
  log := log || 'change-transfer ';

  -- رمز ختمة أطول جاهز للتفعيل لاحقًا
  if length(public.gen_code(6)) <> 6 then raise exception 'FAIL: gen_code(6)'; end if;
  log := log || 'gen_code6 ';

  -- صلاحيات: لا شيء جديد مكشوف للزوار
  if has_function_privilege('anon', 'private.organizer_code_ok(uuid,text,text)', 'execute')
     or has_function_privilege('anon', 'private.hash_organizer_code(text)', 'execute')
     or has_function_privilege('anon', 'public.gen_code(integer)', 'execute')
     or has_function_privilege('anon', 'public._organizer_device_ok(uuid,text,text)', 'execute')
     or has_table_privilege('anon', 'private.organizer_code_attempts', 'select') then
    raise exception 'FAIL: new objects exposed to anon';
  end if;
  log := log || 'grants';

  raise exception 'ALL_TESTS_PASSED: %', log;
end $$;
