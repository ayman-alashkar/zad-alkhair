create or replace function public.redeem_telegram_migration_token(
  p_token text,
  p_device text
)
returns json
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_row public.telegram_migration_tokens%rowtype;
  v_hash text;
  v_device_hash text;
  v_profiles jsonb;
  v_active text;
begin
  if p_token !~ '^[A-Za-z0-9_-]{43}$'
     or char_length(coalesce(p_device, '')) not between 8 and 128
     or p_device ~ '[[:cntrl:]]' then
    return json_build_object('ok', false, 'error', 'invalid_request');
  end if;

  v_hash := encode(digest(p_token, 'sha256'), 'hex');
  v_device_hash := encode(digest(p_device, 'sha256'), 'hex');

  select * into v_row
    from public.telegram_migration_tokens
   where token_hash = v_hash
   for update;

  if not found or v_row.expires_at <= now() then
    return json_build_object('ok', false, 'error', 'expired');
  end if;
  if v_row.device_hash is not null and v_row.device_hash <> v_device_hash then
    return json_build_object('ok', false, 'error', 'already_claimed');
  end if;

  update public.telegram_migration_tokens
     set redeemed_at = coalesce(redeemed_at, now()),
         device_hash = coalesce(device_hash, v_device_hash)
   where token_hash = v_hash;

  with linked as (
    select m.khatmah_id, m.mid, m.name, k.code, k.title,
           case when k.organizer_id = m.mid then k.organizer_code else null end as org_code,
           k.end_date
      from public.members m
      join public.khatmah k on k.id = m.khatmah_id
     where m.tg_chat_id = v_row.chat_id
       and m.left_at is null
     order by k.end_date desc, m.created_at desc
     limit 12
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'code', code,
           'viewer', jsonb_build_object('id', mid, 'name', name),
           'title', title,
           'orgCode', org_code
         ) order by end_date desc), '[]'::jsonb),
         (array_agg(code order by end_date desc))[1]
    into v_profiles, v_active
    from linked;

  if jsonb_array_length(v_profiles) = 0 then
    return json_build_object('ok', false, 'error', 'not_linked');
  end if;

  return json_build_object(
    'ok', true,
    'payload', jsonb_build_object(
      'v', 1,
      'device', p_device,
      'profiles', v_profiles,
      'active', coalesce(v_active, ''),
      'prefs', '{}'::jsonb
    )
  );
end;
$$;
