-- The domain-migration campaign is complete. Reminder delivery remains on its
-- own five-minute schedule; the retired campaign dispatcher must not run.
select cron.unschedule('zad-telegram-migration')
where exists (
  select 1 from cron.job where jobname = 'zad-telegram-migration'
);
