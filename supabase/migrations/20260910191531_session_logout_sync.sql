-- Keep audit history linked to the exact Auth login, never to all of a person's devices.
alter table public.user_sessions add column if not exists auth_session_id uuid;
create unique index if not exists user_sessions_auth_session_id_key
  on public.user_sessions(auth_session_id) where auth_session_id is not null;

create or replace function public.bamco_session_auth_exists(p_session_id uuid, p_user_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from auth.sessions where id=p_session_id and user_id=p_user_id);
$$;
revoke all on function public.bamco_session_auth_exists(uuid,uuid) from public, anon, authenticated;
grant execute on function public.bamco_session_auth_exists(uuid,uuid) to service_role;

-- Reconcile before reading a management report, including exits whose audit request failed.
create or replace function public.bamco_sync_sessions()
returns integer language plpgsql security definer set search_path = '' as $$
declare timeout_minutes integer := 30; changed integer;
begin
  if coalesce(auth.role(),'') <> 'service_role' and not coalesce(private.is_manager(),false) then
    raise exception 'forbidden';
  end if;
  select greatest(5,coalesce((value #>> '{}')::integer,30)) into timeout_minutes
    from public.app_settings where key='session.timeout_minutes';
  timeout_minutes := coalesce(timeout_minutes,30);
  update public.user_sessions u set
    logout_at = case when u.last_activity_at <= now()-make_interval(mins=>timeout_minutes)
      then u.last_activity_at+make_interval(mins=>timeout_minutes) else now() end,
    ended_reason = case when u.last_activity_at <= now()-make_interval(mins=>timeout_minutes)
      then 'inactivity' else 'logout' end
  where u.logout_at is null and u.revoked_at is null and (
    u.last_activity_at <= now()-make_interval(mins=>timeout_minutes)
    or (u.auth_session_id is not null and not exists(
      select 1 from auth.sessions s where s.id=u.auth_session_id and s.user_id=u.user_id))
    or (u.auth_session_id is null and not exists(
      select 1 from auth.sessions s where s.user_id=u.user_id))
  );
  get diagnostics changed = row_count;
  return changed;
end;
$$;
revoke all on function public.bamco_sync_sessions() from public, anon;
grant execute on function public.bamco_sync_sessions() to authenticated, service_role;
