-- Reproduce the old Edge Function failure and verify the corrected caller context.
-- This transaction rolls back every profile change, including updated_at.
begin;
do $$
declare manager_id uuid; owner_id uuid; denied boolean; changed public.profiles%rowtype;
begin
 select id into manager_id from public.profiles where active and role='manager' order by id limit 1;
 select id into owner_id from public.profiles where active and role='owner' order by id limit 1;
 if manager_id is null or owner_id is null then raise exception 'Active manager and owner required'; end if;
 perform set_config('request.jwt.claim.sub','',true);
 perform set_config('request.jwt.claims','{"role":"service_role"}',true);
 execute 'set local role service_role';
 denied:=false;
 begin
  update public.profiles set full_name='__QA_OLD_SERVICE_WRITE__' where id=owner_id;
 exception when raise_exception or insufficient_privilege then
  if sqlerrm not like '%مجاز نیست%' and sqlerrm not like '%permission denied for schema private%' then raise; end if;
  denied:=true;
 end;
 if not denied then raise exception 'Old service-role failure was not reproduced'; end if;
 execute 'reset role';
 perform set_config('request.jwt.claim.sub',manager_id::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',manager_id,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 update public.profiles set full_name='__QA_MANAGER_EDIT__',role='manager',gender='خانم',salutation='__QA_SALUTATION__',active=false,default_message_channel='both' where id=owner_id returning * into changed;
 if changed.id is distinct from owner_id or changed.full_name<>'__QA_MANAGER_EDIT__' or changed.role<>'manager' or changed.active or changed.default_message_channel<>'both' then raise exception 'Manager edit did not persist'; end if;
 update public.profiles set role='owner',active=true where id=owner_id;
 execute 'reset role';
 perform set_config('request.jwt.claim.sub',owner_id::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 denied:=false;
 begin update public.profiles set role='manager' where id=owner_id;
 exception when raise_exception or insufficient_privilege then denied:=true; end;
 if not denied then raise exception 'Owner could promote their own account'; end if;
 update public.profiles set display_name='__QA_SELF_DISPLAY_NAME__' where id=owner_id;
 if not found then raise exception 'Allowed own-profile editing stopped working'; end if;
 execute 'reset role';
end $$;
rollback;
select 'PASS: old service-role rejection reproduced; manager name/role/status edits stored; owner escalation denied; own display-name edit allowed; all changes rolled back' as result;
