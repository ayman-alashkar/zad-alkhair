create extension if not exists pgcrypto with schema extensions;

create table if not exists public.member_domain_migrations (
  khatmah_id uuid not null,
  member_id text not null,
  campaign_key text not null,
  first_source text not null,
  last_source text not null,
  first_completed_at timestamptz not null default now(),
  last_completed_at timestamptz not null default now(),
  primary key (khatmah_id, member_id, campaign_key),
  constraint member_domain_migrations_member_fkey
    foreign key (khatmah_id, member_id)
    references public.members (khatmah_id, mid) on delete cascade,
  constraint member_domain_migrations_source_check
    check (first_source in ('ordinary', 'telegram') and last_source in ('ordinary', 'telegram')),
  constraint member_domain_migrations_campaign_check
    check (campaign_key ~ '^[a-z0-9][a-z0-9_-]{2,63}$')
);

alter table public.member_domain_migrations enable row level security;
revoke all on table public.member_domain_migrations from public, anon, authenticated;
grant select, insert, update, delete on table public.member_domain_migrations to service_role;

create index if not exists member_domain_migrations_campaign_idx
  on public.member_domain_migrations (campaign_key, last_completed_at desc);

create table if not exists public.telegram_migration_tokens (
  token_hash text primary key,
  chat_id bigint not null,
  campaign_key text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  redeemed_at timestamptz,
  device_hash text,
  confirmed_at timestamptz,
  constraint telegram_migration_tokens_hash_check
    check (token_hash ~ '^[0-9a-f]{64}$'),
  constraint telegram_migration_tokens_device_hash_check
    check (device_hash is null or device_hash ~ '^[0-9a-f]{64}$'),
  constraint telegram_migration_tokens_campaign_check
    check (campaign_key ~ '^[a-z0-9][a-z0-9_-]{2,63}$'),
  constraint telegram_migration_tokens_expiry_check
    check (expires_at > created_at and expires_at <= created_at + interval '31 days')
);

alter table public.telegram_migration_tokens enable row level security;
revoke all on table public.telegram_migration_tokens from public, anon, authenticated;
grant select, insert, update, delete on table public.telegram_migration_tokens to service_role;

create index if not exists telegram_migration_tokens_expires_idx
  on public.telegram_migration_tokens (expires_at);

create index if not exists telegram_migration_tokens_chat_idx
  on public.telegram_migration_tokens (chat_id, created_at desc);

create table if not exists public.telegram_migration_deliveries (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  campaign_key text not null,
  chat_id bigint not null,
  status text not null default 'pending',
  attempts integer not null default 0,
  claimed_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  constraint telegram_migration_deliveries_kind_check
    check (kind in ('campaign', 'welcome')),
  constraint telegram_migration_deliveries_status_check
    check (status in ('pending', 'sent', 'cancelled', 'permanent_failed')),
  constraint telegram_migration_deliveries_campaign_check
    check (campaign_key ~ '^[a-z0-9][a-z0-9_-]{2,63}$'),
  constraint telegram_migration_deliveries_attempts_check
    check (attempts >= 0),
  unique (kind, campaign_key, chat_id)
);

alter table public.telegram_migration_deliveries enable row level security;
revoke all on table public.telegram_migration_deliveries from public, anon, authenticated;
grant select, insert, update, delete on table public.telegram_migration_deliveries to service_role;

create index if not exists telegram_migration_deliveries_pending_idx
  on public.telegram_migration_deliveries (status, claimed_at, created_at)
  where status = 'pending';

create or replace function public.issue_telegram_migration_token(
  p_chat bigint,
  p_lifetime_seconds integer default 172800,
  p_campaign_key text default 'final-domain-v1'
)
returns json
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_token text;
  v_seconds integer;
  v_needed boolean;
begin
  if p_chat is null
     or p_campaign_key !~ '^[a-z0-9][a-z0-9_-]{2,63}$'
     or not exists (
       select 1 from public.members m
       where m.tg_chat_id = p_chat and m.left_at is null
     ) then
    return json_build_object('ok', false, 'error', 'not_linked');
  end if;

  select exists (
    select 1
      from public.members m
     where m.tg_chat_id = p_chat
       and m.left_at is null
       and not exists (
         select 1 from public.member_domain_migrations d
          where d.khatmah_id = m.khatmah_id
            and d.member_id = m.mid
            and d.campaign_key = p_campaign_key
       )
  ) into v_needed;
  if not v_needed then
    return json_build_object('ok', true, 'needed', false);
  end if;

  v_seconds := greatest(300, least(coalesce(p_lifetime_seconds, 172800), 2678400));
  delete from public.telegram_migration_tokens
   where expires_at < now() - interval '1 day';

  loop
    v_token := rtrim(translate(encode(gen_random_bytes(32), 'base64'), '+/', '-_'), '=');
    begin
      insert into public.telegram_migration_tokens(
        token_hash, chat_id, campaign_key, expires_at
      ) values (
        encode(digest(v_token, 'sha256'), 'hex'),
        p_chat,
        p_campaign_key,
        now() + make_interval(secs => v_seconds)
      );
      exit;
    exception when unique_violation then
      null;
    end;
  end loop;

  return json_build_object('ok', true, 'needed', true, 'token', v_token, 'expiresIn', v_seconds);
end;
$$;

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

  if not found or v_row.expires_at <= now() or v_row.confirmed_at is not null then
    return json_build_object('ok', false, 'error', 'expired_or_used');
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

create or replace function public.confirm_telegram_migration_token(
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
  v_count integer := 0;
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

  if not found or v_row.expires_at <= now()
     or v_row.redeemed_at is null or v_row.device_hash <> v_device_hash then
    return json_build_object('ok', false, 'error', 'expired_or_unclaimed');
  end if;
  if v_row.confirmed_at is not null then
    return json_build_object('ok', true, 'already', true);
  end if;

  update public.members
     set devices = case
       when p_device = any(coalesce(devices, '{}'::text[])) then coalesce(devices, '{}'::text[])
       else array_append(coalesce(devices, '{}'::text[]), p_device)
     end
   where tg_chat_id = v_row.chat_id
     and left_at is null;
  get diagnostics v_count = row_count;

  insert into public.member_domain_migrations(
    khatmah_id, member_id, campaign_key, first_source, last_source
  )
  select m.khatmah_id, m.mid, v_row.campaign_key, 'telegram', 'telegram'
    from public.members m
   where m.tg_chat_id = v_row.chat_id and m.left_at is null
  on conflict (khatmah_id, member_id, campaign_key)
  do update set last_source = excluded.last_source, last_completed_at = now();

  insert into public.telegram_migration_deliveries(kind, campaign_key, chat_id)
  values ('welcome', v_row.campaign_key, v_row.chat_id)
  on conflict (kind, campaign_key, chat_id) do nothing;

  update public.telegram_migration_deliveries
     set status = 'cancelled', claimed_at = null
   where kind = 'campaign'
     and campaign_key = v_row.campaign_key
     and chat_id = v_row.chat_id
     and status = 'pending';

  update public.telegram_migration_tokens
     set confirmed_at = now()
   where token_hash = v_hash;

  return json_build_object('ok', v_count > 0, 'members', v_count, 'chatId', v_row.chat_id);
end;
$$;

create or replace function public.complete_origin_domain_migration(
  p_device text,
  p_profiles jsonb,
  p_campaign_key text default 'final-domain-v1'
)
returns json
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count integer := 0;
  v_chats jsonb := '[]'::jsonb;
begin
  if char_length(coalesce(p_device, '')) not between 8 and 128
     or p_device ~ '[[:cntrl:]]'
     or jsonb_typeof(p_profiles) <> 'array'
     or p_campaign_key !~ '^[a-z0-9][a-z0-9_-]{2,63}$' then
    return json_build_object('ok', false, 'error', 'invalid_request');
  end if;

  with requested as (
    select nullif(item->>'khatmahId', '')::uuid as khatmah_id,
           item->>'mid' as mid
      from jsonb_array_elements(p_profiles) item
     where item ? 'khatmahId' and item ? 'mid'
  ), valid as (
    select distinct m.khatmah_id, m.mid, m.tg_chat_id
      from requested r
      join public.members m
        on m.khatmah_id = r.khatmah_id and m.mid = r.mid
     where m.left_at is null
       and (m.device = p_device or p_device = any(coalesce(m.devices, '{}'::text[])))
  ), migrated as (
    insert into public.member_domain_migrations(
      khatmah_id, member_id, campaign_key, first_source, last_source
    )
    select khatmah_id, mid, p_campaign_key, 'ordinary', 'ordinary'
      from valid
    on conflict (khatmah_id, member_id, campaign_key)
    do update set last_source = excluded.last_source, last_completed_at = now()
    returning khatmah_id, member_id
  )
  select count(*) into v_count from migrated;

  with requested as (
    select nullif(item->>'khatmahId', '')::uuid as khatmah_id,
           item->>'mid' as mid
      from jsonb_array_elements(p_profiles) item
     where item ? 'khatmahId' and item ? 'mid'
  ), valid_chats as (
    select distinct m.tg_chat_id as chat_id
      from requested r
      join public.members m
        on m.khatmah_id = r.khatmah_id and m.mid = r.mid
     where m.left_at is null
       and m.tg_chat_id is not null
       and (m.device = p_device or p_device = any(coalesce(m.devices, '{}'::text[])))
  ), queued as (
    insert into public.telegram_migration_deliveries(kind, campaign_key, chat_id)
    select 'welcome', p_campaign_key, chat_id from valid_chats
    on conflict (kind, campaign_key, chat_id) do nothing
    returning chat_id
  )
  select coalesce(jsonb_agg(chat_id), '[]'::jsonb) into v_chats
    from valid_chats;

  update public.telegram_migration_deliveries d
     set status = 'cancelled', claimed_at = null
   where d.kind = 'campaign'
     and d.campaign_key = p_campaign_key
     and d.status = 'pending'
     and d.chat_id in (select value::text::bigint from jsonb_array_elements(v_chats));

  return json_build_object('ok', v_count > 0, 'members', v_count, 'chatIds', v_chats);
exception when invalid_text_representation then
  return json_build_object('ok', false, 'error', 'invalid_profiles');
end;
$$;

create or replace function public.enqueue_telegram_migration_campaign(
  p_campaign_key text default 'final-domain-v1'
)
returns json
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_inserted integer := 0;
begin
  if p_campaign_key !~ '^[a-z0-9][a-z0-9_-]{2,63}$' then
    return json_build_object('ok', false, 'error', 'invalid_campaign');
  end if;

  insert into public.telegram_migration_deliveries(kind, campaign_key, chat_id)
  select distinct 'campaign', p_campaign_key, m.tg_chat_id
    from public.members m
   where m.tg_chat_id is not null
     and m.left_at is null
     and not exists (
       select 1 from public.member_domain_migrations d
        where d.khatmah_id = m.khatmah_id
          and d.member_id = m.mid
          and d.campaign_key = p_campaign_key
     )
  on conflict (kind, campaign_key, chat_id) do nothing;
  get diagnostics v_inserted = row_count;

  return json_build_object('ok', true, 'queued', v_inserted);
end;
$$;

create or replace function public.claim_telegram_migration_deliveries(
  p_limit integer default 20,
  p_chat bigint default null
)
returns json
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_result json;
begin
  delete from public.telegram_migration_tokens
   where expires_at < now() - interval '1 day';

  with candidates as (
    select d.id
      from public.telegram_migration_deliveries d
     where d.status = 'pending'
       and (p_chat is null or d.chat_id = p_chat)
       and (d.claimed_at is null or d.claimed_at < now() - interval '15 minutes')
     order by case d.kind when 'welcome' then 0 else 1 end, d.created_at
     for update skip locked
     limit greatest(1, least(coalesce(p_limit, 20), 50))
  ), claimed as (
    update public.telegram_migration_deliveries d
       set claimed_at = now(), attempts = attempts + 1
      from candidates c
     where d.id = c.id
    returning d.id, d.kind, d.campaign_key, d.chat_id, d.attempts
  )
  select coalesce(json_agg(json_build_object(
    'id', id,
    'kind', kind,
    'campaignKey', campaign_key,
    'chatId', chat_id,
    'attempts', attempts
  )), '[]'::json) into v_result
  from claimed;

  return v_result;
end;
$$;

create or replace function public.finish_telegram_migration_delivery(
  p_delivery uuid,
  p_ok boolean,
  p_permanent boolean default false
)
returns json
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_updated integer := 0;
begin
  update public.telegram_migration_deliveries
     set status = case
       when p_ok then 'sent'
       when p_permanent then 'permanent_failed'
       else 'pending'
     end,
     sent_at = case when p_ok then now() else sent_at end,
     claimed_at = null
   where id = p_delivery and status = 'pending';
  get diagnostics v_updated = row_count;
  return json_build_object('ok', v_updated > 0);
end;
$$;

revoke all on function public.issue_telegram_migration_token(bigint, integer, text) from public, anon, authenticated;
revoke all on function public.redeem_telegram_migration_token(text, text) from public, anon, authenticated;
revoke all on function public.confirm_telegram_migration_token(text, text) from public, anon, authenticated;
revoke all on function public.complete_origin_domain_migration(text, jsonb, text) from public, anon, authenticated;
revoke all on function public.enqueue_telegram_migration_campaign(text) from public, anon, authenticated;
revoke all on function public.claim_telegram_migration_deliveries(integer, bigint) from public, anon, authenticated;
revoke all on function public.finish_telegram_migration_delivery(uuid, boolean, boolean) from public, anon, authenticated;

grant execute on function public.issue_telegram_migration_token(bigint, integer, text) to service_role;
grant execute on function public.redeem_telegram_migration_token(text, text) to service_role;
grant execute on function public.confirm_telegram_migration_token(text, text) to service_role;
grant execute on function public.complete_origin_domain_migration(text, jsonb, text) to service_role;
grant execute on function public.enqueue_telegram_migration_campaign(text) to service_role;
grant execute on function public.claim_telegram_migration_deliveries(integer, bigint) to service_role;
grant execute on function public.finish_telegram_migration_delivery(uuid, boolean, boolean) to service_role;

comment on table public.member_domain_migrations is
  'Server-side completion state for the one-time Zad Al-Khair final-domain migration.';
comment on table public.telegram_migration_tokens is
  'Hashed, expiring, device-bound tokens issued only for Telegram-linked members.';
comment on table public.telegram_migration_deliveries is
  'Idempotent Telegram outbox for migration invitations and one-time welcome messages.';

do $$
declare
  v_job_id bigint;
begin
  select jobid into v_job_id from cron.job where jobname = 'zad-telegram-migration';
  if v_job_id is not null then perform cron.unschedule(v_job_id); end if;

  perform cron.schedule(
    'zad-telegram-migration',
    '*/15 * * * *',
    $job$
      select net.http_post(
        url := 'https://webqpbcijjbawatykoxe.supabase.co/functions/v1/telegram-migration',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-cron-secret', (
            select decrypted_secret from vault.decrypted_secrets
            where name = 'zad_cron_secret'
          )
        ),
        body := '{"action":"dispatch"}'::jsonb,
        timeout_milliseconds := 60000
      );
    $job$
  );
end;
$$;
