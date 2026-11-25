-- اختبارات إيقاف «الفتح الدائم». تُشغَّل بعد الترحيل داخل معاملة تُلغى في آخرها.
do $$
declare
  r json; c1 text; k1 uuid; log text := '';
begin
  r := public.create_khatmah('اختبار', '', current_date + 7, 20, 0, 'منظم', 'منظم', '123456', 'dev-org', 'private');
  c1 := r->>'code'; select id into k1 from public.khatmah where code = c1;
  perform public.sign_in(c1, 'سالم', 'سالم', 'dev-a', null);

  -- حتى لو بقي العلَم في صف قديم، لا يُقبل به متصفح آخر
  update public.members set name_open_permanently = true where khatmah_id = k1 and mid = 'سالم';
  if public._member_device_ok(k1, 'سالم', 'dev-b') then raise exception 'FAIL: open flag still grants access'; end if;
  if not public._member_device_ok(k1, 'سالم', 'dev-a') then raise exception 'FAIL: own device refused'; end if;
  r := public.sign_in(c1, 'سالم', 'سالم', 'dev-b', null);
  if coalesce((r->>'taken')::boolean, false) is not true then raise exception 'FAIL: sign-in through open flag %', r; end if;
  log := log || 'flag-ignored ';

  -- المنظّم لا يستطيع الفتح الدائم
  r := public.set_name_access(c1, '123456', 'سالم', 'dev-org', 'open');
  if (r->>'ok')::boolean then raise exception 'FAIL: open mode accepted'; end if;
  log := log || 'open-refused ';

  -- «إلغاء الفتح» ينظّف العلَم القديم
  r := public.set_name_access(c1, '123456', 'سالم', 'dev-org', 'lock');
  if not (r->>'ok')::boolean then raise exception 'FAIL: lock %', r; end if;
  if (select name_open_permanently from public.members where khatmah_id = k1 and mid = 'سالم') then raise exception 'FAIL: flag kept'; end if;
  log := log || 'lock ';

  -- الفتح لمرة واحدة ما زال يعمل
  r := public.set_name_access(c1, '123456', 'سالم', 'dev-org', 'once');
  if not (r->>'ok')::boolean then raise exception 'FAIL: once %', r; end if;
  r := public.sign_in(c1, 'سالم', 'سالم', 'dev-new', null);
  if not (r->>'ok')::boolean then raise exception 'FAIL: sign-in after once %', r; end if;
  r := public.sign_in(c1, 'سالم', 'سالم', 'dev-other', null);
  if coalesce((r->>'taken')::boolean, false) is not true then raise exception 'FAIL: once stayed open %', r; end if;
  log := log || 'once';

  raise exception 'ALL_TESTS_PASSED: %', log;
end $$;
