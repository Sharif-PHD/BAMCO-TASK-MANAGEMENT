create or replace function public.bamco_sync_sessions()
returns integer language plpgsql security definer set search_path = '' as $$
declare timeout_minutes integer := 30; changed integer; resumed integer := 0;
  current_auth_id text := auth.jwt()->>'session_id';
begin
  if coalesce(auth.role(),'') <> 'service_role' and not coalesce(private.is_manager(),false) then
    raise exception 'forbidden';
  end if;
  select greatest(5,coalesce((value #>> '{}')::integer,30)) into timeout_minutes
    from public.app_settings where key='session.timeout_minutes';
  timeout_minutes := coalesce(timeout_minutes,30);
  -- An authenticated request proves only this exact login is connected.
  -- Repair legacy page-close markers, never explicit logout, inactivity or revocation.
  if auth.uid() is not null and current_auth_id is not null then
    update public.user_sessions u set logout_at=null, ended_reason=null, last_activity_at=now()
    where u.user_id=auth.uid() and u.auth_session_id::text=current_auth_id
      and u.logout_at is not null and u.ended_reason='closed' and u.revoked_at is null
      and exists(select 1 from auth.sessions a where a.id=u.auth_session_id
        and a.user_id=u.user_id and (a.not_after is null or a.not_after>now()));
    get diagnostics resumed = row_count;
  end if;

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
  return changed+resumed;
end;
$$;
revoke all on function public.bamco_sync_sessions() from public, anon;
grant execute on function public.bamco_sync_sessions() to authenticated, service_role;
