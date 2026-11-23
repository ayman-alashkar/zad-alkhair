create table if not exists public.origin_migration_handoffs (
  token_hash text primary key,
  payload text not null,
  iv text not null,
  client_hash text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  redeemed_at timestamptz,
  constraint origin_migration_token_hash_format
    check (token_hash ~ '^[0-9a-f]{64}$'),
  constraint origin_migration_payload_size
    check (octet_length(payload) <= 196608),
  constraint origin_migration_expiry_window
    check (expires_at > created_at and expires_at <= created_at + interval '30 minutes')
);

alter table public.origin_migration_handoffs enable row level security;

revoke all on table public.origin_migration_handoffs from public, anon, authenticated;
grant select, insert, update, delete on table public.origin_migration_handoffs to service_role;

create index if not exists origin_migration_handoffs_expires_at_idx
  on public.origin_migration_handoffs (expires_at);

create index if not exists origin_migration_handoffs_client_created_idx
  on public.origin_migration_handoffs (client_hash, created_at desc);

comment on table public.origin_migration_handoffs is
  'Short-lived encrypted browser-origin handoffs for the Zad Al-Khair domain migration.';
