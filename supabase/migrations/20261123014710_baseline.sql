-- زاد الخير: أساس قاعدة البيانات
--
-- هذا الملف يصف قاعدة الإنتاج كما هي في ٢٣ نوفمبر ٢٠٢٦، بعد الترحيل
-- 20261123014710_retire_domain_migration_leftovers. يحمل رقمه نفسه، فلا يُطبَّق
-- على الإنتاج أبدًا؛ الإنتاج مطابق له أصلًا. يُطبَّق على قاعدة فارغة (اختبار أو
-- استعادة)، ثم تأتي بعده الترحيلات الجديدة فقط.
--
-- السجل القديم محفوظ للتاريخ في supabase/archive/migrations ولا يُشغَّل.
-- مهام cron وسر vault إعداد للإنتاج وحده: supabase/setup/production.sql.
-- يُتحقق من مطابقته للإنتاج بـ supabase/checks/fingerprint.sql.

set check_function_bodies = off;
set client_min_messages = warning;

create extension if not exists pgcrypto with schema extensions;
create extension if not exists "uuid-ossp" with schema extensions;
create extension if not exists pg_net with schema extensions;

create schema if not exists private;
revoke all on schema private from public;

-- ---------------------------------------------------------------------------
-- الجداول
-- ---------------------------------------------------------------------------
create table public.khatmah (
  id uuid default gen_random_uuid() not null,
  code text not null,
  title text not null,
  dedication text default ''::text not null,
  end_date date not null,
  reminder_hour integer default 20 not null,
  organizer_id text not null,
  organizer_code text not null,
  created_at timestamp with time zone default now() not null,
  reminder_minute integer default 0 not null,
  round_no integer default 1 not null,
  access_type text default 'private'::text not null,
  constraint khatmah_code_key UNIQUE (code),
  constraint khatmah_pkey PRIMARY KEY (id),
  constraint khatmah_access_type_check CHECK ((access_type = ANY (ARRAY['private'::text, 'public'::text]))),
  constraint khatmah_reminder_hour_check CHECK (((reminder_hour >= 0) AND (reminder_hour <= 23))),
  constraint khatmah_reminder_minute_check CHECK (((reminder_minute >= 0) AND (reminder_minute <= 59)))
);

create table public.members (
  khatmah_id uuid not null,
  mid text not null,
  name text not null,
  tg_chat_id bigint,
  link_code text,
  created_at timestamp with time zone default now() not null,
  device text,
  exempt boolean default false not null,
  link_at timestamp with time zone,
  left_at timestamp with time zone,
  devices text[] default '{}'::text[] not null,
  reminder_hour smallint,
  reminder_minute smallint,
  name_open_permanently boolean default false not null,
  constraint members_link_code_key UNIQUE (link_code),
  constraint members_pkey PRIMARY KEY (khatmah_id, mid),
  constraint members_reminder_hour_check CHECK (((reminder_hour IS NULL) OR ((reminder_hour >= 0) AND (reminder_hour <= 23)))),
  constraint members_reminder_minute_check CHECK (((reminder_minute IS NULL) OR ((reminder_minute >= 0) AND (reminder_minute <= 59))))
);

create table public.juz (
  khatmah_id uuid not null,
  number integer not null,
  owner_id text,
  status text default 'free'::text not null,
  done_at timestamp with time zone,
  constraint juz_pkey PRIMARY KEY (khatmah_id, number),
  constraint juz_number_check CHECK (((number >= 1) AND (number <= 30))),
  constraint juz_status_check CHECK ((status = ANY (ARRAY['free'::text, 'taken'::text, 'done'::text])))
);

create table public.reading_history (
  khatmah_id uuid not null,
  round_no integer not null,
  member_id text not null,
  juz_number integer not null,
  completed_at timestamp with time zone default now() not null,
  constraint reading_history_pkey PRIMARY KEY (khatmah_id, round_no, member_id, juz_number),
  constraint reading_history_juz_number_check CHECK (((juz_number >= 1) AND (juz_number <= 30))),
  constraint reading_history_round_no_check CHECK ((round_no > 0))
);

create table public.round_requests (
  khatmah_id uuid not null,
  request_key text not null,
  round_no integer not null,
  created_at timestamp with time zone default now() not null,
  constraint round_requests_pkey PRIMARY KEY (khatmah_id, request_key)
);

create table public.notification_deliveries (
  id uuid default gen_random_uuid() not null,
  khatmah_id uuid not null,
  round_no integer not null,
  kind text not null,
  recipient text not null,
  reference text default ''::text not null,
  chat_id bigint not null,
  status text default 'pending'::text not null,
  attempts integer default 0 not null,
  claimed_at timestamp with time zone,
  sent_at timestamp with time zone,
  created_at timestamp with time zone default now() not null,
  constraint notification_deliveries_dedupe UNIQUE (kind, khatmah_id, round_no, recipient, reference),
  constraint notification_deliveries_pkey PRIMARY KEY (id),
  constraint notification_deliveries_kind_check CHECK ((kind = ANY (ARRAY['done_part'::text, 'done_khatmah'::text, 'new_round'::text, 'reminder'::text]))),
  constraint notification_deliveries_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'sent'::text, 'permanent_failed'::text])))
);

create table public.share_pending (
  id uuid default gen_random_uuid() not null,
  khatmah_id uuid not null,
  author_chat bigint not null,
  juz integer not null,
  text text not null,
  created_at timestamp with time zone default now() not null,
  constraint share_pending_pkey PRIMARY KEY (id)
);

create table public.share_wait (
  chat_id bigint not null,
  khatmah_id uuid not null,
  mid text not null,
  juz integer not null,
  draft text,
  created_at timestamp with time zone default now() not null,
  constraint share_wait_pkey PRIMARY KEY (chat_id)
);

create table public.khatmah_creation_log (
  id bigint generated always as identity not null,
  device_key text not null,
  created_at timestamp with time zone default now() not null,
  constraint khatmah_creation_log_pkey PRIMARY KEY (id),
  constraint khatmah_creation_log_device_key_check CHECK ((char_length(device_key) = 32))
);

create sequence public.events_id_seq;
create table public.events (
  id bigint default nextval('public.events_id_seq'::regclass) not null,
  kind text not null,
  device text,
  code text,
  source text,
  at timestamp with time zone default now() not null,
  constraint events_pkey PRIMARY KEY (id)
);
alter sequence public.events_id_seq owned by public.events.id;

create table public.pwa_installs (
  device_id uuid not null,
  platform text default 'other'::text not null,
  first_seen_at timestamp with time zone default now() not null,
  install_accepted_at timestamp with time zone,
  first_standalone_at timestamp with time zone,
  last_seen_at timestamp with time zone default now() not null,
  app_version text,
  constraint pwa_installs_pkey PRIMARY KEY (device_id),
  constraint pwa_installs_platform_check CHECK ((platform = ANY (ARRAY['android'::text, 'ios'::text, 'desktop'::text, 'other'::text])))
);

create table public.usage_daily (
  device_id uuid not null,
  day date not null,
  platform text default 'other'::text not null,
  installed boolean default false not null,
  home integer default 0 not null,
  prayer integer default 0 not null,
  khatmahs integer default 0 not null,
  adhkar integer default 0 not null,
  quran integer default 0 not null,
  reader integer default 0 not null,
  listen integer default 0 not null,
  listen_seconds integer default 0 not null,
  tayassar_seconds integer default 0 not null,
  updated_at timestamp with time zone default now() not null,
  tz text,
  bot text,
  persisted boolean,
  storage_reset integer default 0 not null,
  pack_fresh integer default 0 not null,
  constraint usage_daily_pkey PRIMARY KEY (device_id, day),
  constraint usage_daily_platform_check CHECK ((platform = ANY (ARRAY['android'::text, 'ios'::text, 'desktop'::text, 'other'::text])))
);

create table private.completed_khatmahs (
  khatmah_id uuid not null,
  round_no integer not null,
  code text not null,
  dedication text,
  readers integer not null,
  days integer not null,
  completed_at timestamp with time zone default now() not null,
  constraint completed_khatmahs_pkey PRIMARY KEY (khatmah_id, round_no)
);

create table private.organizer_code_attempts (
  khatmah_id uuid not null,
  failures integer default 0 not null,
  window_started_at timestamp with time zone default now() not null,
  locked_until timestamp with time zone,
  constraint organizer_code_attempts_pkey PRIMARY KEY (khatmah_id)
);

create table private.login_links (
  token_hash text not null,
  tg_chat_id bigint not null,
  created_at timestamp with time zone default now() not null,
  expires_at timestamp with time zone not null,
  uses integer default 0 not null,
  last_used_at timestamp with time zone,
  constraint login_links_pkey PRIMARY KEY (token_hash)
);

create table private.tg_login_requests (
  nonce_hash text not null,
  device text not null,
  code text,
  tg_chat_id bigint,
  created_at timestamp with time zone default now() not null,
  confirmed_at timestamp with time zone,
  finished_at timestamp with time zone,
  wanted_id text,
  constraint tg_login_requests_pkey PRIMARY KEY (nonce_hash)
);

-- أرشيف صفوف نقل النطاق المتقاعد؛ يُحذف مع تنظيف المرحلة ٤.
create table private.retired_domain_migration_rows (
  source text not null,
  row_data jsonb not null,
  archived_at timestamptz not null default now()
);

-- المفاتيح الأجنبية
alter table public.members add constraint members_khatmah_id_fkey FOREIGN KEY (khatmah_id) REFERENCES public.khatmah(id) ON DELETE CASCADE;
alter table public.juz add constraint juz_khatmah_id_fkey FOREIGN KEY (khatmah_id) REFERENCES public.khatmah(id) ON DELETE CASCADE;
alter table public.reading_history add constraint reading_history_khatmah_id_fkey FOREIGN KEY (khatmah_id) REFERENCES public.khatmah(id) ON DELETE CASCADE;
alter table public.round_requests add constraint round_requests_khatmah_id_fkey FOREIGN KEY (khatmah_id) REFERENCES public.khatmah(id) ON DELETE CASCADE;
alter table public.notification_deliveries add constraint notification_deliveries_khatmah_id_fkey FOREIGN KEY (khatmah_id) REFERENCES public.khatmah(id) ON DELETE CASCADE;
alter table public.notification_deliveries add constraint notification_deliveries_member_fkey FOREIGN KEY (khatmah_id, recipient) REFERENCES public.members(khatmah_id, mid) ON DELETE CASCADE;
alter table public.share_pending add constraint share_pending_khatmah_id_fkey FOREIGN KEY (khatmah_id) REFERENCES public.khatmah(id) ON DELETE CASCADE;
alter table public.share_wait add constraint share_wait_khatmah_id_fkey FOREIGN KEY (khatmah_id) REFERENCES public.khatmah(id) ON DELETE CASCADE;
alter table private.completed_khatmahs add constraint completed_khatmahs_khatmah_id_fkey FOREIGN KEY (khatmah_id) REFERENCES public.khatmah(id) ON DELETE CASCADE;
alter table private.organizer_code_attempts add constraint organizer_code_attempts_khatmah_id_fkey FOREIGN KEY (khatmah_id) REFERENCES public.khatmah(id) ON DELETE CASCADE;

-- الفهارس
CREATE INDEX events_device ON public.events USING btree (device);
CREATE INDEX events_kind_at ON public.events USING btree (kind, at DESC);
CREATE INDEX juz_khatmah_id_status_idx ON public.juz USING btree (khatmah_id, status);
CREATE INDEX khatmah_creation_log_device_idx ON public.khatmah_creation_log USING btree (device_key, created_at DESC);
CREATE INDEX login_links_expires_at_idx ON private.login_links USING btree (expires_at);
CREATE INDEX members_active_idx ON public.members USING btree (khatmah_id) WHERE (left_at IS NULL);
CREATE INDEX members_tg_chat_id_idx ON public.members USING btree (tg_chat_id);
CREATE INDEX notification_deliveries_pending_idx ON public.notification_deliveries USING btree (kind, status, claimed_at);
CREATE INDEX pwa_installs_first_standalone_idx ON public.pwa_installs USING btree (first_standalone_at) WHERE (first_standalone_at IS NOT NULL);
CREATE INDEX pwa_installs_platform_idx ON public.pwa_installs USING btree (platform);
CREATE INDEX reading_history_member_idx ON public.reading_history USING btree (khatmah_id, member_id, round_no DESC, juz_number);
CREATE INDEX tg_login_requests_device_idx ON private.tg_login_requests USING btree (device, created_at);
CREATE INDEX usage_daily_day_idx ON public.usage_daily USING btree (day);

-- كل الجداول مقفلة أمام القراءة المباشرة؛ الوصول عبر الدوال فقط
alter table public.khatmah enable row level security;
alter table public.members enable row level security;
alter table public.juz enable row level security;
alter table public.reading_history enable row level security;
alter table public.round_requests enable row level security;
alter table public.notification_deliveries enable row level security;
alter table public.share_pending enable row level security;
alter table public.share_wait enable row level security;
alter table public.khatmah_creation_log enable row level security;
alter table public.events enable row level security;
alter table public.pwa_installs enable row level security;
alter table public.usage_daily enable row level security;
alter table private.completed_khatmahs enable row level security;
alter table private.organizer_code_attempts enable row level security;
alter table private.login_links enable row level security;
alter table private.tg_login_requests enable row level security;
alter table private.retired_domain_migration_rows enable row level security;

-- ---------------------------------------------------------------------------
-- الدوال
-- ---------------------------------------------------------------------------
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

create or replace function private.broadcast_khatmah_change()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
declare
  kid uuid;
  kcode text;
  seen text;
begin
  begin
    if tg_table_name = 'khatmah' then
      kid := coalesce(new.id, old.id);
      kcode := coalesce(new.code, old.code);
    else
      kid := coalesce(new.khatmah_id, old.khatmah_id);
      select k.code into kcode from public.khatmah k where k.id = kid;
    end if;
    if kcode is null then return null; end if;

    seen := 'zad.live_' || replace(kid::text, '-', '');
    if coalesce(current_setting(seen, true), '') = '1' then return null; end if;
    perform set_config(seen, '1', true);

    perform private.khatmah_live_send('khatmah:' || kcode);
  exception when others then
    raise warning 'Khatmah live broadcast skipped: %', sqlerrm;
  end;
  return null;
end $$;

create function private.capture_khatmah_completion() returns trigger
language plpgsql security definer set search_path='' as $$
declare k public.khatmah%rowtype; inserted integer;
begin
 select * into k from public.khatmah where id=new.khatmah_id for update;
 if (select count(*) from public.juz where khatmah_id=k.id and status='done')<>30
 then return new; end if;
 insert into private.completed_khatmahs(khatmah_id,round_no,code,dedication,readers,days)
 select k.id,k.round_no,k.code,k.dedication,count(distinct owner_id),
 greatest(1,coalesce(max(done_at)::date-min(done_at)::date+1,1))
 from public.juz where khatmah_id=k.id and status='done'
 on conflict do nothing;
 get diagnostics inserted=row_count;
 if inserted=0 then return new; end if;
 insert into public.notification_deliveries(khatmah_id,round_no,kind,recipient,reference,chat_id)
 select k.id,k.round_no,'done_khatmah',m.mid,'',m.tg_chat_id
 from public.members m where m.khatmah_id=k.id and m.tg_chat_id is not null and m.left_at is null
 on conflict(kind,khatmah_id,round_no,recipient,reference) do nothing;
 -- A dispatch failure must not undo the reader's completed part.
 begin
   perform private.dispatch_completion_notifications();
 exception when others then
   raise warning 'Completion queued; immediate dispatch failed: %', SQLERRM;
 end;
 return new;
end $$;

create function private.dispatch_completion_notifications() returns bigint
language plpgsql security definer set search_path='' as $$
declare request_id bigint; secret_value text;
begin
 if not exists (
   select 1 from public.notification_deliveries d
   join private.completed_khatmahs c using(khatmah_id,round_no)
   where d.kind='done_khatmah' and d.status='pending'
   and (d.claimed_at is null or d.claimed_at<now()-interval '15 minutes')
 ) then return null; end if;
 select decrypted_secret into secret_value from vault.decrypted_secrets where name='zad_cron_secret';
 if secret_value is null then raise exception 'Completion dispatcher secret missing'; end if;
 select net.http_post(
 url:='https://webqpbcijjbawatykoxe.supabase.co/functions/v1/send-completions',
 headers:=jsonb_build_object('Content-Type','application/json','x-cron-secret',secret_value),
 body:='{}'::jsonb, timeout_milliseconds:=120000
 ) into request_id;
 return request_id;
end $$;

create function private.hash_organizer_code(p_code text)
returns text language sql volatile security definer set search_path = ''
as $$ select extensions.crypt(p_code, extensions.gen_salt('bf', 8)); $$;

create or replace function private.khatmah_live_send(p_topic text)
returns void
language plpgsql
security definer
set search_path to ''
as $$
begin
  perform realtime.send('{}'::jsonb, 'changed', p_topic, false);
end $$;

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

create function public.claim_completion_notifications() returns json
language sql security definer set search_path='' as $$
 with eligible as (
   select d.id from public.notification_deliveries d
   join private.completed_khatmahs c using(khatmah_id,round_no)
   where d.kind='done_khatmah' and d.status='pending'
   and (d.claimed_at is null or d.claimed_at<now()-interval '15 minutes')
   order by d.created_at,d.id
   limit 100 for update of d skip locked
 ), claimed as (
   update public.notification_deliveries d
   set claimed_at=now(),attempts=attempts+1
   from eligible e where d.id=e.id
   returning d.*
 )
 select coalesce(json_agg(json_build_object(
 'deliveryId',d.id,'chatId',d.chat_id,'code',c.code,
 'dedication',c.dedication,'readers',c.readers,'days',c.days
 )),'[]'::json)
 from claimed d join private.completed_khatmahs c using(khatmah_id,round_no);
$$;

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

create or replace function public.log_event(p_kind text, p_device text default null::text, p_code text default null::text, p_source text default null::text)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if p_kind not in ('open','install','read_click','join','claim','done','share') then return; end if;
  insert into events (kind, device, code, source) values (p_kind, left(p_device, 64), upper(left(p_code, 8)), left(p_source, 16));
end $$;

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

create or replace function public.record_pwa_install(
  p_device_id uuid,
  p_platform text,
  p_event text,
  p_app_version text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_platform text;
  v_version text;
begin
  if p_device_id is null then
    raise exception 'device id required';
  end if;

  if p_event not in ('install_accepted','standalone_open') then
    raise exception 'invalid install event';
  end if;

  v_platform := case
    when p_platform in ('android','ios','desktop','other') then p_platform
    else 'other'
  end;
  v_version := nullif(left(coalesce(p_app_version,''), 64), '');

  insert into public.pwa_installs (
    device_id, platform, install_accepted_at, first_standalone_at, last_seen_at, app_version
  ) values (
    p_device_id,
    v_platform,
    case when p_event='install_accepted' then now() else null end,
    case when p_event='standalone_open' then now() else null end,
    now(),
    v_version
  )
  on conflict (device_id) do update set
    platform = excluded.platform,
    install_accepted_at = case
      when p_event='install_accepted' then coalesce(public.pwa_installs.install_accepted_at, now())
      else public.pwa_installs.install_accepted_at
    end,
    first_standalone_at = case
      when p_event='standalone_open' then coalesce(public.pwa_installs.first_standalone_at, now())
      else public.pwa_installs.first_standalone_at
    end,
    last_seen_at = now(),
    app_version = coalesce(v_version, public.pwa_installs.app_version);

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.record_usage(
  p_device uuid,
  p_day date,
  p_platform text,
  p_installed boolean,
  p_counts jsonb,
  p_tz text default null,
  p_bot text default null,
  p_persisted boolean default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := (now() at time zone 'Asia/Riyadh')::date;
  v_platform text;
  v_tz text;
  v_bot text := nullif(left(coalesce(p_bot, ''), 32), '');
  c jsonb := coalesce(p_counts, '{}'::jsonb);
begin
  if p_device is null or p_day is null then
    raise exception 'device and day required';
  end if;
  -- الجهاز يحفظ أرقام الأسبوع الأخير فقط؛ ويوم واحد للأمام يغطي اختلاف ساعة الجهاز.
  if p_day < v_today - 7 or p_day > v_today + 1 then
    raise exception 'day out of range';
  end if;
  if jsonb_typeof(c) <> 'object' then
    raise exception 'counts must be an object';
  end if;

  v_platform := case when p_platform in ('android','ios','desktop','other') then p_platform else 'other' end;
  -- اسم منطقة بصيغة IANA فقط (Asia/Damascus، America/Argentina/Buenos_Aires، UTC)؛ غيره يُهمل.
  v_tz := case when p_tz ~ '^[A-Za-z_]+(/[A-Za-z0-9_+-]+){0,2}$' and length(p_tz) <= 64 then p_tz end;

  -- كل رقم يُقص إلى حد معقول في الطلب الواحد وفي اليوم كله، فلا تدخل أرقام خيالية.
  insert into public.usage_daily as u (
    device_id, day, platform, installed, tz, bot, persisted,
    home, prayer, khatmahs, adhkar, quran, reader, listen,
    listen_seconds, tayassar_seconds, storage_reset, pack_fresh
  ) values (
    p_device, p_day, v_platform, coalesce(p_installed, false), v_tz, v_bot, p_persisted,
    least(greatest(coalesce((c->>'home')::numeric, 0), 0), 500)::int,
    least(greatest(coalesce((c->>'prayer')::numeric, 0), 0), 500)::int,
    least(greatest(coalesce((c->>'khatmahs')::numeric, 0), 0), 500)::int,
    least(greatest(coalesce((c->>'adhkar')::numeric, 0), 0), 500)::int,
    least(greatest(coalesce((c->>'quran')::numeric, 0), 0), 500)::int,
    least(greatest(coalesce((c->>'reader')::numeric, 0), 0), 500)::int,
    least(greatest(coalesce((c->>'listen')::numeric, 0), 0), 500)::int,
    least(greatest(coalesce((c->>'listen_seconds')::numeric, 0), 0), 86400)::int,
    least(greatest(coalesce((c->>'tayassar_seconds')::numeric, 0), 0), 86400)::int,
    least(greatest(coalesce((c->>'storage_reset')::numeric, 0), 0), 20)::int,
    least(greatest(coalesce((c->>'pack_fresh')::numeric, 0), 0), 20)::int
  )
  on conflict (device_id, day) do update set
    platform = excluded.platform,
    installed = u.installed or excluded.installed,
    tz = coalesce(excluded.tz, u.tz),
    bot = coalesce(excluded.bot, u.bot),
    persisted = coalesce(excluded.persisted, u.persisted),
    home = least(u.home + excluded.home, 500),
    prayer = least(u.prayer + excluded.prayer, 500),
    khatmahs = least(u.khatmahs + excluded.khatmahs, 500),
    adhkar = least(u.adhkar + excluded.adhkar, 500),
    quran = least(u.quran + excluded.quran, 500),
    reader = least(u.reader + excluded.reader, 500),
    listen = least(u.listen + excluded.listen, 500),
    listen_seconds = least(u.listen_seconds + excluded.listen_seconds, 86400),
    tayassar_seconds = least(u.tayassar_seconds + excluded.tayassar_seconds, 86400),
    storage_reset = least(u.storage_reset + excluded.storage_reset, 20),
    pack_fresh = least(u.pack_fresh + excluded.pack_fresh, 20),
    updated_at = now();
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

CREATE OR REPLACE FUNCTION public.add_member(p_code text, p_org_code text, p_id text, p_name text, p_device text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare k_id uuid;
begin
  select id into k_id from public.khatmah where code = upper(trim(p_code));
  if k_id is null or not public._organizer_device_ok(k_id, p_org_code, p_device) then
    return json_build_object('ok', false, 'error', 'الرمز أو الجهاز غير صحيح');
  end if;
  if exists (select 1 from public.members where khatmah_id = k_id and mid = p_id) then
    return json_build_object('ok', false, 'error', 'الاسم مسجَّل بالفعل');
  end if;
  insert into public.members(khatmah_id, mid, name)
  values (k_id, p_id, left(trim(p_name), 80));
  return json_build_object('ok', true, 'name', left(trim(p_name), 80));
end;
$function$
;
CREATE OR REPLACE FUNCTION public.chat_for_done(p_code text, p_id text, p_num integer)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  k public.khatmah%rowtype;
  m public.members%rowtype;
  d_id uuid;
  d_status text;
  free_n int;
  mine int[];
begin
  select * into k from public.khatmah where code = upper(trim(p_code));
  if k.id is null or p_num not between 1 and 30 then
    return json_build_object('ok', true, 'skip', true);
  end if;
  if not exists (
    select 1 from public.juz
    where khatmah_id = k.id and number = p_num
      and owner_id = p_id and status = 'done'
  ) then
    return json_build_object('ok', true, 'skip', true);
  end if;
  select * into m from public.members where khatmah_id = k.id and mid = p_id;
  if m.tg_chat_id is null then
    return json_build_object('ok', true, 'skip', true);
  end if;

  insert into public.notification_deliveries as existing(
    khatmah_id, round_no, kind, recipient, reference, chat_id
  ) values (k.id, k.round_no, 'done_part', p_id, p_num::text, m.tg_chat_id)
  on conflict (kind, khatmah_id, round_no, recipient, reference)
  do update set chat_id = excluded.chat_id
    where existing.status = 'pending';

  update public.notification_deliveries
     set claimed_at = now(), attempts = attempts + 1
   where kind = 'done_part'
     and khatmah_id = k.id
     and round_no = k.round_no
     and recipient = p_id
     and reference = p_num::text
     and status = 'pending'
     and (claimed_at is null or claimed_at < now() - interval '15 minutes')
  returning id into d_id;

  if d_id is null then
    select status into d_status
      from public.notification_deliveries
     where kind = 'done_part'
       and khatmah_id = k.id
       and round_no = k.round_no
       and recipient = p_id
       and reference = p_num::text;
    if d_status = 'pending' then
      return json_build_object('ok', false, 'retry', true);
    end if;
    return json_build_object('ok', true, 'skip', true);
  end if;

  select count(*) into free_n from public.juz
   where khatmah_id = k.id and status = 'free';
  select coalesce(array_agg(number order by number), '{}') into mine
    from public.juz
   where khatmah_id = k.id and owner_id = p_id and status = 'taken';

  return json_build_object(
    'ok', true, 'deliveryId', d_id, 'chatId', m.tg_chat_id,
    'name', m.name, 'freeCount', free_n, 'mine', mine
  );
end;
$function$
;
CREATE OR REPLACE FUNCTION public.chat_linked(p_chat bigint)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_name text; v_code text;
begin
  select m.name, k.code into v_name, v_code
    from members m
    join khatmah k on k.id = m.khatmah_id
   where m.tg_chat_id = p_chat
   order by k.end_date desc
   limit 1;

  if v_name is null then return json_build_object('linked', false); end if;
  return json_build_object('linked', true, 'name', v_name, 'code', v_code);
end $function$
;
CREATE OR REPLACE FUNCTION public.chat_of(p_code text, p_org_code text, p_id text, p_device text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare k public.khatmah%rowtype; m public.members%rowtype;
begin
  select * into k from public.khatmah where code = upper(trim(p_code));
  if k.id is null or not public._organizer_device_ok(k.id, p_org_code, p_device) then
    return json_build_object('ok', false, 'error', 'الرمز أو الجهاز غير صحيح');
  end if;
  select * into m from public.members where khatmah_id = k.id and mid = p_id;
  if m.mid is null then return json_build_object('ok', false, 'error', 'الاسم غير موجود'); end if;
  if m.tg_chat_id is null then
    return json_build_object('ok', false, 'error', 'لم يفعّل التذكير، فلا سبيل لمراسلته');
  end if;
  return json_build_object('ok', true, 'title', k.title,
    'chats', json_build_array(json_build_object('chatId', m.tg_chat_id, 'name', m.name)));
end;
$function$
;
CREATE OR REPLACE FUNCTION public.chats_all(p_code text, p_org_code text, p_device text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare k public.khatmah%rowtype; cs json;
begin
  select * into k from public.khatmah where code = upper(trim(p_code));
  if k.id is null or not public._organizer_device_ok(k.id, p_org_code, p_device) then
    return json_build_object('ok', false, 'error', 'الرمز أو الجهاز غير صحيح');
  end if;
  select coalesce(json_agg(json_build_object('chatId', m.tg_chat_id, 'name', m.name)), '[]'::json)
    into cs from public.members m where m.khatmah_id = k.id and m.tg_chat_id is not null;
  return json_build_object('ok', true, 'title', k.title, 'chats', cs);
end;
$function$
;
CREATE OR REPLACE FUNCTION public.claim_juz(p_code text, p_id text, p_num integer, p_device text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  k_id uuid;
  upd integer;
begin
  select id into k_id from public.khatmah where code = upper(trim(p_code));
  if k_id is null then
    return json_build_object('ok', false, 'error', 'ختمة غير موجودة');
  end if;

  if not public._member_device_ok(k_id, p_id, p_device) then
    return json_build_object('ok', false, 'error', 'هذا الحساب مقفول على جهاز صاحبه');
  end if;

  if not exists (
    select 1 from public.members
    where khatmah_id = k_id and mid = p_id
      and (tg_chat_id is not null or exempt)
  ) then
    return json_build_object('ok', false, 'error', 'فعّل التذكير أولًا');
  end if;

  update public.juz
     set owner_id = p_id, status = 'taken', done_at = null
   where khatmah_id = k_id and number = p_num and status = 'free';
  get diagnostics upd = row_count;

  if upd = 0 then
    return json_build_object('ok', false, 'error', 'سبقك أحدهم إلى هذا الجزء');
  end if;
  return json_build_object('ok', true);
end;
$function$
;
CREATE OR REPLACE FUNCTION public.confirm_tg_login(p_nonce text, p_chat bigint, p_confirm boolean DEFAULT true)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
  select m.name, k.title into v_name, v_title
    from public.members m
    join public.khatmah k on k.id = m.khatmah_id
   where m.tg_chat_id = p_chat and m.left_at is null
   order by (k.code = r.code) desc, m.created_at
   limit 1;
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
$function$
;
CREATE OR REPLACE FUNCTION public.delete_khatmah(p_code text, p_org_code text, p_device text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare k public.khatmah%rowtype; chats json;
begin
  select * into k from public.khatmah where code = upper(trim(p_code));
  if k.id is null or not public._organizer_device_ok(k.id, p_org_code, p_device) then
    return json_build_object('ok', false, 'error', 'الرمز أو الجهاز غير صحيح');
  end if;
  select coalesce(json_agg(json_build_object('chatId', m.tg_chat_id, 'name', m.name)), '[]'::json)
    into chats from public.members m where m.khatmah_id = k.id and m.tg_chat_id is not null;
  delete from public.khatmah where id = k.id;
  return json_build_object('ok', true, 'title', k.title, 'chats', chats);
end;
$function$
;
CREATE OR REPLACE FUNCTION public.due_reminders(p_local_date date, p_hour integer, p_minute integer)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare result json;
begin
  if p_local_date is null
     or p_hour not between 0 and 23
     or p_minute not between 0 and 59 then
    return '[]'::json;
  end if;

  insert into public.notification_deliveries as existing(
    khatmah_id, round_no, kind, recipient, reference, chat_id
  )
  select distinct k.id, k.round_no, 'reminder', m.mid, p_local_date::text, m.tg_chat_id
    from public.khatmah k
    join public.members m
      on m.khatmah_id = k.id
     and m.tg_chat_id is not null
     and m.left_at is null
     and coalesce(m.exempt, false) = false
   where coalesce(m.reminder_hour, k.reminder_hour) = p_hour
     and p_minute >= coalesce(m.reminder_minute, k.reminder_minute)
     and p_minute <  coalesce(m.reminder_minute, k.reminder_minute) + 10
     and k.end_date >= p_local_date - 7
     and exists (
       select 1 from public.juz j
       where j.khatmah_id = k.id and j.owner_id = m.mid and j.status = 'taken'
     )
  on conflict (kind, khatmah_id, round_no, recipient, reference)
  do update set chat_id = excluded.chat_id
    where existing.status = 'pending';

  with claimed as (
    update public.notification_deliveries d
       set claimed_at = now(), attempts = attempts + 1
     where d.kind = 'reminder'
       and d.reference = p_local_date::text
       and d.status = 'pending'
       and (d.claimed_at is null or d.claimed_at < now() - interval '15 minutes')
    returning d.id, d.khatmah_id, d.round_no, d.recipient, d.chat_id
  ), groups as (
    select
      c.id as delivery_id,
      c.chat_id,
      c.recipient,
      k.id as khatmah_id,
      k.code,
      k.title,
      k.dedication,
      k.end_date,
      m.name,
      array_agg(j.number order by j.number) as juz_numbers,
      (select count(*) from public.juz x where x.khatmah_id = k.id and x.status = 'done') as done_count,
      (select count(*) from public.juz x where x.khatmah_id = k.id and x.status = 'free') as free_count,
      (select count(*) from public.juz x where x.khatmah_id = k.id and x.status <> 'done') as remaining
    from claimed c
    join public.khatmah k on k.id = c.khatmah_id and k.round_no = c.round_no
    join public.members m on m.khatmah_id = k.id and m.mid = c.recipient
    join public.juz j on j.khatmah_id = k.id and j.owner_id = c.recipient and j.status = 'taken'
    group by c.id, c.chat_id, c.recipient, k.id, k.code, k.title,
             k.dedication, k.end_date, m.name
  )
  select coalesce(json_agg(json_build_object(
    'deliveryId', g.delivery_id,
    'chatId', g.chat_id,
    'name', g.name,
    'juz', g.juz_numbers,
    'code', g.code,
    'endDate', g.end_date,
    'title', g.title,
    'dedication', g.dedication,
    'doneCount', g.done_count,
    'freeCount', g.free_count,
    'remaining', g.remaining,
    'daysLeft', g.end_date - p_local_date
  )), '[]'::json) into result
  from groups g;

  update public.notification_deliveries d
     set status = 'sent', sent_at = now(), claimed_at = null
   where d.kind = 'reminder'
     and d.reference = p_local_date::text
     and d.status = 'pending'
     and d.claimed_at is not null
     and not exists (
       select 1 from public.juz j
       where j.khatmah_id = d.khatmah_id
         and j.owner_id = d.recipient
         and j.status = 'taken'
     );

  return result;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.events_purge()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare n int;
begin
  delete from events where at < now() - interval '1 year';
  get diagnostics n = row_count;
  return json_build_object('ok', true, 'deleted', n);
end $function$
;
CREATE OR REPLACE FUNCTION public.finish_tg_login(p_nonce text, p_device text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$
;
CREATE OR REPLACE FUNCTION public.get_my_history(p_code text, p_id text, p_device text)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  k public.khatmah%rowtype;
  result json;
begin
  select * into k from public.khatmah where code = upper(trim(p_code));
  if k.id is null or not public._member_device_ok(k.id, p_id, p_device) then
    return json_build_object('ok', false, 'error', 'هذا السجل لصاحب الحساب فقط');
  end if;

  select json_build_object(
    'ok', true,
    'readCount', count(*),
    'uniqueJuzCount', count(distinct h.juz_number),
    'roundCount', count(distinct h.round_no),
    'history', coalesce(json_agg(json_build_object(
      'roundNo', h.round_no,
      'number', h.juz_number,
      'completedAt', h.completed_at
    ) order by h.round_no desc, h.completed_at, h.juz_number)
      filter (where h.juz_number is not null), '[]'::json)
  ) into result
  from public.reading_history h
  where h.khatmah_id = k.id and h.member_id = p_id;

  return result;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.issue_login_link(p_chat bigint)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
  delete from private.login_links where expires_at < now() - interval '1 day';
  v_token := encode(extensions.gen_random_bytes(18), 'hex');
  insert into private.login_links (token_hash, tg_chat_id, expires_at)
  values (encode(extensions.digest(v_token, 'sha256'), 'hex'), p_chat, now() + interval '7 days');
  return v_token;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.khatmah_done_info(p_code text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  k public.khatmah%rowtype;
  readers int;
  days int;
  cs json;
begin
  select * into k from public.khatmah where code = upper(trim(p_code));
  if k.id is null then return json_build_object('ok', true, 'skip', true); end if;
  if exists (select 1 from public.juz where khatmah_id = k.id and status <> 'done') then
    return json_build_object('ok', true, 'skip', true);
  end if;

  select count(distinct owner_id) into readers
    from public.juz where khatmah_id = k.id and status = 'done' and owner_id is not null;
  select greatest(1, coalesce((max(done_at)::date - min(done_at)::date) + 1, 1)) into days
    from public.juz where khatmah_id = k.id and status = 'done';

  insert into public.notification_deliveries as existing(
    khatmah_id, round_no, kind, recipient, reference, chat_id
  )
  select k.id, k.round_no, 'done_khatmah', m.mid, '', m.tg_chat_id
    from public.members m
   where m.khatmah_id = k.id and m.tg_chat_id is not null
  on conflict (kind, khatmah_id, round_no, recipient, reference)
  do update set chat_id = excluded.chat_id
    where existing.status = 'pending';

  with claimed as (
    update public.notification_deliveries d
       set claimed_at = now(), attempts = attempts + 1
     where d.kind = 'done_khatmah'
       and d.khatmah_id = k.id
       and d.round_no = k.round_no
       and d.status = 'pending'
       and (d.claimed_at is null or d.claimed_at < now() - interval '15 minutes')
    returning d.id, d.chat_id, d.recipient
  )
  select coalesce(json_agg(json_build_object(
           'deliveryId', c.id, 'chatId', c.chat_id, 'name', m.name
         )), '[]'::json)
    into cs
    from claimed c
    join public.members m on m.khatmah_id = k.id and m.mid = c.recipient;

  if json_array_length(cs) = 0 and exists (
    select 1 from public.notification_deliveries d
    where d.kind = 'done_khatmah' and d.khatmah_id = k.id
      and d.round_no = k.round_no and d.status = 'pending'
  ) then
    return json_build_object('ok', false, 'retry', true);
  end if;

  return json_build_object(
    'ok', true, 'title', k.title, 'dedication', k.dedication,
    'readers', readers, 'days', days, 'chats', cs
  );
end;
$function$
;
CREATE OR REPLACE FUNCTION public.leave_khatmah(p_code text, p_id text, p_device text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  k       public.khatmah%rowtype;
  freed   integer := 0;
  kept    integer := 0;
begin
  select * into k from public.khatmah where code = upper(trim(coalesce(p_code, '')));
  if k.id is null then
    return json_build_object('ok', false, 'error', 'لا توجد ختمة بهذا الرمز');
  end if;

  if not public._member_device_ok(k.id, p_id, p_device) then
    return json_build_object('ok', false, 'error', 'هذا الحساب مقفول على جهاز صاحبه');
  end if;

  if p_id = k.organizer_id then
    return json_build_object('ok', false,
      'error', 'المشرف لا يغادر ختمته. سلّم الإشراف أوّلًا، أو ألغِ الختمة.');
  end if;

  select count(*) into kept
    from public.juz
   where khatmah_id = k.id and owner_id = p_id and status = 'done';

  update public.juz
     set owner_id = null, status = 'free', done_at = null
   where khatmah_id = k.id and owner_id = p_id and status <> 'done';
  get diagnostics freed = row_count;

  -- يُقطع التذكير ويُحرَّر الاسم، ويبقى الصفّ شاهدًا على ما قُرئ
  update public.members
     set left_at   = now(),
         tg_chat_id = null,
         device    = null,
         devices   = '{}'
   where khatmah_id = k.id and mid = p_id;

  return json_build_object('ok', true, 'freed', freed, 'kept', kept);
end;
$function$
;
CREATE OR REPLACE FUNCTION public.list_active_khatmahs()
 RETURNS json
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce(json_agg(row_to_json(t) order by t.end_date, t.title), '[]'::json)
  from (
    select
      k.id::text                       as "publicId",
      k.title,
      k.access_type                    as "accessType",
      k.end_date,
      (select count(*) from public.members m
        where m.khatmah_id = k.id and m.left_at is null) as "participantCount",
      (select count(*) from public.juz j
        where j.khatmah_id = k.id and j.status <> 'free') as "reservedCount",
      (select count(*) from public.juz j
        where j.khatmah_id = k.id and j.status = 'done')  as "doneCount"
      from public.khatmah k
     where k.access_type in ('public','private')
       and exists (
         select 1 from public.juz j
          where j.khatmah_id = k.id and j.status <> 'done'
       )
     order by k.end_date, k.title
     limit 100
  ) t;
$function$
;
CREATE OR REPLACE FUNCTION public.match_khatmah_code(p_public_id text, p_code text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1 from public.khatmah k
     where k.id::text = p_public_id
       and k.access_type = 'private'
       and k.code = upper(trim(p_code))
  );
$function$
;
CREATE OR REPLACE FUNCTION public.merge_members(p_code text, p_org_code text, p_from text, p_to text, p_device text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare k public.khatmah%rowtype; a public.members%rowtype; b public.members%rowtype; moved int;
begin
  select * into k from public.khatmah where code = upper(trim(p_code));
  if k.id is null or not public._organizer_device_ok(k.id, p_org_code, p_device) then
    return json_build_object('ok', false, 'error', 'الرمز أو الجهاز غير صحيح');
  end if;
  if p_from = p_to then return json_build_object('ok', false, 'error', 'الاسمان متطابقان'); end if;
  if p_from = k.organizer_id then return json_build_object('ok', false, 'error', 'لا يُدمج سجلّ المنظّم'); end if;
  select * into a from public.members where khatmah_id = k.id and mid = p_from;
  select * into b from public.members where khatmah_id = k.id and mid = p_to;
  if a.mid is null or b.mid is null then
    return json_build_object('ok', false, 'error', 'أحد الاسمين غير موجود');
  end if;
  if b.tg_chat_id is null and a.tg_chat_id is not null then
    update public.members set tg_chat_id = a.tg_chat_id where khatmah_id = k.id and mid = p_to;
    update public.members set tg_chat_id = null where khatmah_id = k.id and mid = p_from;
  end if;
  /* ينضم سجل الاسم القديم إلى سجل الاسم المختار بلا مضاعفة الجزء نفسه في الدورة نفسها. */
  insert into public.reading_history as existing(
    khatmah_id, round_no, member_id, juz_number, completed_at
  )
  select h.khatmah_id, h.round_no, p_to, h.juz_number, h.completed_at
    from public.reading_history h
   where h.khatmah_id = k.id and h.member_id = p_from
  on conflict (khatmah_id, round_no, member_id, juz_number)
  do update set completed_at = least(existing.completed_at, excluded.completed_at);
  delete from public.reading_history
   where khatmah_id = k.id and member_id = p_from;
  update public.juz set owner_id = p_to where khatmah_id = k.id and owner_id = p_from;
  get diagnostics moved = row_count;
  delete from public.members where khatmah_id = k.id and mid = p_from;
  return json_build_object('ok', true, 'moved', moved, 'name', b.name);
end;
$function$
;
CREATE OR REPLACE FUNCTION public.new_round_info(p_code text, p_org_code text, p_end date, p_device text, p_request text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  k public.khatmah%rowtype;
  request_round integer;
  cs json;
begin
  if p_end is null or coalesce(trim(p_request), '') = '' then
    return json_build_object('ok', false, 'error', 'بيانات ناقصة');
  end if;

  select * into k from public.khatmah
   where code = upper(trim(p_code)) for update;
  if k.id is null or not public._organizer_device_ok(k.id, p_org_code, p_device) then
    return json_build_object('ok', false, 'error', 'الرمز أو الجهاز غير صحيح');
  end if;

  select rr.round_no into request_round
    from public.round_requests rr
   where rr.khatmah_id = k.id and rr.request_key = left(p_request, 160);

  if request_round is null then
    update public.khatmah
       set end_date = p_end, round_no = round_no + 1
     where id = k.id
    returning * into k;
    update public.juz set owner_id = null, status = 'free', done_at = null
     where khatmah_id = k.id;
    insert into public.round_requests(khatmah_id, request_key, round_no)
    values (k.id, left(p_request, 160), k.round_no);
  elsif request_round <> k.round_no then
    return json_build_object('ok', false, 'error', 'هذا طلب قديم');
  end if;

  insert into public.notification_deliveries as existing(
    khatmah_id, round_no, kind, recipient, reference, chat_id
  )
  select k.id, k.round_no, 'new_round', m.mid, '', m.tg_chat_id
    from public.members m
   where m.khatmah_id = k.id and m.tg_chat_id is not null
  on conflict (kind, khatmah_id, round_no, recipient, reference)
  do update set chat_id = excluded.chat_id
    where existing.status = 'pending';

  with claimed as (
    update public.notification_deliveries d
       set claimed_at = now(), attempts = attempts + 1
     where d.kind = 'new_round'
       and d.khatmah_id = k.id
       and d.round_no = k.round_no
       and d.status = 'pending'
       and (d.claimed_at is null or d.claimed_at < now() - interval '15 minutes')
    returning d.id, d.chat_id, d.recipient
  )
  select coalesce(json_agg(json_build_object(
           'deliveryId', c.id, 'chatId', c.chat_id, 'name', m.name
         )), '[]'::json)
    into cs
    from claimed c
    join public.members m on m.khatmah_id = k.id and m.mid = c.recipient;

  if json_array_length(cs) = 0 and exists (
    select 1 from public.notification_deliveries d
    where d.kind = 'new_round' and d.khatmah_id = k.id
      and d.round_no = k.round_no and d.status = 'pending'
  ) then
    return json_build_object('ok', false, 'retry', true);
  end if;

  return json_build_object(
    'ok', true, 'title', k.title, 'dedication', k.dedication,
    'endDate', k.end_date, 'roundNo', k.round_no, 'chats', cs
  );
end;
$function$
;
CREATE OR REPLACE FUNCTION public.notification_finish(p_delivery uuid, p_ok boolean, p_permanent boolean DEFAULT false)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare upd int;
begin
  update public.notification_deliveries
     set status = case
                    when p_ok then 'sent'
                    when p_permanent then 'permanent_failed'
                    else 'pending'
                  end,
         sent_at = case when p_ok then now() else sent_at end,
         claimed_at = null
   where id = p_delivery and status <> 'sent';
  get diagnostics upd = row_count;
  return json_build_object('ok', upd > 0);
end;
$function$
;
CREATE OR REPLACE FUNCTION public.open_public_khatmah(p_public_id text)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select k.code
    from public.khatmah k
   where k.id::text = p_public_id
     and k.access_type = 'public'
     and exists (
       select 1 from public.juz j
        where j.khatmah_id = k.id and j.status <> 'done'
     )
   limit 1;
$function$
;
CREATE OR REPLACE FUNCTION public.purge_abandoned()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare n int;
begin
  with dead as (
    select k.id
      from khatmah k
     where k.created_at < now() - interval '1 day'
       and not exists (select 1 from members m
                        where m.khatmah_id = k.id and m.tg_chat_id is not null)
       and not exists (select 1 from juz j
                        where j.khatmah_id = k.id and j.status <> 'free')
       and (select count(*) from members m where m.khatmah_id = k.id) <= 1
  )
  delete from khatmah where id in (select id from dead);
  get diagnostics n = row_count;
  return json_build_object('ok', true, 'deleted', n);
end $function$
;
CREATE OR REPLACE FUNCTION public.redeem_login_link(p_token text, p_device text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$
;
CREATE OR REPLACE FUNCTION public.remove_member(p_code text, p_org_code text, p_id text, p_device text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare k public.khatmah%rowtype; m public.members%rowtype; freed int;
begin
  select * into k from public.khatmah where code = upper(trim(p_code));
  if k.id is null or not public._organizer_device_ok(k.id, p_org_code, p_device) then
    return json_build_object('ok', false, 'error', 'الرمز أو الجهاز غير صحيح');
  end if;
  if p_id = k.organizer_id then return json_build_object('ok', false, 'error', 'لا يُحذف المنظّم'); end if;
  select * into m from public.members where khatmah_id = k.id and mid = p_id;
  if m.mid is null then return json_build_object('ok', false, 'error', 'الاسم غير موجود'); end if;
  update public.juz set owner_id = null, status = 'free', done_at = null
   where khatmah_id = k.id and owner_id = p_id;
  get diagnostics freed = row_count;
  delete from public.reading_history
   where khatmah_id = k.id and member_id = p_id;
  delete from public.members where khatmah_id = k.id and mid = p_id;
  return json_build_object('ok', true, 'name', m.name, 'freed', freed);
end;
$function$
;
CREATE OR REPLACE FUNCTION public.rest_in(p_chat bigint, p_code text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare k_id uuid; v_mid text; n int;
begin
  select id into k_id from khatmah where code = upper(p_code);
  if k_id is null then return json_build_object('ok', false); end if;

  select mid into v_mid from members
   where khatmah_id = k_id and tg_chat_id = p_chat;
  if v_mid is null then return json_build_object('ok', false); end if;

  select count(*) into n from juz
   where khatmah_id = k_id and owner_id = v_mid and status = 'taken';

  return json_build_object('ok', true, 'code', upper(p_code), 'rest', n);
end $function$
;
CREATE OR REPLACE FUNCTION public.set_my_reminder(p_code text, p_id text, p_device text, p_wants boolean, p_hour integer, p_minute integer)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  k public.khatmah%rowtype;
  h smallint;
  mi smallint;
begin
  select * into k from public.khatmah where code = upper(trim(coalesce(p_code, '')));
  if k.id is null then
    return json_build_object('ok', false, 'error', 'لا توجد ختمة بهذا الرمز');
  end if;

  if not public._member_device_ok(k.id, p_id, p_device) then
    return json_build_object('ok', false, 'error', 'هذا الحساب مقفول على جهاز صاحبه');
  end if;

  if k.access_type <> 'public' then
    return json_build_object('ok', false,
      'error', 'التذكير في الختمات الخاصة بيد مشرفها');
  end if;

  if p_id = k.organizer_id then
    return json_build_object('ok', false, 'error', 'المشرف يلزمه التذكير');
  end if;

  if coalesce(p_wants, false) then
    h  := case when p_hour   between 0 and 23 then p_hour::smallint  else null end;
    mi := case when p_minute between 0 and 59 then p_minute::smallint else null end;
    update public.members
       set exempt = false, reminder_hour = h, reminder_minute = mi
     where khatmah_id = k.id and mid = p_id;
  else
    -- لا يريد تذكيرًا: يُعفى ويُقطع ربطه، فيدخل ويحجز كالجميع
    update public.members
       set exempt = true, reminder_hour = null, reminder_minute = null
     where khatmah_id = k.id and mid = p_id;
  end if;

  return json_build_object('ok', true, 'wants', coalesce(p_wants, false));
end;
$function$
;
CREATE OR REPLACE FUNCTION public.share_clear(p_chat bigint, p_keep boolean DEFAULT false)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare w share_wait%rowtype; v_code text; n int;
begin
  select * into w from share_wait where chat_id = p_chat;

  if w.chat_id is null then
    return json_build_object('ok', false);
  end if;

  select code into v_code from khatmah where id = w.khatmah_id;
  select count(*) into n from juz
   where khatmah_id = w.khatmah_id and owner_id = w.mid and status = 'taken';

  if p_keep then
    -- «تعديل»: يُمحى ما كُتب ويُجدَّد الوقت، ويبقى الباب مفتوحًا
    update share_wait set draft = null, created_at = now() where chat_id = p_chat;
  else
    delete from share_wait where chat_id = p_chat;
  end if;

  return json_build_object('ok', true, 'code', v_code, 'rest', n);
end $function$
;
CREATE OR REPLACE FUNCTION public.share_decide(p_id uuid, p_chat bigint, p_ok boolean)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare p share_pending%rowtype; k khatmah%rowtype; cs json; n int; a_mid text;
begin
  select * into p from share_pending where id = p_id;
  if p.id is null then return json_build_object('ok', false, 'why', 'gone'); end if;

  select * into k from khatmah where id = p.khatmah_id;

  if not exists (select 1 from members m
                  where m.khatmah_id = k.id and m.mid = k.organizer_id
                    and m.tg_chat_id = p_chat) then
    return json_build_object('ok', false, 'why', 'forbidden');
  end if;

  delete from share_pending where id = p_id;

  select mid into a_mid from members
   where khatmah_id = k.id and tg_chat_id = p.author_chat;
  select count(*) into n from juz
   where khatmah_id = k.id and owner_id = a_mid and status = 'taken';

  if not p_ok then
    return json_build_object('ok', true, 'mode', 'reject',
                             'authorChat', p.author_chat, 'code', k.code, 'rest', n);
  end if;

  select coalesce(json_agg(json_build_object('chatId', m.tg_chat_id)), '[]'::json)
    into cs from members m where m.khatmah_id = k.id and m.tg_chat_id is not null;

  return json_build_object('ok', true, 'mode', 'publish', 'title', k.title,
                           'text', p.text, 'chats', cs, 'code', k.code,
                           'authorChat', p.author_chat, 'rest', n);
end $function$
;
CREATE OR REPLACE FUNCTION public.share_draft(p_chat bigint, p_text text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare w public.share_wait%rowtype;
begin
  select * into w from public.share_wait where chat_id = p_chat;
  if w.chat_id is null then
    return json_build_object('ok', false, 'why', 'none');
  end if;
  if w.created_at < now() - interval '1 hour' then
    delete from public.share_wait where chat_id = p_chat;
    return json_build_object('ok', false, 'why', 'expired');
  end if;
  if coalesce(char_length(p_text), 0) > 1500 then
    return json_build_object('ok', false, 'why', 'long');
  end if;
  update public.share_wait set draft = p_text where chat_id = p_chat;
  return json_build_object('ok', true);
end;
$function$
;
CREATE OR REPLACE FUNCTION public.share_open(p_chat bigint, p_code text, p_juz integer)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare k_id uuid; v_mid text;
begin
  select id into k_id from khatmah where code = upper(p_code);
  if k_id is null then return json_build_object('ok', false); end if;

  select mid into v_mid from members
   where khatmah_id = k_id and tg_chat_id = p_chat;
  if v_mid is null then return json_build_object('ok', false); end if;

  insert into share_wait (chat_id, khatmah_id, mid, juz)
  values (p_chat, k_id, v_mid, p_juz)
  on conflict (chat_id) do update
     set khatmah_id = excluded.khatmah_id, mid = excluded.mid,
         juz = excluded.juz, draft = null, created_at = now();

  return json_build_object('ok', true);
end $function$
;
CREATE OR REPLACE FUNCTION public.share_purge()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare a int; b int;
begin
  delete from share_wait where created_at < now() - interval '2 hours';
  get diagnostics a = row_count;
  delete from share_pending where created_at < now() - interval '30 days';
  get diagnostics b = row_count;
  return json_build_object('ok', true, 'wait', a, 'pending', b);
end $function$
;
CREATE OR REPLACE FUNCTION public.share_submit(p_chat bigint)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare w share_wait%rowtype; k khatmah%rowtype;
        org_chat bigint; is_org boolean; pid uuid; cs json; n int;
begin
  select * into w from share_wait where chat_id = p_chat;
  if w.chat_id is null or w.draft is null then
    return json_build_object('ok', false, 'why', 'none');
  end if;
  if w.created_at < now() - interval '1 hour' then
    delete from share_wait where chat_id = p_chat;
    return json_build_object('ok', false, 'why', 'expired');
  end if;

  select * into k from khatmah where id = w.khatmah_id;
  is_org := (w.mid = k.organizer_id);

  select tg_chat_id into org_chat from members
   where khatmah_id = k.id and mid = k.organizer_id;

  select count(*) into n from juz
   where khatmah_id = k.id and owner_id = w.mid and status = 'taken';

  delete from share_wait where chat_id = p_chat;

  if is_org or org_chat is null then
    select coalesce(json_agg(json_build_object('chatId', m.tg_chat_id)), '[]'::json)
      into cs from members m where m.khatmah_id = k.id and m.tg_chat_id is not null;
    return json_build_object('ok', true, 'mode', 'publish', 'code', k.code,
                             'title', k.title, 'text', w.draft, 'chats', cs, 'rest', n);
  end if;

  insert into share_pending (khatmah_id, author_chat, juz, text)
  values (k.id, p_chat, w.juz, w.draft) returning id into pid;

  return json_build_object('ok', true, 'mode', 'review', 'id', pid, 'code', k.code,
                           'title', k.title, 'text', w.draft,
                           'orgChat', org_chat, 'rest', n);
end $function$
;
CREATE OR REPLACE FUNCTION public.start_tg_login(p_device text, p_code text DEFAULT NULL::text, p_id text DEFAULT NULL::text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$
;
CREATE OR REPLACE FUNCTION public.unlink_by_chat(p_chat bigint)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare upd int;
begin
  update members set tg_chat_id = null, link_code = null where tg_chat_id = p_chat;
  get diagnostics upd = row_count;
  return json_build_object('ok', upd > 0);
end $function$
;
CREATE OR REPLACE FUNCTION public.unlink_telegram(p_code text, p_id text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare k_id uuid;
begin
  select id into k_id from khatmah where code = upper(p_code);
  update members set tg_chat_id = null, link_code = null
   where khatmah_id = k_id and mid = p_id;
  return json_build_object('ok', true);
end $function$
;

-- ---------------------------------------------------------------------------
-- لوحات الاستخدام (خاصة بالمالك)
-- ---------------------------------------------------------------------------
create or replace view private.usage_human as
select * from public.usage_daily
where bot is null
  and not (
    tz = 'America/Los_Angeles'
    and not installed
    and home + prayer + khatmahs + adhkar + quran + reader + listen <= 1
  );

create or replace view private.usage_active as
with days as (
  select generate_series(min(day), (now() at time zone 'Asia/Riyadh')::date, interval '1 day')::date as day
  from private.usage_human
)
select
  d.day as "اليوم",
  (select count(*) from private.usage_human u where u.day = d.day) as "نشطون",
  (select count(*) from private.usage_human u where u.day = d.day and u.installed) as "منهم مثبّت",
  (select count(distinct u.device_id) from private.usage_human u where u.day between d.day - 6 and d.day) as "نشطون في ٧ أيام"
from days d
order by d.day desc;

create or replace view private.usage_retention as
with firsts as (
  select device_id, min(day) as first_day from private.usage_human group by device_id
), marks as (
  select f.device_id, f.first_day,
    bool_or(u.day between f.first_day + 7 and f.first_day + 13) as week2,
    bool_or(u.day >= f.first_day + 30) as day30
  from firsts f join private.usage_human u using (device_id)
  group by f.device_id, f.first_day
), today as (select (now() at time zone 'Asia/Riyadh')::date as d)
select
  date_trunc('week', m.first_day)::date as "أسبوع أول ظهور",
  count(*) as "أجهزة جديدة",
  case when max(m.first_day) + 13 < (select d from today)
    then round(100.0 * count(*) filter (where m.week2) / count(*), 1) end as "% عادت في الأسبوع الثاني",
  case when max(m.first_day) + 30 < (select d from today)
    then round(100.0 * count(*) filter (where m.day30) / count(*), 1) end as "% عادت بعد ٣٠ يومًا"
from marks m
group by 1
order by 1 desc;

create or replace view private.usage_reach as
select
  day as "اليوم",
  count(*) as "نشطون",
  round(100.0 * count(*) filter (where home > 0) / count(*), 1) as "% الرئيسية",
  round(100.0 * count(*) filter (where quran > 0) / count(*), 1) as "% فهرس القرآن",
  round(100.0 * count(*) filter (where reader > 0) / count(*), 1) as "% المصحف",
  round(100.0 * count(*) filter (where listen > 0) / count(*), 1) as "% مشغّل التلاوة",
  round(100.0 * count(*) filter (where khatmahs > 0) / count(*), 1) as "% الختمات",
  round(100.0 * count(*) filter (where prayer > 0) / count(*), 1) as "% المواقيت",
  round(100.0 * count(*) filter (where adhkar > 0) / count(*), 1) as "% الأذكار"
from private.usage_human
group by day
order by day desc;

create or replace view private.usage_listening as
select
  day as "اليوم",
  count(*) filter (where listen_seconds > 0) as "مستمعون",
  round(sum(listen_seconds) / 60.0) as "دقائق الاستماع",
  round(sum(listen_seconds) / 60.0 / nullif(count(*) filter (where listen_seconds > 0), 0), 1) as "متوسط الدقائق لكل مستمع",
  round(100.0 * sum(tayassar_seconds) / nullif(sum(listen_seconds), 0), 1) as "% ما تيسّر من الاستماع"
from private.usage_human
group by day
order by day desc;

create or replace view private.usage_countries as
with today as (select (now() at time zone 'Asia/Riyadh')::date as d),
latest as (
  select distinct on (device_id) device_id, coalesce(tz, 'غير معروفة') as tz, day
  from private.usage_human, today
  where day > today.d - 30
  order by device_id, day desc
)
select
  tz as "المنطقة الزمنية",
  count(*) filter (where day > (select d from today) - 7) as "أجهزة في ٧ أيام",
  count(*) as "أجهزة في ٣٠ يومًا"
from latest
group by tz
order by 3 desc, 2 desc, 1;

create or replace view private.usage_summary as
with t as (select (now() at time zone 'Asia/Riyadh')::date as d),
p(k, since) as (
  select 1, d from t union all select 2, d - 6 from t union all select 3, d - 29 from t
),
firsts as (select device_id, min(day) as first_day from private.usage_human group by device_id),
rows as (
  -- القائمة الصريحة تطابق ما ثبّته الإنتاج حين أُنشئت اللوحة قبل إضافة أعمدة التشخيص
  select p.k, p.since, u.device_id, u.day, u.platform, u.installed, u.home, u.prayer,
         u.khatmahs, u.adhkar, u.quran, u.reader, u.listen, u.listen_seconds,
         u.tayassar_seconds, u.updated_at, u.tz, u.bot, f.first_day
  from p
  join private.usage_human u on u.day between p.since and (select d from t)
  join firsts f on f.device_id = u.device_id
),
agg as (
  select p.k,
    count(distinct r.device_id) as active,
    count(distinct r.device_id) filter (where r.installed) as installed,
    count(distinct r.device_id) filter (where r.first_day >= p.since) as fresh,
    count(distinct r.device_id) filter (where r.home > 0) as home,
    count(distinct r.device_id) filter (where r.quran > 0) as quran,
    count(distinct r.device_id) filter (where r.reader > 0) as reader,
    count(distinct r.device_id) filter (where r.listen > 0) as listen,
    count(distinct r.device_id) filter (where r.khatmahs > 0) as khatmahs,
    count(distinct r.device_id) filter (where r.prayer > 0) as prayer,
    count(distinct r.device_id) filter (where r.adhkar > 0) as adhkar,
    count(distinct r.device_id) filter (where r.listen_seconds > 0) as listeners,
    coalesce(sum(r.listen_seconds), 0) as secs,
    coalesce(sum(r.tayassar_seconds), 0) as tsecs
  from p left join rows r on r.k = p.k
  group by p.k
),
regions as (
  select k, string_agg(tz || ' ' || n, '، ' order by n desc, tz) as list
  from (
    select k, coalesce(tz, 'غير معروفة') as tz, count(distinct device_id) as n
    from rows group by k, coalesce(tz, 'غير معروفة')
  ) x
  group by k
),
metrics as (
  select a.k, m.n, m.name, m.v
  from agg a
  left join regions g on g.k = a.k
  cross join lateral (values
    (1,  'أجهزة نشطة', a.active::text),
    (2,  'منها مثبّت', a.installed::text),
    (3,  'منها جديدة', a.fresh::text),
    (4,  '% فتحت الرئيسية', round(100.0 * a.home / nullif(a.active, 0))::text),
    (5,  '% فتحت فهرس القرآن', round(100.0 * a.quran / nullif(a.active, 0))::text),
    (6,  '% فتحت المصحف', round(100.0 * a.reader / nullif(a.active, 0))::text),
    (7,  '% فتحت مشغّل التلاوة', round(100.0 * a.listen / nullif(a.active, 0))::text),
    (8,  '% فتحت الختمات', round(100.0 * a.khatmahs / nullif(a.active, 0))::text),
    (9,  '% فتحت المواقيت', round(100.0 * a.prayer / nullif(a.active, 0))::text),
    (10, '% فتحت الأذكار', round(100.0 * a.adhkar / nullif(a.active, 0))::text),
    (11, 'مستمعون', a.listeners::text),
    (12, 'دقائق الاستماع', round(a.secs / 60.0)::text),
    (13, 'متوسط دقائق المستمع', round(a.secs / 60.0 / nullif(a.listeners, 0), 1)::text),
    (14, '% ما تيسّر من الاستماع', round(100.0 * a.tsecs / nullif(a.secs, 0))::text),
    (15, 'المناطق الزمنية', g.list)
  ) as m(n, name, v)
)
select
  name as "المقياس",
  max(v) filter (where k = 1) as "اليوم",
  max(v) filter (where k = 2) as "آخر ٧ أيام",
  max(v) filter (where k = 3) as "آخر ٣٠ يومًا"
from metrics
group by n, name
order by n;

create or replace view private.usage_storage as
select
  day as "اليوم",
  count(*) filter (where platform = 'android' and installed) as "أندرويد مثبّت",
  count(*) filter (where platform = 'android' and installed and persisted) as "منها بتخزين دائم",
  count(*) filter (where platform = 'android' and installed and persisted = false) as "منها دون تخزين دائم",
  coalesce(sum(storage_reset), 0) as "فتح على تخزين ممسوح",
  coalesce(sum(pack_fresh), 0) as "تنزيل المصحف من الصفر"
from private.usage_human
group by day
order by day desc;

-- ---------------------------------------------------------------------------
-- المشغّلات: بث التغييرات للمتصفحات، وطابور إشعار اكتمال الختمة
-- ---------------------------------------------------------------------------
CREATE TRIGGER broadcast_khatmah_change AFTER INSERT OR DELETE OR UPDATE ON public.juz FOR EACH ROW EXECUTE FUNCTION private.broadcast_khatmah_change();
CREATE TRIGGER broadcast_khatmah_change AFTER INSERT OR DELETE OR UPDATE ON public.khatmah FOR EACH ROW EXECUTE FUNCTION private.broadcast_khatmah_change();
CREATE TRIGGER broadcast_khatmah_change AFTER INSERT OR DELETE OR UPDATE ON public.members FOR EACH ROW EXECUTE FUNCTION private.broadcast_khatmah_change();
CREATE TRIGGER queue_khatmah_completion AFTER UPDATE OF status ON public.juz FOR EACH ROW WHEN (((new.status = 'done'::text) AND (old.status IS DISTINCT FROM new.status))) EXECUTE FUNCTION private.capture_khatmah_completion();

-- ---------------------------------------------------------------------------
-- الصلاحيات: لا شيء للزوار إلا ما يُمنح صراحةً هنا
-- ---------------------------------------------------------------------------
alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public revoke execute on functions from public, anon, authenticated;
alter default privileges for role postgres in schema public grant all on tables to service_role;
alter default privileges for role postgres in schema public grant all on sequences to service_role;
alter default privileges for role postgres in schema public grant execute on functions to service_role;

revoke all on all tables in schema public from public, anon, authenticated;
revoke all on all sequences in schema public from public, anon, authenticated;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
revoke all on all tables in schema private from public, anon, authenticated, service_role;
revoke all on all functions in schema public from public, anon, authenticated, service_role;
revoke all on all functions in schema private from public, anon, authenticated, service_role;

grant execute on function public._member_device_ok to service_role;
grant execute on function public._organizer_device_ok to service_role;
grant execute on function public.add_member to service_role;
grant execute on function public.assign_juz to service_role;
grant execute on function public.change_organizer_code to service_role;
grant execute on function public.chat_for_done to service_role;
grant execute on function public.chat_linked to service_role;
grant execute on function public.chat_of to service_role;
grant execute on function public.chats_all to service_role;
grant execute on function public.claim_completion_notifications to service_role;
grant execute on function public.claim_juz to service_role;
grant execute on function public.confirm_tg_login to service_role;
grant execute on function public.create_khatmah to service_role;
grant execute on function public.delete_khatmah to service_role;
grant execute on function public.due_reminders to service_role;
grant execute on function public.events_purge to service_role;
grant execute on function public.finish_tg_login to service_role;
grant execute on function public.gen_code to service_role;
grant execute on function public.get_my_history to service_role;
grant execute on function public.get_state to service_role;
grant execute on function public.issue_login_link to service_role;
grant execute on function public.khatmah_done_info to service_role;
grant execute on function public.leave_khatmah to service_role;
grant execute on function public.link_telegram to service_role;
grant execute on function public.list_active_khatmahs to service_role;
grant execute on function public.log_event to service_role;
grant execute on function public.make_link_code to service_role;
grant execute on function public.match_khatmah_code to service_role;
grant execute on function public.merge_members to service_role;
grant execute on function public.new_round_info to service_role;
grant execute on function public.notification_finish to service_role;
grant execute on function public.open_public_khatmah to service_role;
grant execute on function public.purge_abandoned to service_role;
grant execute on function public.record_pwa_install to service_role;
grant execute on function public.record_usage to service_role;
grant execute on function public.redeem_login_link to service_role;
grant execute on function public.release_juz to service_role;
grant execute on function public.release_name to service_role;
grant execute on function public.remove_member to service_role;
grant execute on function public.rest_in to service_role;
grant execute on function public.set_done to service_role;
grant execute on function public.set_exempt to service_role;
grant execute on function public.set_my_reminder to service_role;
grant execute on function public.set_name_access to service_role;
grant execute on function public.share_clear to service_role;
grant execute on function public.share_decide to service_role;
grant execute on function public.share_draft to service_role;
grant execute on function public.share_open to service_role;
grant execute on function public.share_purge to service_role;
grant execute on function public.share_submit to service_role;
grant execute on function public.sign_in to service_role;
grant execute on function public.start_tg_login to service_role;
grant execute on function public.transfer_organizer to service_role;
grant execute on function public.unlink_by_chat to service_role;
grant execute on function public.unlink_telegram to service_role;
grant execute on function public.update_settings to service_role;
grant execute on function public.add_member to anon;
grant execute on function public.assign_juz to anon;
grant execute on function public.change_organizer_code to anon;
grant execute on function public.claim_juz to anon;
grant execute on function public.create_khatmah to anon;
grant execute on function public.finish_tg_login to anon;
grant execute on function public.get_my_history to anon;
grant execute on function public.get_state to anon;
grant execute on function public.leave_khatmah to anon;
grant execute on function public.list_active_khatmahs to anon;
grant execute on function public.log_event to anon;
grant execute on function public.make_link_code to anon;
grant execute on function public.match_khatmah_code to anon;
grant execute on function public.merge_members to anon;
grant execute on function public.open_public_khatmah to anon;
grant execute on function public.record_pwa_install to anon;
grant execute on function public.record_usage to anon;
grant execute on function public.redeem_login_link to anon;
grant execute on function public.release_juz to anon;
grant execute on function public.release_name to anon;
grant execute on function public.remove_member to anon;
grant execute on function public.set_done to anon;
grant execute on function public.set_exempt to anon;
grant execute on function public.set_my_reminder to anon;
grant execute on function public.set_name_access to anon;
grant execute on function public.sign_in to anon;
grant execute on function public.start_tg_login to anon;
grant execute on function public.transfer_organizer to anon;
grant execute on function public.update_settings to anon;
grant execute on function public.finish_tg_login to authenticated;
grant execute on function public.record_pwa_install to authenticated;
grant execute on function public.record_usage to authenticated;
grant execute on function public.redeem_login_link to authenticated;
grant execute on function public.set_name_access to authenticated;
grant execute on function public.start_tg_login to authenticated;
grant execute on function public.change_organizer_code to public;
grant execute on function public.leave_khatmah to public;
grant execute on function public.set_my_reminder to public;
grant execute on function public.transfer_organizer to public;
