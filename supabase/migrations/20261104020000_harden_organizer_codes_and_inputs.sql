-- تقوية صلاحيات المشرف وحدود المدخلات (٤ نوفمبر ٢٠٢٦)
--
-- ١) رمز المشرف يُخزَّن مجزّأً (bcrypt). بعد ١٠ محاولات خاطئة خلال ساعة يُقفل الدخول
--    بالرمز ساعة كاملة، إلا من أجهزة المشرف المعروفة، فلا يستطيع المهاجم طرد المشرف
--    الحقيقي بإفشال المحاولات. الحد الأدنى للرمز الجديد ٦ محارف، والرموز الحالية
--    تبقى صالحة بعد تجزئتها. الجهاز الرئيسي السابق للمشرف يبقى في قائمة أجهزته.
-- ٢) gen_code يقبل الطول، والافتراضي يبقى ٤ حتى تُنشر واجهة تقبل الرموز الأطول.
--    log_event لم يعد يقصّ الرمز إلى ٤ محارف.
-- ٣) حدود الاسم والمعرّف والجهاز في sign_in، و٣٠٠ اسم للختمة، وتاريخ الانتهاء بين
--    أمس وثلاث سنوات (إلا إن بقي كما هو في الإعدادات)، وسقف ٢٠ ختمة جديدة في الساعة.
--    assign_juz وset_exempt لا يقبلان من غادر الختمة. رمز المشرف لا يُفحص في
--    release_juz/set_done إلا لمن هو المشرف فعلًا.
--
-- اختُبر النص نفسه على الإنتاج داخل معاملة أُلغيت: supabase/tests/20261104_harden_organizer_codes.sql
-- نسخة الاسترجاع حُذفت لاحقًا: 20261104021600_drop_20261104_rollback_copies.sql

create table private.backup_20261104_functions as
  select p.oid::regprocedure::text as signature, pg_get_functiondef(p.oid) as definition
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.prokind = 'f';
create table private.backup_20261104_organizer_codes as select id, organizer_code from public.khatmah;
alter table private.backup_20261104_functions enable row level security;
alter table private.backup_20261104_organizer_codes enable row level security;
revoke all on private.backup_20261104_functions, private.backup_20261104_organizer_codes from public, anon, authenticated;

create table private.organizer_code_attempts (
  khatmah_id uuid primary key references public.khatmah(id) on delete cascade,
  failures integer not null default 0,
  window_started_at timestamptz not null default now(),
  locked_until timestamptz
);
alter table private.organizer_code_attempts enable row level security;
revoke all on private.organizer_code_attempts from public, anon, authenticated;

create function private.hash_organizer_code(p_code text)
returns text language sql volatile security definer set search_path = ''
as $$ select extensions.crypt(p_code, extensions.gen_salt('bf', 8)); $$;

create function private.organizer_code_ok(p_khatmah_id uuid, p_org_code text, p_device text)
returns boolean language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_hash text; v_trusted boolean; a private.organizer_code_attempts%rowtype;
  v_failures integer; v_window timestamptz;
begin
  if p_org_code is null or p_org_code = '' or length(p_org_code) > 200 then return false; end if;
  select k.organizer_code into v_hash from public.khatmah k where k.id = p_khatmah_id;
  if v_hash is null then return false; end if;
  select * into a from private.organizer_code_attempts where khatmah_id = p_khatmah_id for update;
  if a.locked_until is not null and a.locked_until > now() then
    select exists (
      select 1 from public.khatmah k
        join public.members m on m.khatmah_id = k.id and m.mid = k.organizer_id
       where k.id = p_khatmah_id and m.left_at is null
         and coalesce(p_device, '') <> ''
         and (m.device = p_device or p_device = any(m.devices))
    ) into v_trusted;
    if not v_trusted then return false; end if;
  end if;
  if v_hash = extensions.crypt(p_org_code, v_hash) then
    if a.khatmah_id is not null and (a.failures > 0 or a.locked_until is not null) then
      update private.organizer_code_attempts set failures = 0, locked_until = null, window_started_at = now()
       where khatmah_id = p_khatmah_id;
    end if;
    return true;
  end if;
  if a.khatmah_id is null or a.window_started_at < now() - interval '1 hour' then
    v_failures := 1; v_window := now();
  else
    v_failures := a.failures + 1; v_window := a.window_started_at;
  end if;
  insert into private.organizer_code_attempts as t (khatmah_id, failures, window_started_at, locked_until)
  values (p_khatmah_id, v_failures, v_window, case when v_failures >= 10 then now() + interval '1 hour' else a.locked_until end)
  on conflict (khatmah_id) do update
     set failures = excluded.failures, window_started_at = excluded.window_started_at, locked_until = excluded.locked_until;
  return false;
end;
$$;
revoke all on function private.hash_organizer_code(text) from public, anon, authenticated;
revoke all on function private.organizer_code_ok(uuid, text, text) from public, anon, authenticated;

update public.members m
   set devices = (select array(select distinct x from unnest(m.devices || array[m.device]) as x where coalesce(x, '') <> ''))
  from public.khatmah k
 where k.id = m.khatmah_id and k.organizer_id = m.mid
   and coalesce(m.device, '') <> '' and not (m.device = any(m.devices));

update public.khatmah set organizer_code = private.hash_organizer_code(organizer_code)
 where organizer_code is not null and organizer_code !~ '^\$2[abxy]\$';

create or replace function public._organizer_device_ok(p_khatmah_id uuid, p_org_code text, p_device text)
returns boolean language plpgsql volatile security definer set search_path = public
as $$
begin
  if coalesce(p_org_code, '') = '' then return false; end if;
  if not exists (
    select 1 from public.khatmah k join public.members m on m.khatmah_id = k.id and m.mid = k.organizer_id
     where k.id = p_khatmah_id and m.left_at is null
  ) then return false; end if;
  return private.organizer_code_ok(p_khatmah_id, p_org_code, p_device);
end;
$$;

drop function public.gen_code();
create function public.gen_code(p_len integer default 4)
returns text language plpgsql security definer set search_path = public
as $$
declare a text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; c text; i int;
begin
  if p_len not between 4 and 8 then raise exception 'invalid code length'; end if;
  loop
    c := '';
    for i in 1..p_len loop c := c || substr(a, 1 + floor(random() * length(a))::int, 1); end loop;
    exit when not exists (select 1 from public.khatmah where code = c);
  end loop;
  return c;
end $$;
revoke all on function public.gen_code(integer) from public, anon, authenticated;

create or replace function public.log_event(p_kind text, p_device text default null::text, p_code text default null::text, p_source text default null::text)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if p_kind not in ('open','install','read_click','join','claim','done','share') then return; end if;
  insert into events (kind, device, code, source) values (p_kind, left(p_device, 64), upper(left(p_code, 8)), left(p_source, 16));
end $$;

create or replace function public.create_khatmah(p_title text, p_dedication text, p_end date, p_hour integer, p_minute integer, p_org_id text, p_org_name text, p_org_code text, p_device text, p_access_type text)
returns json language plpgsql security definer set search_path = public
as $$
declare
  v_id uuid; v_code text;
  v_access text := lower(coalesce(trim(p_access_type), 'private'));
  v_device text := coalesce(trim(p_device), '');
  v_org_code text := trim(coalesce(p_org_code, ''));
  v_device_key text; v_recent integer; v_recent_all integer;
begin
  if v_org_code = '' or coalesce(trim(p_org_id), '') = '' or coalesce(trim(p_org_name), '') = '' or v_device = '' then
    return json_build_object('ok', false, 'error', 'بيانات المنظّم ناقصة');
  end if;
  if length(v_device) > 200 or length(trim(p_org_id)) > 120 then
    return json_build_object('ok', false, 'error', 'بيانات المنظّم غير صالحة');
  end if;
  if length(v_org_code) < 6 or length(v_org_code) > 64 then
    return json_build_object('ok', false, 'error', 'رمز المنظّم ستة محارف فأكثر');
  end if;
  if p_end is null or p_hour not between 0 and 23 or p_minute not between 0 and 59 then
    return json_build_object('ok', false, 'error', 'الإعدادات غير صالحة');
  end if;
  if p_end < current_date - 1 or p_end > current_date + interval '3 years' then
    return json_build_object('ok', false, 'error', 'تاريخ الانتهاء خارج المدى المسموح');
  end if;
  if v_access not in ('private', 'public') then
    return json_build_object('ok', false, 'error', 'نوع الختمة غير صالح');
  end if;
  v_device_key := md5(v_device);
  perform pg_advisory_xact_lock(hashtextextended('zad-create:global', 0));
  delete from public.khatmah_creation_log where created_at < now() - interval '2 days';
  select count(*) into v_recent from public.khatmah_creation_log where device_key = v_device_key and created_at >= now() - interval '24 hours';
  if v_recent >= 3 then
    return json_build_object('ok', false, 'error', 'يمكن إنشاء ثلاث ختمات فقط خلال ٢٤ ساعة من هذا الجهاز');
  end if;
  select count(*) into v_recent_all from public.khatmah_creation_log where created_at >= now() - interval '1 hour';
  if v_recent_all >= 20 then
    return json_build_object('ok', false, 'error', 'أُنشئت ختمات كثيرة في هذه الساعة، حاول بعد قليل');
  end if;
  v_code := public.gen_code();
  insert into public.khatmah(code, title, dedication, end_date, reminder_hour, reminder_minute, organizer_id, organizer_code, access_type)
  values (v_code, coalesce(nullif(left(trim(p_title), 120), ''), 'زاد الخير'), left(coalesce(p_dedication, ''), 500),
    p_end, p_hour, p_minute, trim(p_org_id), private.hash_organizer_code(v_org_code), v_access)
  returning id into v_id;
  insert into public.members(khatmah_id, mid, name, device, devices) values (v_id, trim(p_org_id), left(trim(p_org_name), 120), v_device, array[v_device]);
  insert into public.juz(khatmah_id, number) select v_id, generate_series(1, 30);
  insert into public.khatmah_creation_log(device_key) values (v_device_key);
  return json_build_object('ok', true, 'code', v_code, 'accessType', v_access);
end;
$$;

create or replace function public.sign_in(p_code text, p_id text, p_name text, p_device text, p_org_code text default null::text)
returns json language plpgsql security definer set search_path = public
as $$
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
    return json_build_object('ok', false, 'taken', true, 'name', m.name);
  end if;
  return json_build_object('ok', true, 'id', m.mid, 'name', m.name, 'isOrganizer', false);
end;
$$;

create or replace function public.change_organizer_code(p_code text, p_org_code text, p_device text, p_new_code text)
returns json language plpgsql security definer set search_path = public
as $$
declare k public.khatmah%rowtype; v_new text := trim(coalesce(p_new_code, ''));
begin
  select * into k from public.khatmah where code = upper(trim(coalesce(p_code, '')));
  if k.id is null then return json_build_object('ok', false, 'error', 'لا توجد ختمة بهذا الرمز'); end if;
  if not public._organizer_device_ok(k.id, p_org_code, p_device) then return json_build_object('ok', false, 'error', 'رمز المشرف أو جهازه غير صحيح'); end if;
  if length(v_new) < 6 or length(v_new) > 64 then return json_build_object('ok', false, 'error', 'الرمز الجديد ستة محارف فأكثر'); end if;
  if v_new = trim(coalesce(p_org_code, '')) then return json_build_object('ok', false, 'error', 'هذا هو الرمز الحالي'); end if;
  update public.khatmah set organizer_code = private.hash_organizer_code(v_new) where id = k.id;
  delete from private.organizer_code_attempts where khatmah_id = k.id;
  return json_build_object('ok', true);
end;
$$;

create or replace function public.transfer_organizer(p_code text, p_org_code text, p_device text, p_to text, p_new_code text)
returns json language plpgsql security definer set search_path = public
as $$
declare k public.khatmah%rowtype; m public.members%rowtype; v_new text := trim(coalesce(p_new_code, ''));
begin
  select * into k from public.khatmah where code = upper(trim(coalesce(p_code, '')));
  if k.id is null then return json_build_object('ok', false, 'error', 'لا توجد ختمة بهذا الرمز'); end if;
  if not public._organizer_device_ok(k.id, p_org_code, p_device) then return json_build_object('ok', false, 'error', 'رمز المشرف أو جهازه غير صحيح'); end if;
  if length(v_new) < 6 or length(v_new) > 64 then return json_build_object('ok', false, 'error', 'اختر رمزًا للمشرف الجديد، ستة محارف فأكثر'); end if;
  select * into m from public.members where khatmah_id = k.id and mid = p_to and left_at is null;
  if m.mid is null then return json_build_object('ok', false, 'error', 'لا يوجد مشارك بهذا الاسم'); end if;
  if m.mid = k.organizer_id then return json_build_object('ok', false, 'error', 'هو المشرف الحالي'); end if;
  update public.khatmah set organizer_id = m.mid, organizer_code = private.hash_organizer_code(v_new) where id = k.id;
  delete from private.organizer_code_attempts where khatmah_id = k.id;
  return json_build_object('ok', true, 'name', m.name, 'id', m.mid);
end;
$$;

create or replace function public.update_settings(p_code text, p_org_code text, p_title text, p_dedication text, p_end date, p_hour integer, p_minute integer, p_device text, p_access_type text)
returns json language plpgsql security definer set search_path = public
as $$
declare k public.khatmah%rowtype;
begin
  select * into k from public.khatmah where code = upper(trim(p_code));
  if k.id is null or not public._organizer_device_ok(k.id, p_org_code, p_device) then return json_build_object('ok', false, 'error', 'الرمز أو الجهاز غير صحيح'); end if;
  if p_end is null or p_hour not between 0 and 23 or p_minute not between 0 and 59 or lower(coalesce(trim(p_access_type), '')) not in ('private', 'public') then
    return json_build_object('ok', false, 'error', 'الإعدادات غير صالحة');
  end if;
  if p_end is distinct from k.end_date and (p_end < current_date - 1 or p_end > current_date + interval '3 years') then
    return json_build_object('ok', false, 'error', 'تاريخ الانتهاء خارج المدى المسموح');
  end if;
  update public.khatmah set title = coalesce(nullif(left(trim(p_title), 120), ''), title), dedication = left(coalesce(p_dedication, dedication), 500),
         end_date = p_end, reminder_hour = p_hour, reminder_minute = p_minute, access_type = lower(trim(p_access_type)) where id = k.id;
  return json_build_object('ok', true);
end;
$$;

create or replace function public.release_juz(p_code text, p_id text, p_num integer, p_org_code text, p_device text)
returns json language plpgsql security definer set search_path = public
as $$
declare k public.khatmah%rowtype; is_org boolean; is_self boolean; upd integer;
begin
  select * into k from public.khatmah where code = upper(trim(p_code));
  if k.id is null then return json_build_object('ok', false, 'error', 'ختمة غير موجودة'); end if;
  is_self := public._member_device_ok(k.id, p_id, p_device);
  if not is_self then return json_build_object('ok', false, 'error', 'هذا الحساب مقفول على جهاز صاحبه'); end if;
  is_org := case when p_id = k.organizer_id then public._organizer_device_ok(k.id, p_org_code, p_device) else false end;
  update public.juz set owner_id = null, status = 'free', done_at = null
   where khatmah_id = k.id and number = p_num and (owner_id = p_id or is_org) and status <> 'done';
  get diagnostics upd = row_count;
  if upd = 0 then return json_build_object('ok', false, 'error', 'لا تملك صلاحية تحرير هذا الجزء'); end if;
  return json_build_object('ok', true);
end;
$$;

create or replace function public.set_done(p_code text, p_id text, p_num integer, p_done boolean, p_org_code text, p_device text)
returns json language plpgsql security definer set search_path = public
as $$
declare k public.khatmah%rowtype; is_org boolean; owner text; current_status text;
begin
  select * into k from public.khatmah where code = upper(trim(p_code)) for update;
  if k.id is null then return json_build_object('ok', false, 'error', 'ختمة غير موجودة'); end if;
  if not public._member_device_ok(k.id, p_id, p_device) then return json_build_object('ok', false, 'error', 'هذا الحساب مقفول على جهاز صاحبه'); end if;
  select owner_id, status into owner, current_status from public.juz where khatmah_id = k.id and number = p_num;
  if owner is null then return json_build_object('ok', false, 'error', 'الجزء غير محجوز'); end if;
  is_org := case when owner <> p_id and p_id = k.organizer_id then public._organizer_device_ok(k.id, p_org_code, p_device) else false end;
  if owner <> p_id and not is_org then return json_build_object('ok', false, 'error', 'صاحب الجزء وحده يعدّل حالته'); end if;
  if p_done and current_status = 'done' then
    insert into public.reading_history(khatmah_id, round_no, member_id, juz_number, completed_at)
    values (k.id, k.round_no, owner, p_num, coalesce((select done_at from public.juz where khatmah_id = k.id and number = p_num), now()))
    on conflict (khatmah_id, round_no, member_id, juz_number) do nothing;
    return json_build_object('ok', true, 'ownerId', owner);
  end if;
  if not p_done and current_status = 'taken' then
    delete from public.reading_history where khatmah_id = k.id and round_no = k.round_no and member_id = owner and juz_number = p_num;
    return json_build_object('ok', true, 'ownerId', owner);
  end if;
  update public.juz set status = case when p_done then 'done' else 'taken' end, done_at = case when p_done then now() else null end
   where khatmah_id = k.id and number = p_num;
  if p_done then
    insert into public.reading_history(khatmah_id, round_no, member_id, juz_number, completed_at) values (k.id, k.round_no, owner, p_num, now())
    on conflict (khatmah_id, round_no, member_id, juz_number) do update set completed_at = excluded.completed_at;
  else
    delete from public.reading_history where khatmah_id = k.id and round_no = k.round_no and member_id = owner and juz_number = p_num;
  end if;
  return json_build_object('ok', true, 'ownerId', owner);
end;
$$;

create or replace function public.assign_juz(p_code text, p_org_code text, p_num integer, p_to text, p_device text)
returns json language plpgsql security definer set search_path = public
as $$
declare k public.khatmah%rowtype; m public.members%rowtype; st text;
begin
  select * into k from public.khatmah where code = upper(trim(p_code));
  if k.id is null or not public._organizer_device_ok(k.id, p_org_code, p_device) then return json_build_object('ok', false, 'error', 'الرمز أو الجهاز غير صحيح'); end if;
  select * into m from public.members where khatmah_id = k.id and mid = p_to and left_at is null;
  if m.mid is null then return json_build_object('ok', false, 'error', 'المشارك غير موجود'); end if;
  select status into st from public.juz where khatmah_id = k.id and number = p_num;
  if st is null then return json_build_object('ok', false, 'error', 'الجزء غير موجود'); end if;
  if st = 'done' then return json_build_object('ok', false, 'error', 'الجزء تمّت قراءته'); end if;
  update public.juz set owner_id = p_to, status = 'taken', done_at = null where khatmah_id = k.id and number = p_num;
  return json_build_object('ok', true, 'name', m.name, 'linked', m.tg_chat_id is not null);
end;
$$;

create or replace function public.set_exempt(p_code text, p_org_code text, p_id text, p_on boolean, p_device text)
returns json language plpgsql security definer set search_path = public
as $$
declare k public.khatmah%rowtype; upd int;
begin
  select * into k from public.khatmah where code = upper(trim(p_code));
  if k.id is null or not public._organizer_device_ok(k.id, p_org_code, p_device) then return json_build_object('ok', false, 'error', 'الرمز أو الجهاز غير صحيح'); end if;
  if p_id = k.organizer_id then return json_build_object('ok', false, 'error', 'المشرف يلزمه تفعيل التذكير'); end if;
  update public.members set exempt = p_on where khatmah_id = k.id and mid = p_id and left_at is null;
  get diagnostics upd = row_count;
  return json_build_object('ok', upd > 0);
end;
$$;
