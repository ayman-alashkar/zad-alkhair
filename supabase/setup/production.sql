-- إعداد خاص بمشروع الإنتاج، لا يدخل في اختبارات CI: مهام cron وسر vault.
-- يُشغَّل مرة واحدة بعد بناء القاعدة من supabase/migrations عند الاستعادة إلى
-- مشروع Supabase جديد. قيم الأسرار لا تُحفظ في المستودع:
--   select vault.create_secret('<قيمة CRON_SECRET نفسها في أسرار الوظائف>', 'zad_cron_secret');
-- وعنوان المشروع في الأوامر أدناه يُبدَّل إن تغيّر المشروع.

create extension if not exists pg_cron;

-- التذكير: كل خمس دقائق تستدعي send-reminders، وهي تحسب من حان موعده.
select cron.schedule('zad-reminders', '*/5 * * * *', $$
    select net.http_post(
      url := 'https://webqpbcijjbawatykoxe.supabase.co/functions/v1/send-reminders',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'zad_cron_secret')
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 60000
    );
  $$);

-- إعادة محاولة إشعارات اكتمال الختمة التي لم تُرسل فورًا.
select cron.schedule('zad-completion-retries', '* * * * *',
  'select private.dispatch_completion_notifications();');

-- التنظيف الأسبوعي: الختمات المهجورة، ومسودات المشاركة، والأحداث الأقدم من سنة.
select cron.schedule('zad-cleanup', '0 3 * * 0', $$
    select public.purge_abandoned(), public.share_purge(), public.events_purge();
  $$);
