-- بقايا نقل النطاق (أغسطس ٢٠٢٦): الجدولان والدالة لم يعد يستدعيها شيء منذ إيقاف النقل.
-- تُحفظ الصفوف القليلة في أرشيف خاص قبل الحذف، ويُحذف الأرشيف مع تنظيف المرحلة ٤.
create table private.retired_domain_migration_rows (
  source text not null,
  row_data jsonb not null,
  archived_at timestamptz not null default now()
);
alter table private.retired_domain_migration_rows enable row level security;
revoke all on private.retired_domain_migration_rows from public, anon, authenticated;

insert into private.retired_domain_migration_rows (source, row_data)
select 'member_domain_migrations', to_jsonb(t) from public.member_domain_migrations t
union all
select 'origin_migration_handoffs', to_jsonb(t) - 'payload' - 'iv' from public.origin_migration_handoffs t;

drop function public.complete_origin_domain_migration(text, jsonb, text);
drop table public.member_domain_migrations;
drop table public.origin_migration_handoffs;
