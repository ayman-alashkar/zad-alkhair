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

revoke all on function public.claim_telegram_migration_deliveries(integer, bigint) from public, anon, authenticated;
grant execute on function public.claim_telegram_migration_deliveries(integer, bigint) to service_role;
