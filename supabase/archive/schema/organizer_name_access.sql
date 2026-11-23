-- Organizer-controlled temporary workaround for browser-specific identities.
-- A permanently open name may be used by anyone with the name and khatmah link.
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS name_open_permanently boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public._member_device_ok(p_khatmah_id uuid, p_member_id text, p_device text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce(
    p_device is not null
    and p_device <> ''
    and exists (
      select 1
        from public.members m
       where m.khatmah_id = p_khatmah_id
         and m.mid = p_member_id
         and m.left_at is null
         and (m.name_open_permanently or m.device = p_device or p_device = any(m.devices))
    ),
    false
  );
$function$
;

CREATE OR REPLACE FUNCTION public.get_state(p_code text)
 RETURNS json
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select case when k.id is null then null else json_build_object(
    'publicId',        k.id::text,
    'code',            k.code,
    'title',           k.title,
    'dedication',      k.dedication,
    'endDate',         k.end_date,
    'reminderHour',    k.reminder_hour,
    'reminderMinute',  k.reminder_minute,
    'roundNo',         k.round_no,
    'accessType',      k.access_type,
    'organizerId',     k.organizer_id,
    'members', coalesce((select json_agg(json_build_object(
        'id', m.mid, 'name', m.name,
        'linked', m.tg_chat_id is not null,
        'locked', m.device is not null or cardinality(m.devices) > 0,
        'openPermanently', m.name_open_permanently,
        'exempt', m.exempt,
        'reminderHour', m.reminder_hour,
        'reminderMinute', m.reminder_minute)
        order by m.created_at)
      from public.members m
      where m.khatmah_id = k.id and m.left_at is null), '[]'::json),
    'juz', coalesce((select json_agg(json_build_object(
        'number', j.number, 'ownerId', j.owner_id, 'status', j.status)
        order by j.number) from public.juz j where j.khatmah_id = k.id), '[]'::json)
  ) end
  from (select * from public.khatmah where code = upper(trim(p_code))) k;
$function$
;

CREATE OR REPLACE FUNCTION public.release_name(p_code text, p_org_code text, p_id text, p_device text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  k public.khatmah%rowtype;
  upd integer := 0;
begin
  select * into k
    from public.khatmah
   where code = upper(trim(coalesce(p_code, '')));

  if k.id is null or not public._organizer_device_ok(k.id, p_org_code, p_device) then
    return json_build_object('ok', false, 'error', 'رمز المشرف أو جهازه غير صحيح');
  end if;

  if p_id = k.organizer_id then
    return json_build_object('ok', false, 'error', 'لا يُفك قفل المنظّم من هنا');
  end if;

  update public.members
     set device = null,
         devices = '{}'::text[],
         name_open_permanently = false
   where khatmah_id = k.id
     and mid = p_id
     and left_at is null;
  get diagnostics upd = row_count;

  if upd = 0 then
    return json_build_object('ok', false, 'error', 'المشارك غير موجود');
  end if;

  return json_build_object('ok', true);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.sign_in(p_code text, p_id text, p_name text, p_device text, p_org_code text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  k public.khatmah%rowtype;
  m public.members%rowtype;
begin
  select * into k from public.khatmah where code = upper(trim(coalesce(p_code, '')));
  if k.id is null then
    return json_build_object('ok', false, 'error', 'لا توجد ختمة بهذا الرمز');
  end if;
  if p_device is null or p_device = '' then
    return json_build_object('ok', false, 'error', 'تعذّر التعرّف على الجهاز');
  end if;

  -- المشرف يُعرَف برمزه لا بجهازه، فله أن يعمل من عدّة أجهزة
  if p_id = k.organizer_id then
    if p_org_code is null or p_org_code <> k.organizer_code then
      return json_build_object('ok', false, 'needCode', true);
    end if;
    select * into m from public.members where khatmah_id = k.id and mid = p_id;
    if m.mid is null then
      insert into public.members (khatmah_id, mid, name, device, devices)
      values (k.id, p_id, p_name, p_device, array[p_device]) returning * into m;
    else
      update public.members
         set device  = p_device,
             devices = (select array(select distinct unnest(devices || p_device))),
             left_at = null
       where khatmah_id = k.id and mid = p_id
      returning * into m;
    end if;
    return json_build_object('ok', true, 'id', m.mid, 'name', m.name, 'isOrganizer', true);
  end if;

  select * into m from public.members where khatmah_id = k.id and mid = p_id for update;

  if m.mid is null then
    insert into public.members (khatmah_id, mid, name, device, devices)
    values (k.id, p_id, p_name, p_device, array[p_device]) returning * into m;
    return json_build_object('ok', true, 'id', m.mid, 'name', m.name, 'isOrganizer', false);
  end if;

  -- من غادر: اسمه صار حرًّا، فيملكه أوّل من يدخل به
  if m.left_at is not null then
    update public.members
       set device = p_device, devices = array[p_device],
           name = p_name, left_at = null, exempt = false, name_open_permanently = false
     where khatmah_id = k.id and mid = p_id
    returning * into m;
    return json_build_object('ok', true, 'id', m.mid, 'name', m.name, 'isOrganizer', false);
  end if;

  -- An open name can be used from any browser without replacing trusted devices.
  if m.name_open_permanently then
    return json_build_object('ok', true, 'id', m.mid, 'name', m.name, 'isOrganizer', false);
  end if;

  -- اسم قديم بلا جهاز: يملكه أوّل من يدخل به بعد الآن
  if (m.device is null or m.device = '') and cardinality(m.devices) = 0 then
    update public.members
       set device = p_device, devices = array[p_device]
     where khatmah_id = k.id and mid = p_id
    returning * into m;
    return json_build_object('ok', true, 'id', m.mid, 'name', m.name, 'isOrganizer', false);
  end if;

  if m.device is distinct from p_device and not (p_device = any(m.devices)) then
    return json_build_object('ok', false, 'taken', true, 'name', m.name);
  end if;

  return json_build_object('ok', true, 'id', m.mid, 'name', m.name, 'isOrganizer', false);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.set_name_access(p_code text, p_org_code text, p_id text, p_device text, p_mode text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE k public.khatmah%rowtype; n integer;
BEGIN
  SELECT * INTO k FROM public.khatmah WHERE code = upper(trim(coalesce(p_code, '')));
  IF k.id IS NULL OR NOT public._organizer_device_ok(k.id, p_org_code, p_device) THEN
    RETURN json_build_object('ok', false, 'error', 'رمز المشرف أو جهازه غير صحيح');
  END IF;
  IF p_id = k.organizer_id THEN
    RETURN json_build_object('ok', false, 'error', 'لا يُفك قفل المنظّم من هنا');
  END IF;
  IF p_mode = 'once' THEN
    RETURN public.release_name(p_code, p_org_code, p_id, p_device);
  ELSIF p_mode NOT IN ('open', 'lock') OR p_mode IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'خيار غير صحيح');
  END IF;
  IF p_mode = 'lock' AND EXISTS (SELECT 1 FROM public.members WHERE khatmah_id = k.id AND mid = p_id AND left_at IS NULL AND (device IS NULL OR device = '') AND cardinality(devices) = 0) THEN
    RETURN json_build_object('ok', false, 'error', 'لا توجد أجهزة محمية سابقة؛ اختر الفتح لمرة واحدة ليُقفل الاسم على جهاز صاحبه');
  END IF;
  UPDATE public.members SET name_open_permanently = (p_mode = 'open')
   WHERE khatmah_id = k.id AND mid = p_id AND left_at IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n = 0 THEN RETURN json_build_object('ok', false, 'error', 'المشارك غير موجود'); END IF;
  RETURN json_build_object('ok', true);
END;
$fn$;
REVOKE ALL ON FUNCTION public.set_name_access(text,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_name_access(text,text,text,text,text) TO anon, authenticated, service_role;
