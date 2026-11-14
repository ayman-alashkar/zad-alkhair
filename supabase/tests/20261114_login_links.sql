-- اختبارات ترحيل ٢٠٢٦١١١٤ (رابط الدخول من رسائل البوت). تُشغَّل بعد الترحيل
-- داخل معاملة تُلغى في آخرها (الخطأ المتعمد في النهاية يلغي كل ما سبقه).
do $$
declare
  r json; c1 text; c2 text; k1 uuid; k2 uuid; t text; t2 text; n int; i int;
  chat constant bigint := -999000111;
  other constant bigint := -999000222;
  log text := '';
begin
  -- ختمتان، والعضو «سالم» في كلتيهما بحساب تيليغرام واحد
  r := public.create_khatmah('اختبار ١', '', current_date + 7, 20, 0, 'منظم', 'منظم', '123456', 'dev-org', 'private');
  c1 := r->>'code'; select id into k1 from public.khatmah where code = c1;
  r := public.create_khatmah('اختبار ٢', '', current_date + 7, 20, 0, 'منظم', 'منظم', '123456', 'dev-org', 'private');
  c2 := r->>'code'; select id into k2 from public.khatmah where code = c2;

  r := public.sign_in(c1, 'سالم', 'سالم', 'dev-a', null);
  if not (r->>'ok')::boolean then raise exception 'FAIL: join k1 %', r; end if;
  r := public.sign_in(c2, 'سالم', 'سالم', 'dev-a', null);
  if not (r->>'ok')::boolean then raise exception 'FAIL: join k2 %', r; end if;
  r := public.sign_in(c1, 'خالد', 'خالد', 'dev-x', null);
  update public.members set tg_chat_id = chat where mid = 'سالم' and khatmah_id in (k1, k2);
  update public.members set tg_chat_id = other where mid = 'خالد' and khatmah_id = k1;
  log := log || 'setup ';

  -- الحالة الأصلية: متصفح جديد يُرفض، ويُسجَّل الرفض
  r := public.sign_in(c1, 'سالم', 'سالم', 'dev-b', null);
  if coalesce((r->>'taken')::boolean, false) is not true then raise exception 'FAIL: expected taken %', r; end if;
  select count(*) into n from public.events
   where kind = 'name_taken' and code = c1 and source = 'linked' and device = left(md5('dev-b'), 12);
  if n <> 1 then raise exception 'FAIL: name_taken event count %', n; end if;
  log := log || 'taken-logged ';

  -- إصدار الرمز
  t := public.issue_login_link(chat);
  if t is null or t !~ '^[0-9a-f]{36}$' then raise exception 'FAIL: token format %', t; end if;
  if public.issue_login_link(-1) is not null then raise exception 'FAIL: token for chat without members'; end if;
  if exists (select 1 from private.login_links where token_hash = t) then
    raise exception 'FAIL: token stored in clear';
  end if;
  log := log || 'issue ';

  -- رموز خاطئة
  r := public.redeem_login_link(repeat('0', 36), 'dev-b');
  if (r->>'ok')::boolean then raise exception 'FAIL: unknown token accepted'; end if;
  r := public.redeem_login_link('nothex', 'dev-b');
  if (r->>'ok')::boolean then raise exception 'FAIL: malformed token accepted'; end if;
  r := public.redeem_login_link(t, '');
  if (r->>'ok')::boolean then raise exception 'FAIL: empty device accepted'; end if;
  log := log || 'reject ';

  -- الاستعمال: يضيف المتصفح للعضويتين، ولا يغيّر الجهاز الأساسي
  r := public.redeem_login_link(t, 'dev-b');
  if not (r->>'ok')::boolean then raise exception 'FAIL: redeem %', r; end if;
  if json_array_length(r->'memberships') <> 2 then raise exception 'FAIL: memberships %', r; end if;
  select count(*) into n from public.members
   where tg_chat_id = chat and 'dev-b' = any(devices) and device = 'dev-a';
  if n <> 2 then raise exception 'FAIL: device not added to both memberships (%)', n; end if;
  if exists (select 1 from public.members where mid = 'خالد' and 'dev-b' = any(devices)) then
    raise exception 'FAIL: another account touched';
  end if;
  select count(*) into n from public.events where kind = 'login_link' and source = 'new' and device = left(md5('dev-b'), 12);
  if n <> 1 then raise exception 'FAIL: login_link new event %', n; end if;
  log := log || 'redeem ';

  -- التكرار آمن: لا تكرار للجهاز، ويُسجَّل known
  r := public.redeem_login_link(t, 'dev-b');
  if not (r->>'ok')::boolean then raise exception 'FAIL: second redeem %', r; end if;
  select max(cardinality(array_positions(devices, 'dev-b'))) into n from public.members where tg_chat_id = chat;
  if n <> 1 then raise exception 'FAIL: device duplicated'; end if;
  if (select uses from private.login_links where token_hash = encode(extensions.digest(t, 'sha256'), 'hex')) <> 2 then
    raise exception 'FAIL: uses not counted';
  end if;
  select count(*) into n from public.events where kind = 'login_link' and source = 'known';
  if n < 1 then raise exception 'FAIL: login_link known event'; end if;
  log := log || 'idempotent ';

  -- بعد الاستعمال يدخل من المتصفح الجديد دون رفض
  r := public.sign_in(c1, 'سالم', 'سالم', 'dev-b', null);
  if not (r->>'ok')::boolean then raise exception 'FAIL: sign-in after redeem %', r; end if;
  log := log || 'sign-in ';

  -- من غادر الختمة لا يعود بالرابط
  update public.members set left_at = now() where mid = 'سالم' and khatmah_id = k2;
  t2 := public.issue_login_link(chat);
  r := public.redeem_login_link(t2, 'dev-c');
  if json_array_length(r->'memberships') <> 1 then raise exception 'FAIL: left membership returned %', r; end if;
  if exists (select 1 from public.members where khatmah_id = k2 and mid = 'سالم' and 'dev-c' = any(devices)) then
    raise exception 'FAIL: left membership modified';
  end if;
  log := log || 'left ';

  -- انتهاء الصلاحية
  update private.login_links set expires_at = now() - interval '1 minute'
   where token_hash = encode(extensions.digest(t2, 'sha256'), 'hex');
  r := public.redeem_login_link(t2, 'dev-d');
  if (r->>'ok')::boolean then raise exception 'FAIL: expired token accepted'; end if;
  log := log || 'expiry ';

  -- سقف ٢٠ جهازًا، ويبقى الأحدث
  for i in 1..25 loop
    t := public.issue_login_link(chat);
    r := public.redeem_login_link(t, 'cap-' || i);
  end loop;
  select cardinality(devices) into n from public.members where khatmah_id = k1 and mid = 'سالم';
  if n <> 20 then raise exception 'FAIL: devices cap %', n; end if;
  if not exists (select 1 from public.members where khatmah_id = k1 and mid = 'سالم' and 'cap-25' = any(devices)) then
    raise exception 'FAIL: newest device dropped';
  end if;
  if (select device from public.members where khatmah_id = k1 and mid = 'سالم') <> 'dev-a' then
    raise exception 'FAIL: primary device changed';
  end if;
  log := log || 'cap ';

  -- الصلاحيات
  if has_function_privilege('anon', 'public.issue_login_link(bigint)', 'execute')
     or has_function_privilege('authenticated', 'public.issue_login_link(bigint)', 'execute')
     or has_table_privilege('anon', 'private.login_links', 'select') then
    raise exception 'FAIL: login link issuing exposed';
  end if;
  if not has_function_privilege('anon', 'public.redeem_login_link(text,text)', 'execute') then
    raise exception 'FAIL: redeem not callable by the app';
  end if;
  log := log || 'grants';

  raise exception 'ALL_TESTS_PASSED: %', log;
end $$;
