-- The domain-migration campaign is complete. Reminder delivery remains on its
-- own five-minute schedule; the retired campaign dispatcher must not run.
select cron.unschedule('zad-telegram-migration')
where exists (
  select 1 from cron.job where jobname = 'zad-telegram-migration'
);

-- Remove the one-off Telegram migration subsystem. It is not used by
-- activation, reminders, or the canonical application anymore.
drop function if exists public.finish_telegram_migration_delivery(uuid, boolean, boolean);
drop function if exists public.claim_telegram_migration_deliveries(integer, bigint);
drop function if exists public.enqueue_telegram_migration_campaign(text);
drop function if exists public.confirm_telegram_migration_token(text, text);
drop function if exists public.redeem_telegram_migration_token(text, text);
drop function if exists public.issue_telegram_migration_token(bigint, integer, text);

drop table if exists public.telegram_migration_deliveries;
drop table if exists public.telegram_migration_tokens;
