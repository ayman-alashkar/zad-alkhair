-- رابط دخول شخصي في أزرار رسائل البوت.
--
-- على الآيفون لكل مكان يُفتح منه الموقع تخزين منفصل (متصفح واتساب الداخلي،
-- متصفح تيليغرام الداخلي، سفاري، التطبيق المثبّت)، فيظهر العضو للموقع كأنه
-- جهاز جديد ويُرفض اسمه. البوت يعرف لمن يرسل كل رسالة، فيضع في زر
-- «افتح زاد الخير» رمزًا يضيف المتصفح الذي فُتح منه إلى أجهزة العضو.
--
-- «الحساب» هنا هو members.tg_chat_id: كل عضوية نشطة تحمل المحادثة نفسها
-- تعود للشخص نفسه، فيُضاف المتصفح إليها كلها.
--
-- ويُسجَّل في events كل رفض باسم «هذا الاسم لصاحبه» (name_taken) وكل
-- استعمال لرابط الدخول (login_link)، لقياس المشكلة بالأرقام لا بالشكاوى.

create table if not exists private.login_links (
  token_hash   text primary key,
  tg_chat_id   bigint not null,
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null,
  uses         integer not null default 0,
  last_used_at timestamptz
);
alter table private.login_links enable row level security;
create index if not exists login_links_expires_at_idx on private.login_links (expires_at);

-- للخادم فقط: تستدعيها وظائف البوت قبل الإرسال.
create or replace function public.issue_login_link(p_chat bigint)
returns text
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_token text;
begin
  if p_chat is null then return null; end if;
  if not exists (
    select 1 from public.members
     where tg_chat_id = p_chat and left_at is null
  ) then
    return null;
  end if;

  -- تنظيف ما انتهت صلاحيته، فلا يحتاج الجدول مهمة دورية.
  delete from private.login_links where expires_at < now() - interval '1 day';

  v_token := encode(extensions.gen_random_bytes(18), 'hex');
  insert into private.login_links (token_hash, tg_chat_id, expires_at)
  values (encode(extensions.digest(v_token, 'sha256'), 'hex'), p_chat, now() + interval '7 days');
  return v_token;
end;
$function$;

revoke all on function public.issue_login_link(bigint) from public, anon, authenticated;
grant execute on function public.issue_login_link(bigint) to service_role;

-- عامة: تستدعيها الواجهة عند فتح رابط فيه ?login=
create or replace function public.redeem_login_link(p_token text, p_device text)
returns json
language plpgsql
security definer
set search_path to ''
as $function$
declare
  l private.login_links%rowtype;
  v_added integer := 0;
  v_list json;
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

  -- يُضاف المتصفح دون المساس بالجهاز الأساسي، ويُحتفظ بآخر ٢٠ جهازًا.
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
   where m.tg_chat_id = l.tg_chat_id
     and m.left_at is null
     and m.device is distinct from p_device
     and not (p_device = any(coalesce(m.devices, '{}'::text[])));
  get diagnostics v_added = row_count;

  insert into public.events (kind, device, code, source)
  values ('login_link', left(md5(p_device), 12), null,
          case when v_added > 0 then 'new' else 'known' end);

  select coalesce(json_agg(json_build_object('code', k.code, 'id', m.mid, 'name', m.name)
                           order by m.created_at), '[]'::json)
    into v_list
    from public.members m
    join public.khatmah k on k.id = m.khatmah_id
   where m.tg_chat_id = l.tg_chat_id
     and m.left_at is null;

  return json_build_object('ok', true, 'memberships', v_list);
end;
$function$;

revoke all on function public.redeem_login_link(text, text) from public;
grant execute on function public.redeem_login_link(text, text) to anon, authenticated, service_role;

-- sign_in كما هو منشور، مع تسجيل حالة الرفض فقط.
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
    return json_build_object('ok', false, 'taken', true, 'name', m.name);
  end if;
  return json_build_object('ok', true, 'id', m.mid, 'name', m.name, 'isOrganizer', false);
end;
$function$;
