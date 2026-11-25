-- بلاغات المحتوى: القبول، ورفض المدخلات الخاطئة، والحدّ لكل جهاز، والتسليم مرة واحدة.
do $$
declare
  v uuid; r json; i int;
begin
  v := public.submit_content_report('device-test-0001', 'qiraat', 'القراءات: ابن كثير', 11, 1195, 2, 74, 'bazzi', 'قرأ بياء الغيب', 'ملاحظة');
  if v is null then raise exception 'valid report rejected'; end if;
  if (select device_hash from private.content_reports where id = v) = 'device-test-0001' then raise exception 'device stored in clear'; end if;

  if public.submit_content_report('device-test-0001', 'qiraat', 'x', 605, null, 2, 74, 'hafs', 'نص', '') is not null then raise exception 'page 605 accepted'; end if;
  if public.submit_content_report('device-test-0001', 'qiraat', 'x', 11, null, 2, 74, 'hafs', '   ', '') is not null then raise exception 'empty excerpt accepted'; end if;
  if public.submit_content_report('short', 'qiraat', 'x', 11, null, 2, 74, 'hafs', 'نص', '') is not null then raise exception 'short device accepted'; end if;
  if public.submit_content_report('device-test-0001', 'qiraat', 'x', 11, null, 2, 74, 'hafs', 'نص', repeat('م', 501)) is not null then raise exception 'long note accepted'; end if;

  for i in 2..10 loop
    if public.submit_content_report('device-test-0001', 'meaning', 'المعنى', 11, 1195, 2, 74, 'hafs', 'نص ' || i, '') is null then raise exception 'report % rejected under limit', i; end if;
  end loop;
  if public.submit_content_report('device-test-0001', 'meaning', 'المعنى', 11, 1195, 2, 74, 'hafs', 'الحادي عشر', '') is not null then raise exception 'eleventh report in an hour accepted'; end if;
  if public.submit_content_report('device-test-0002', 'meaning', 'المعنى', 11, 1195, 2, 74, 'hafs', 'جهاز آخر', '') is null then raise exception 'other device blocked'; end if;

  r := public.take_content_report(v);
  if r is null or r->>'excerpt' <> 'قرأ بياء الغيب' or r->>'riwaya' <> 'bazzi' then raise exception 'take failed: %', r; end if;
  if public.take_content_report(v) is not null then raise exception 'report delivered twice'; end if;

  if has_function_privilege('anon', 'public.take_content_report(uuid)', 'execute') then raise exception 'anon can take reports'; end if;
  if not has_function_privilege('anon', 'public.submit_content_report(text,text,text,integer,integer,integer,integer,text,text,text)', 'execute') then raise exception 'anon cannot submit'; end if;
  if has_table_privilege('anon', 'private.content_reports', 'select') then raise exception 'anon can read reports'; end if;
  raise exception 'ALL_TESTS_PASSED';
end $$;
