-- اختبارات «ادخل عبر تيليغرام». تُشغَّل بعد الترحيل داخل معاملة تُلغى في آخرها.
do $$
declare
  r json; c1 text; c2 text; k1 uuid; k2 uuid; nn text; n2 text; n int; i int;
  chat constant bigint := -999000333;
  other constant bigint := -999000444;
  log text := '';
begin
  r := public.create_khatmah('اختبار ١', '', current_date + 7, 20, 0, 'منظم', 'منظم', '123456', 'dev-org', 'private');
  c1 := r->>'code'; select id into k1 from public.khatmah where code = c1;
  r := public.create_khatmah('اختبار ٢', '', current_date + 7, 20, 0, 'منظم', 'منظم', '123456', 'dev-org', 'private');
  c2 := r->>'code'; select id into k2 from public.khatmah where code = c2;
  perform public.sign_in(c1, 'سالم', 'سالم', 'dev-a', null);
  perform public.sign_in(c2, 'سالم', 'سالم', 'dev-a', null);
  perform public.sign_in(c1, 'خالد', 'خالد', 'dev-x', null);
  perform public.sign_in(c1, 'ليلى', 'ليلى', 'dev-l', null);
  update public.members set tg_chat_id = chat where mid = 'سالم' and khatmah_id in (k1, k2);
  update public.members set tg_chat_id = other where mid = 'خالد' and khatmah_id = k1;
  log := log || 'setup ';

  -- الرفض يذكر الربط
  r := public.sign_in(c1, 'سالم', 'سالم', 'dev-wa', null);
  if (r->>'linked')::boolean is not true then raise exception 'FAIL: taken without linked %', r; end if;
  r := public.sign_in(c1, 'ليلى', 'ليلى', 'dev-wa', null);
  if (r->>'linked')::boolean is not false then raise exception 'FAIL: unlinked flag %', r; end if;
  log := log || 'linked-flag ';

  -- البدء
  nn := public.start_tg_login('dev-wa', lower(c1));
  if nn is null or nn !~ '^[0-9a-f]{32}$' then raise exception 'FAIL: nonce %', nn; end if;
  if length('login_' || nn) > 64 then raise exception 'FAIL: start payload too long'; end if;
  if public.start_tg_login('', c1) is not null then raise exception 'FAIL: empty device'; end if;
  log := log || 'start ';

  -- قبل التأكيد: الانتظار
  r := public.finish_tg_login(nn, 'dev-wa');
  if (r->>'pending')::boolean is not true then raise exception 'FAIL: expected pending %', r; end if;

  -- المعاينة لا تثبّت شيئًا
  r := public.confirm_tg_login(nn, chat, false);
  if not (r->>'ok')::boolean or r->>'name' <> 'سالم' or (r->>'inKhatmah')::boolean is not true then
    raise exception 'FAIL: preview %', r;
  end if;
  r := public.finish_tg_login(nn, 'dev-wa');
  if (r->>'pending')::boolean is not true then raise exception 'FAIL: preview confirmed the request'; end if;
  log := log || 'preview ';

  -- حساب بلا عضويات
  r := public.confirm_tg_login(nn, -1, true);
  if (r->>'ok')::boolean or r->>'why' <> 'none' then raise exception 'FAIL: chat without members %', r; end if;
  log := log || 'none ';

  -- التأكيد، ثم لا يغيّره حساب آخر
  r := public.confirm_tg_login(nn, chat, true);
  if not (r->>'ok')::boolean then raise exception 'FAIL: confirm %', r; end if;
  r := public.confirm_tg_login(nn, other, true);
  if (r->>'ok')::boolean then raise exception 'FAIL: second account took over a confirmed request'; end if;
  log := log || 'confirm ';

  -- متصفح آخر لا يستعمل الرمز
  r := public.finish_tg_login(nn, 'dev-thief');
  if (r->>'ok')::boolean or coalesce((r->>'pending')::boolean, false) then raise exception 'FAIL: other device finished %', r; end if;

  -- الإنهاء من المتصفح الطالب
  r := public.finish_tg_login(nn, 'dev-wa');
  if not (r->>'ok')::boolean or json_array_length(r->'memberships') <> 2 then raise exception 'FAIL: finish %', r; end if;
  select count(*) into n from public.members where tg_chat_id = chat and 'dev-wa' = any(devices) and device = 'dev-a';
  if n <> 2 then raise exception 'FAIL: device not attached (%)', n; end if;
  if exists (select 1 from public.members where khatmah_id in (k1, k2) and mid in ('خالد', 'ليلى') and 'dev-wa' = any(devices)) then
    raise exception 'FAIL: other members touched';
  end if;
  select count(*) into n from public.events where kind = 'tg_login' and source = 'new' and code = c1;
  if n <> 1 then raise exception 'FAIL: tg_login event %', n; end if;
  log := log || 'finish ';

  -- مرة واحدة فقط
  r := public.finish_tg_login(nn, 'dev-wa');
  if (r->>'ok')::boolean then raise exception 'FAIL: finished twice'; end if;
  r := public.sign_in(c1, 'سالم', 'سالم', 'dev-wa', null);
  if not (r->>'ok')::boolean then raise exception 'FAIL: sign-in after tg login %', r; end if;
  log := log || 'once ';

  -- الانتهاء بعد ١٠ دقائق
  n2 := public.start_tg_login('dev-late', c1);
  update private.tg_login_requests set created_at = now() - interval '11 minutes'
   where nonce_hash = encode(extensions.digest(n2, 'sha256'), 'hex');
  r := public.confirm_tg_login(n2, chat, true);
  if (r->>'ok')::boolean then raise exception 'FAIL: expired request confirmed'; end if;
  log := log || 'expiry ';

  -- حدّ الطلبات
  for i in 1..12 loop n2 := public.start_tg_login('dev-flood', c1); end loop;
  if n2 is not null then raise exception 'FAIL: no rate limit'; end if;
  log := log || 'rate ';

  -- رابط البوت ما زال يعمل بعد إعادة كتابته
  n2 := public.issue_login_link(chat);
  r := public.redeem_login_link(n2, 'dev-tg');
  if not (r->>'ok')::boolean or json_array_length(r->'memberships') <> 2 then raise exception 'FAIL: login link %', r; end if;
  log := log || 'login-link ';

  -- الصلاحيات
  if has_function_privilege('anon', 'public.confirm_tg_login(text,bigint,boolean)', 'execute')
     or has_function_privilege('anon', 'private.attach_device(bigint,text)', 'execute')
     or has_function_privilege('anon', 'private.memberships_of(bigint)', 'execute')
     or has_table_privilege('anon', 'private.tg_login_requests', 'select') then
    raise exception 'FAIL: exposed to anon';
  end if;
  if not has_function_privilege('anon', 'public.start_tg_login(text,text)', 'execute')
     or not has_function_privilege('anon', 'public.finish_tg_login(text,text)', 'execute') then
    raise exception 'FAIL: app cannot call start/finish';
  end if;
  log := log || 'grants';

  raise exception 'ALL_TESTS_PASSED: %', log;
end $$;
