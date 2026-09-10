-- Run in a transaction: fixture audit rows and reconciliation are all rolled back.
begin;
do $$
declare person uuid; native_id uuid; orphan_id uuid; live_id uuid; denied boolean := false;
begin
  if has_function_privilege('anon','public.bamco_sync_sessions()','execute')
     or has_function_privilege('authenticated','public.bamco_session_auth_exists(uuid,uuid)','execute') then
    raise exception 'session privileges exposed';
  end if;
  perform set_config('request.jwt.claims',json_build_object('role','authenticated','sub',gen_random_uuid())::text,true);
  begin perform public.bamco_sync_sessions(); exception when others then
    if sqlerrm='forbidden' then denied:=true; else raise; end if;
  end;
  if not denied then raise exception 'nonmanager accepted'; end if;
  perform set_config('request.jwt.claims','{"role":"service_role"}',true);
  select s.id,s.user_id into native_id,person from auth.sessions s join public.profiles p on p.id=s.user_id
    where not exists(select 1 from public.user_sessions u where u.auth_session_id=s.id) limit 1;
  if native_id is null then raise exception 'no unused real session available for the rollback fixture'; end if;
  insert into public.user_sessions(user_id,auth_session_id) values(person,gen_random_uuid()) returning id into orphan_id;
  insert into public.user_sessions(user_id,auth_session_id) values(person,native_id) returning id into live_id;
  if not public.bamco_session_auth_exists(native_id,person) then raise exception 'valid native session missed'; end if;
  perform public.bamco_sync_sessions();
  if not exists(select 1 from public.user_sessions where id=orphan_id and logout_at is not null and ended_reason='logout') then raise exception 'orphan did not close'; end if;
  if not exists(select 1 from public.user_sessions where id=live_id and logout_at is null and revoked_at is null) then raise exception 'another active device closed'; end if;
end;
$$;
select 'session logout reconciliation and permission checks passed' result;
rollback;
