-- اختبارات الاسم المطلوب في «ادخل عبر تيليغرام». تُشغَّل بعد الترحيل داخل معاملة تُلغى.
do $$
declare
  r json; c1 text; k1 uuid; nn text;
  chat_h constant bigint := -999000555;
  chat_a constant bigint := -999000666;
  log text := '';
begin
  r := public.create_khatmah('اختبار', '', current_date + 7, 20, 0, 'منظم', 'منظم', '123456', 'dev-org', 'private');
  c1 := r->>'code'; select id into k1 from public.khatmah where code = c1;
  perform public.sign_in(c1, 'هانية', 'هانية', 'dev-h', null);
  perform public.sign_in(c1, 'أيمن', 'أيمن', 'dev-a', null);
  update public.members set tg_chat_id = chat_h where khatmah_id = k1 and mid = 'هانية';
  update public.members set tg_chat_id = chat_a where khatmah_id = k1 and mid = 'أيمن';

  -- طُلب اسم «هانية» وأكّد حساب أيمن: يذكر البوت الاسمين
  nn := public.start_tg_login('dev-x', c1, 'هانية');
  r := public.confirm_tg_login(nn, chat_a, false);
  if r->>'wanted' is distinct from 'هانية' or r->>'name' <> 'أيمن' then raise exception 'FAIL: mismatch %', r; end if;
  -- والدخول يكون بحساب من أكّد، لا بالاسم المطلوب
  perform public.confirm_tg_login(nn, chat_a, true);
  r := public.finish_tg_login(nn, 'dev-x');
  if json_array_length(r->'memberships') <> 1 or r->'memberships'->0->>'id' <> 'أيمن' then raise exception 'FAIL: logged in as %', r; end if;
  if exists (select 1 from public.members where khatmah_id = k1 and mid = 'هانية' and 'dev-x' = any(devices)) then
    raise exception 'FAIL: wanted name got the device';
  end if;
  log := log || 'mismatch ';

  -- طُلب اسم صاحب الحساب نفسه: لا التباس
  nn := public.start_tg_login('dev-y', c1, 'هانية');
  r := public.confirm_tg_login(nn, chat_h, false);
  if r->>'wanted' is not null or r->>'name' <> 'هانية' then raise exception 'FAIL: match %', r; end if;
  log := log || 'match ';

  -- بلا اسم (رابط «دخلت هذه الختمة من قبل؟») وبالاستدعاء القديم بمعاملين
  nn := public.start_tg_login('dev-z', c1);
  r := public.confirm_tg_login(nn, chat_a, false);
  if r->>'wanted' is not null then raise exception 'FAIL: no wanted name %', r; end if;
  log := log || 'no-name ';

  -- اسم مطلوب غير موجود في الختمة
  nn := public.start_tg_login('dev-w', c1, 'غريب');
  r := public.confirm_tg_login(nn, chat_a, false);
  if r->>'wanted' is not null or not (r->>'ok')::boolean then raise exception 'FAIL: unknown wanted %', r; end if;
  log := log || 'unknown';

  raise exception 'ALL_TESTS_PASSED: %', log;
end $$;
