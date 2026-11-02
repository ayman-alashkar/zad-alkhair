create table if not exists public.pwa_installs (
  device_id uuid primary key,
  platform text not null default 'other' check (platform in ('android','ios','desktop','other')),
  first_seen_at timestamptz not null default now(),
  install_accepted_at timestamptz,
  first_standalone_at timestamptz,
  last_seen_at timestamptz not null default now(),
  app_version text
);

alter table public.pwa_installs enable row level security;
revoke all on table public.pwa_installs from anon, authenticated;

create index if not exists pwa_installs_first_standalone_idx
  on public.pwa_installs (first_standalone_at)
  where first_standalone_at is not null;

create index if not exists pwa_installs_platform_idx
  on public.pwa_installs (platform);

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

revoke all on function public.record_pwa_install(uuid,text,text,text) from public;
grant execute on function public.record_pwa_install(uuid,text,text,text) to anon, authenticated;
