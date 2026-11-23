
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table private.completed_khatmahs (
 khatmah_id uuid not null references public.khatmah(id) on delete cascade,
 round_no integer not null,
 code text not null,
 dedication text,
 readers integer not null,
 days integer not null,
 completed_at timestamptz not null default now(),
 primary key (khatmah_id,round_no)
);
alter table private.completed_khatmahs enable row level security;
revoke all on private.completed_khatmahs from public,anon,authenticated;

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
revoke all on function private.dispatch_completion_notifications() from public,anon,authenticated;

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
revoke all on function private.capture_khatmah_completion() from public,anon,authenticated;

-- Serialize completion and round changes using the existing khatmah row lock.
do $$
declare definition text;
begin
 select pg_get_functiondef(oid) into definition from pg_proc
 where pronamespace='public'::regnamespace and proname='set_done';
 if position('where code = upper(trim(p_code));' in definition)=0 then
   raise exception 'set_done changed; review before installing';
 end if;
 execute replace(definition,'where code = upper(trim(p_code));','where code = upper(trim(p_code)) for update;');
end $$;

create trigger queue_khatmah_completion
after update of status on public.juz for each row
when (new.status='done' and old.status is distinct from new.status)
execute function private.capture_khatmah_completion();

-- Restricted bridge for the worker; client roles cannot claim notifications.
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
revoke all on function public.claim_completion_notifications() from public,anon,authenticated;
grant execute on function public.claim_completion_notifications() to service_role;
select cron.schedule('zad-completion-retries','* * * * *',
 'select private.dispatch_completion_notifications();');
