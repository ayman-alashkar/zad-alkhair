-- «ادخل عبر تيليغرام»: من يفتح الختمة في متصفح لا يعرفه الموقع (رابط واتساب
-- مثلًا) يثبت أنه صاحب الاسم بحساب تيليغرام المربوط به، فيُضاف المتصفح إلى
-- أجهزته دون أن يحتاج المشرف.
--
-- المسار:
--   ١) المتصفح: start_tg_login(جهازه) ← رمز مؤقت.
--   ٢) يفتح t.me/<البوت>?start=login_<الرمز>، فيعرض البوت صاحب الحساب وزر تأكيد
--      صريحًا (حتى لا يُستدرج أحد إلى إدخال غيره بضغطة على رابط مُرسَل إليه).
--   ٣) الضغط على التأكيد: confirm_tg_login(الرمز، المحادثة) من الخادم فقط.
--   ٤) المتصفح ينتظر: finish_tg_login(الرمز، جهازه) ← يُضاف الجهاز وتعود العضويات.
-- الرمز صالح ١٠ دقائق، ولا يستعمله إلا المتصفح الذي طلبه.

-- إضافة جهاز إلى كل عضوية نشطة لحساب تيليغرام، دون تغيير الجهاز الأساسي،
-- مع إبقاء آخر ٢٠ جهازًا. تعيد عدد العضويات التي أُضيف إليها.
create or replace function private.attach_device(p_chat bigint, p_device text)
returns integer
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_added integer := 0;
begin
  update public.members m
     set devices = (
           select coalesce(array_agg(x order by o), '{}'::text[])
             from (
               select x, o
                 from unnest(coalesce(m.devices, '{}'::text[]) || p_device) with ordinality as u(x, o)
                order by o desc
                limit 20
             ) last20
         ),
         device = coalesce(nullif(m.device, ''), p_device)
   where m.tg_chat_id = p_chat
     and m.left_at is null
     and m.device is distinct from p_device
     and not (p_device = any(coalesce(m.devices, '{}'::text[])));
  get diagnostics v_added = row_count;
  return v_added;
end;
$function$;
revoke all on function private.attach_device(bigint, text) from public, anon, authenticated;

create or replace function private.memberships_of(p_chat bigint)
returns json
language sql
stable
security definer
set search_path to ''
as $function$
  select coalesce(json_agg(json_build_object('code', k.code, 'id', m.mid, 'name', m.name)
                           order by m.created_at), '[]'::json)
    from public.members m
    join public.khatmah k on k.id = m.khatmah_id
   where m.tg_chat_id = p_chat
     and m.left_at is null;
$function$;
revoke all on function private.memberships_of(bigint) from public, anon, authenticated;

-- رابط الدخول من رسائل البوت يستعمل الدالتين نفسيهما (السلوك لم يتغير).
create or replace function public.redeem_login_link(p_token text, p_device text)
returns json
language plpgsql
security definer
set search_path to ''
as $function$
declare
  l private.login_links%rowtype;
  v_added integer := 0;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{36}$'
     or p_device is null or p_device = '' or length(p_device) > 200 then
    return json_build_object('ok', false);
  end if;

  select * into l
    from private.login_links
   where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
     and expires_at > now()
   for update;
  if l.token_hash is null then
    return json_build_object('ok', false);
  end if;

  update private.login_links
     set uses = uses + 1, last_used_at = now()
   where token_hash = l.token_hash;

  v_added := private.attach_device(l.tg_chat_id, p_device);

  insert into public.events (kind, device, code, source)
  values ('login_link', left(md5(p_device), 12), null,
          case when v_added > 0 then 'new' else 'known' end);

  return json_build_object('ok', true, 'memberships', private.memberships_of(l.tg_chat_id));
end;
$function$;

create table if not exists private.tg_login_requests (
  nonce_hash   text primary key,
  device       text not null,
  code         text,
  tg_chat_id   bigint,
  created_at   timestamptz not null default now(),
  confirmed_at timestamptz,
  finished_at  timestamptz
);
alter table private.tg_login_requests enable row level security;
create index if not exists tg_login_requests_device_idx on private.tg_login_requests (device, created_at);

-- عامة: يطلبها المتصفح عند ضغط «ادخل عبر تيليغرام».
create or replace function public.start_tg_login(p_device text, p_code text default null)
returns text
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_nonce text;
begin
  if p_device is null or p_device = '' or length(p_device) > 200 then
    return null;
  end if;

  delete from private.tg_login_requests where created_at < now() - interval '1 day';

  -- عشرة طلبات في الساعة للمتصفح الواحد تكفي أي استعمال طبيعي.
  if (select count(*) from private.tg_login_requests
       where device = p_device and created_at > now() - interval '1 hour') >= 10 then
    return null;
  end if;

  v_nonce := encode(extensions.gen_random_bytes(16), 'hex');
  insert into private.tg_login_requests (nonce_hash, device, code)
  values (encode(extensions.digest(v_nonce, 'sha256'), 'hex'), p_device,
          nullif(upper(left(trim(coalesce(p_code, '')), 8)), ''));
  return v_nonce;
end;
$function$;
revoke all on function public.start_tg_login(text, text) from public;
grant execute on function public.start_tg_login(text, text) to anon, authenticated, service_role;

-- للخادم فقط: يعرض البوت بها لمن سيُدخَل قبل التأكيد (p_confirm = false)،
-- ثم يثبّت الطلب عند الضغط على زر التأكيد (p_confirm = true).
create or replace function public.confirm_tg_login(p_nonce text, p_chat bigint, p_confirm boolean default true)
returns json
language plpgsql
security definer
set search_path to ''
as $function$
declare
  r private.tg_login_requests%rowtype;
  v_list json;
  v_name text;
  v_title text;
begin
  if p_nonce is null or p_nonce !~ '^[0-9a-f]{32}$' or p_chat is null then
    return json_build_object('ok', false, 'why', 'invalid');
  end if;

  select * into r
    from private.tg_login_requests
   where nonce_hash = encode(extensions.digest(p_nonce, 'sha256'), 'hex')
   for update;
  if r.nonce_hash is null or r.created_at < now() - interval '10 minutes' or r.finished_at is not null then
    return json_build_object('ok', false, 'why', 'expired');
  end if;
  if r.confirmed_at is not null and r.tg_chat_id is distinct from p_chat then
    return json_build_object('ok', false, 'why', 'expired');
  end if;

  v_list := private.memberships_of(p_chat);
  if json_array_length(v_list) = 0 then
    return json_build_object('ok', false, 'why', 'none');
  end if;

  -- الاسم والختمة اللذان طُلب الدخول إليهما، أو أول عضوية إن لم يكن الحساب فيها.
  select m.name, k.title into v_name, v_title
    from public.members m
    join public.khatmah k on k.id = m.khatmah_id
   where m.tg_chat_id = p_chat and m.left_at is null
   order by (k.code = r.code) desc, m.created_at
   limit 1;

  if p_confirm then
    update private.tg_login_requests
       set tg_chat_id = p_chat, confirmed_at = coalesce(confirmed_at, now())
     where nonce_hash = r.nonce_hash;
  end if;

  return json_build_object(
    'ok', true,
    'name', v_name,
    'title', v_title,
    'inKhatmah', r.code is null or exists (select 1 from json_array_elements(v_list) e where e->>'code' = r.code)
  );
end;
$function$;
revoke all on function public.confirm_tg_login(text, bigint, boolean) from public, anon, authenticated;
grant execute on function public.confirm_tg_login(text, bigint, boolean) to service_role;

-- عامة: يسألها المتصفح الذي طلب الدخول حتى يُؤكَّد طلبه.
create or replace function public.finish_tg_login(p_nonce text, p_device text)
returns json
language plpgsql
security definer
set search_path to ''
as $function$
declare
  r private.tg_login_requests%rowtype;
  v_added integer := 0;
begin
  if p_nonce is null or p_nonce !~ '^[0-9a-f]{32}$'
     or p_device is null or p_device = '' or length(p_device) > 200 then
    return json_build_object('ok', false);
  end if;

  select * into r
    from private.tg_login_requests
   where nonce_hash = encode(extensions.digest(p_nonce, 'sha256'), 'hex')
     and device = p_device
   for update;
  if r.nonce_hash is null or r.finished_at is not null
     or r.created_at < now() - interval '15 minutes' then
    return json_build_object('ok', false);
  end if;
  if r.confirmed_at is null then
    return json_build_object('ok', false, 'pending', true);
  end if;

  update private.tg_login_requests set finished_at = now() where nonce_hash = r.nonce_hash;
  v_added := private.attach_device(r.tg_chat_id, p_device);

  insert into public.events (kind, device, code, source)
  values ('tg_login', left(md5(p_device), 12), r.code,
          case when v_added > 0 then 'new' else 'known' end);

  return json_build_object('ok', true, 'memberships', private.memberships_of(r.tg_chat_id));
end;
$function$;
revoke all on function public.finish_tg_login(text, text) from public;
grant execute on function public.finish_tg_login(text, text) to anon, authenticated, service_role;

-- sign_in: الرفض يذكر هل صاحب الاسم مربوط بتيليغرام، فتعرض الواجهة الطريق المناسب.
CREATE OR REPLACE FUNCTION public.sign_in(p_code text, p_id text, p_name text, p_device text, p_org_code text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare k public.khatmah%rowtype; m public.members%rowtype; v_name text := left(trim(coalesce(p_name, '')), 80);
begin
  select * into k from public.khatmah where code = upper(trim(coalesce(p_code, '')));
  if k.id is null then return json_build_object('ok', false, 'error', 'لا توجد ختمة بهذا الرمز'); end if;
  if p_device is null or p_device = '' or length(p_device) > 200 then
    return json_build_object('ok', false, 'error', 'تعذّر التعرّف على الجهاز');
  end if;
  if coalesce(p_id, '') = '' or length(p_id) > 120 or v_name = '' then
    return json_build_object('ok', false, 'error', 'الاسم غير صالح');
  end if;
  if p_id = k.organizer_id then
    if not private.organizer_code_ok(k.id, p_org_code, p_device) then
      return json_build_object('ok', false, 'needCode', true);
    end if;
    select * into m from public.members where khatmah_id = k.id and mid = p_id;
    if m.mid is null then
      insert into public.members (khatmah_id, mid, name, device, devices)
      values (k.id, p_id, v_name, p_device, array[p_device]) returning * into m;
    else
      update public.members
         set device = p_device,
             devices = (select array(select distinct x from unnest(devices || array[device, p_device]) as x where coalesce(x, '') <> '')),
             left_at = null
       where khatmah_id = k.id and mid = p_id returning * into m;
    end if;
    return json_build_object('ok', true, 'id', m.mid, 'name', m.name, 'isOrganizer', true);
  end if;
  select * into m from public.members where khatmah_id = k.id and mid = p_id for update;
  if m.mid is null then
    if (select count(*) from public.members where khatmah_id = k.id) >= 300 then
      return json_build_object('ok', false, 'error', 'اكتمل عدد الأسماء في هذه الختمة');
    end if;
    insert into public.members (khatmah_id, mid, name, device, devices)
    values (k.id, p_id, v_name, p_device, array[p_device]) returning * into m;
    return json_build_object('ok', true, 'id', m.mid, 'name', m.name, 'isOrganizer', false);
  end if;
  if m.left_at is not null then
    update public.members set device = p_device, devices = array[p_device], name = v_name, left_at = null, exempt = false, name_open_permanently = false
     where khatmah_id = k.id and mid = p_id returning * into m;
    return json_build_object('ok', true, 'id', m.mid, 'name', m.name, 'isOrganizer', false);
  end if;
  if m.name_open_permanently then return json_build_object('ok', true, 'id', m.mid, 'name', m.name, 'isOrganizer', false); end if;
  if (m.device is null or m.device = '') and cardinality(m.devices) = 0 then
    update public.members set device = p_device, devices = array[p_device] where khatmah_id = k.id and mid = p_id returning * into m;
    return json_build_object('ok', true, 'id', m.mid, 'name', m.name, 'isOrganizer', false);
  end if;
  if m.device is distinct from p_device and not (p_device = any(m.devices)) then
    insert into public.events (kind, device, code, source)
    values ('name_taken', left(md5(p_device), 12), k.code,
            case when m.tg_chat_id is not null then 'linked' else 'unlinked' end);
    return json_build_object('ok', false, 'taken', true, 'name', m.name, 'linked', m.tg_chat_id is not null);
  end if;
  return json_build_object('ok', true, 'id', m.mid, 'name', m.name, 'isOrganizer', false);
end;
$function$;
