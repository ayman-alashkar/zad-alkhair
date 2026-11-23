-- إيقاف «الفتح الدائم» للأسماء بعد أسبوع من المراقبة (٢١ نوفمبر ٢٠٢٦).
--
-- كان ترقيعًا لمشكلة الآيفون (متصفح جديد يُرفض اسمه): يدخل أي أحد بالاسم من أي
-- متصفح. صار للمربوط بتيليغرام طريقان لا يحتاجان المنظّم (رابط الدخول في رسائل
-- البوت، و«ادخل عبر تيليغرام»)، ولغيره «الفتح لمرة واحدة». لا اسم مفتوحًا اليوم.
--
-- set_name_access ترفض الوضع 'open' وتبقي 'once' و'lock'، و_member_device_ok
-- وsign_in لا تقبلان الاسم المفتوح بعد الآن. العمود name_open_permanently باقٍ
-- (ما زالت get_state تعيده) حتى تُحذف بقاياه من الواجهة في جولة لاحقة.

update public.members set name_open_permanently = false where name_open_permanently;

CREATE OR REPLACE FUNCTION public.set_name_access(p_code text, p_org_code text, p_id text, p_device text, p_mode text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  ELSIF p_mode = 'open' THEN
    RETURN json_build_object('ok', false, 'error', 'الفتح الدائم لم يعد متاحًا. افتح الاسم لمرة واحدة، أو ليدخل صاحبه عبر تيليغرام');
  ELSIF p_mode IS DISTINCT FROM 'lock' THEN
    RETURN json_build_object('ok', false, 'error', 'خيار غير صحيح');
  END IF;
  UPDATE public.members SET name_open_permanently = false
   WHERE khatmah_id = k.id AND mid = p_id AND left_at IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n = 0 THEN RETURN json_build_object('ok', false, 'error', 'المشارك غير موجود'); END IF;
  RETURN json_build_object('ok', true);
END;
$function$;

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
         and (m.device = p_device or p_device = any(m.devices))
    ),
    false
  );
$function$;

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
