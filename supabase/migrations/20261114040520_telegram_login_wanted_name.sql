-- «ادخل عبر تيليغرام» من نافذة «هذا الاسم مسجَّل»: يُحفظ الاسم الذي طُلب الدخول به.
-- إن لم يكن حساب تيليغرام الذي فُتح هو صاحب ذلك الاسم، يقول البوت ذلك صراحة
-- («طُلب الدخول باسم هانية، وهذا الحساب مربوط باسم أيمن») بدل أن يعرض اسم الحساب
-- وحده فيلتبس الأمر. الدخول نفسه لم يتغير: يُدخَل المتصفح دائمًا بعضويات الحساب
-- الذي أكّد، لا بالاسم المطلوب.

alter table private.tg_login_requests add column if not exists wanted_id text;

drop function if exists public.start_tg_login(text, text);

create or replace function public.start_tg_login(p_device text, p_code text default null, p_id text default null)
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

  if (select count(*) from private.tg_login_requests
       where device = p_device and created_at > now() - interval '1 hour') >= 10 then
    return null;
  end if;

  v_nonce := encode(extensions.gen_random_bytes(16), 'hex');
  insert into private.tg_login_requests (nonce_hash, device, code, wanted_id)
  values (encode(extensions.digest(v_nonce, 'sha256'), 'hex'), p_device,
          nullif(upper(left(trim(coalesce(p_code, '')), 8)), ''),
          nullif(left(trim(coalesce(p_id, '')), 120), ''));
  return v_nonce;
end;
$function$;
revoke all on function public.start_tg_login(text, text, text) from public;
grant execute on function public.start_tg_login(text, text, text) to anon, authenticated, service_role;

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
  v_wanted text;
  v_match boolean := true;
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

  -- اسم الحساب في الختمة المطلوبة، أو أول عضوية له إن لم يكن فيها.
  select m.name, k.title into v_name, v_title
    from public.members m
    join public.khatmah k on k.id = m.khatmah_id
   where m.tg_chat_id = p_chat and m.left_at is null
   order by (k.code = r.code) desc, m.created_at
   limit 1;

  -- الاسم الذي طُلب الدخول به، وهل هو لهذا الحساب.
  if r.wanted_id is not null and r.code is not null then
    select m.name, (m.tg_chat_id is not distinct from p_chat) into v_wanted, v_match
      from public.members m
      join public.khatmah k on k.id = m.khatmah_id
     where k.code = r.code and m.mid = r.wanted_id and m.left_at is null;
    if v_wanted is null then v_match := true; end if;
  end if;

  if p_confirm then
    update private.tg_login_requests
       set tg_chat_id = p_chat, confirmed_at = coalesce(confirmed_at, now())
     where nonce_hash = r.nonce_hash;
  end if;

  return json_build_object(
    'ok', true,
    'name', v_name,
    'title', v_title,
    'wanted', case when v_match then null else v_wanted end,
    'inKhatmah', r.code is null or exists (select 1 from json_array_elements(v_list) e where e->>'code' = r.code)
  );
end;
$function$;
revoke all on function public.confirm_tg_login(text, bigint, boolean) from public, anon, authenticated;
grant execute on function public.confirm_tg_login(text, bigint, boolean) to service_role;
