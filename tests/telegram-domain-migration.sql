do $$
declare
  v_khatmah uuid := gen_random_uuid();
  v_khatmah_two uuid := gen_random_uuid();
  v_chat bigint := 900000000001;
  v_chat_two bigint := 900000000002;
  v_token text;
  v_result json;
  v_count integer;
begin
  insert into public.khatmah(
    id, code, title, end_date, organizer_id, organizer_code
  ) values (
    v_khatmah, 'TM91X', 'اختبار انتقال تلغرام', current_date + 10,
    'telegram-member', 'telegram-organizer-code'
  );
  insert into public.members(
    khatmah_id, mid, name, tg_chat_id, device, devices
  ) values (
    v_khatmah, 'telegram-member', 'عضو اختبار تلغرام', v_chat,
    'old-device-test-0001', array['old-device-test-0001']
  );

  v_result := public.issue_telegram_migration_token(v_chat, 600, 'final-domain-v1');
  if not coalesce((v_result->>'ok')::boolean, false)
     or not coalesce((v_result->>'needed')::boolean, false)
     or length(v_result->>'token') <> 43 then
    raise exception 'token issue failed: %', v_result;
  end if;
  v_token := v_result->>'token';

  v_result := public.redeem_telegram_migration_token(v_token, 'new-device-test-0002');
  if not coalesce((v_result->>'ok')::boolean, false)
     or v_result#>>'{payload,profiles,0,viewer,id}' <> 'telegram-member'
     or v_result#>>'{payload,profiles,0,orgCode}' <> 'telegram-organizer-code' then
    raise exception 'token redemption failed: %', v_result;
  end if;

  v_result := public.redeem_telegram_migration_token(v_token, 'other-device-test-0003');
  if v_result->>'error' <> 'already_claimed' then
    raise exception 'device binding failed: %', v_result;
  end if;

  v_result := public.confirm_telegram_migration_token(v_token, 'new-device-test-0002');
  if not coalesce((v_result->>'ok')::boolean, false) then
    raise exception 'token confirmation failed: %', v_result;
  end if;

  if not exists (
    select 1 from public.members
     where khatmah_id = v_khatmah and mid = 'telegram-member'
       and 'new-device-test-0002' = any(devices)
  ) then
    raise exception 'new device was not bound';
  end if;

  select count(*) into v_count
    from public.member_domain_migrations
   where khatmah_id = v_khatmah and member_id = 'telegram-member'
     and campaign_key = 'final-domain-v1';
  if v_count <> 1 then raise exception 'migration completion was not recorded once'; end if;

  select count(*) into v_count
    from public.telegram_migration_deliveries
   where kind = 'welcome' and chat_id = v_chat
     and campaign_key = 'final-domain-v1';
  if v_count <> 1 then raise exception 'welcome was not queued exactly once'; end if;

  v_result := public.confirm_telegram_migration_token(v_token, 'new-device-test-0002');
  if not coalesce((v_result->>'ok')::boolean, false)
     or not coalesce((v_result->>'already')::boolean, false) then
    raise exception 'confirmation is not idempotent: %', v_result;
  end if;

  v_result := public.redeem_telegram_migration_token(v_token, 'new-device-test-0002');
  if not coalesce((v_result->>'ok')::boolean, false)
     or v_result#>>'{payload,profiles,0,viewer,id}' <> 'telegram-member' then
    raise exception 'same-device reopen is not idempotent: %', v_result;
  end if;

  v_result := public.redeem_telegram_migration_token(v_token, 'other-device-test-0003');
  if v_result->>'error' <> 'already_claimed' then
    raise exception 'confirmed token crossed devices: %', v_result;
  end if;

  v_result := public.issue_telegram_migration_token(v_chat, 600, 'final-domain-v1');
  if not coalesce((v_result->>'ok')::boolean, false)
     or coalesce((v_result->>'needed')::boolean, true) then
    raise exception 'completed Telegram member still needs migration: %', v_result;
  end if;

  insert into public.khatmah(
    id, code, title, end_date, organizer_id, organizer_code
  ) values (
    v_khatmah_two, 'OM92X', 'اختبار الانتقال العادي', current_date + 11,
    'ordinary-member', 'ordinary-organizer-code'
  );
  insert into public.members(
    khatmah_id, mid, name, tg_chat_id, device, devices
  ) values (
    v_khatmah_two, 'ordinary-member', 'عضو اختبار عادي', v_chat_two,
    'ordinary-device-0004', array['ordinary-device-0004']
  );

  v_result := public.complete_origin_domain_migration(
    'ordinary-device-0004',
    jsonb_build_array(jsonb_build_object(
      'khatmahId', v_khatmah_two,
      'mid', 'ordinary-member'
    )),
    'final-domain-v1'
  );
  if not coalesce((v_result->>'ok')::boolean, false)
     or (v_result->>'members')::integer <> 1 then
    raise exception 'ordinary completion failed: %', v_result;
  end if;

  select count(*) into v_count
    from public.telegram_migration_deliveries
   where kind = 'welcome' and chat_id = v_chat_two
     and campaign_key = 'final-domain-v1';
  if v_count <> 1 then raise exception 'ordinary welcome was not queued exactly once'; end if;

  v_result := public.complete_origin_domain_migration(
    'ordinary-device-0004',
    jsonb_build_array(jsonb_build_object(
      'khatmahId', v_khatmah_two,
      'mid', 'ordinary-member'
    )),
    'final-domain-v1'
  );
  select count(*) into v_count
    from public.telegram_migration_deliveries
   where kind = 'welcome' and chat_id = v_chat_two
     and campaign_key = 'final-domain-v1';
  if v_count <> 1 then raise exception 'ordinary retry duplicated the welcome'; end if;
end;
$$;
