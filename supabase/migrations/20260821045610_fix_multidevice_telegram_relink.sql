create or replace function public.make_link_code(p_code text, p_id text, p_device text)
returns text
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $function$
declare
  k_id uuid;
  c text;
  upd integer := 0;
begin
  select id into k_id
    from public.khatmah
   where code = upper(trim(p_code));

  if k_id is null or not public._member_device_ok(k_id, p_id, p_device) then
    return null;
  end if;

  c := encode(gen_random_bytes(18), 'hex');

  -- _member_device_ok accepts both the primary device and every authorized
  -- device in members.devices. Persist the link code on the member identity,
  -- not only when the caller happens to be the current primary device.
  update public.members
     set link_code = c,
         link_at   = now()
   where khatmah_id = k_id
     and mid = p_id
     and left_at is null;
  get diagnostics upd = row_count;

  if upd = 0 then
    return null;
  end if;

  return c;
end;
$function$;

create or replace function public.link_telegram(p_code text, p_chat bigint)
returns json
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  m members%rowtype;
  prev text;
  kcode text;
  was_linked boolean;
begin
  select * into m
    from members
   where link_code = p_code
     and link_at is not null
     and link_at > now() - interval '10 minutes';

  if m.mid is null then
    update members
       set link_code = null,
           link_at = null
     where link_code is not null
       and link_at < now() - interval '10 minutes';
    return json_build_object('ok', false);
  end if;

  was_linked := (m.tg_chat_id is not null and m.tg_chat_id = p_chat);

  select name into prev
    from members
   where khatmah_id = m.khatmah_id
     and tg_chat_id = p_chat
     and mid <> m.mid
   limit 1;

  update members
     set tg_chat_id = null
   where khatmah_id = m.khatmah_id
     and tg_chat_id = p_chat
     and mid <> m.mid;

  -- A successful Telegram link means this member no longer needs the
  -- organizer-granted no-Telegram exemption. Clearing it is essential because
  -- reminder delivery intentionally excludes exempt members.
  update members
     set tg_chat_id = p_chat,
         link_code = null,
         link_at = null,
         exempt = false
   where khatmah_id = m.khatmah_id
     and mid = m.mid;

  select code into kcode
    from khatmah
   where id = m.khatmah_id;

  return json_build_object(
    'ok', true,
    'name', m.name,
    'moved', prev,
    'code', kcode,
    'again', was_linked
  );
end;
$function$;
