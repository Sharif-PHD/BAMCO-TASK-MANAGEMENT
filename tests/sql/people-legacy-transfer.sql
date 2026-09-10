-- Synthetic copies exercise legacy dates without editing any existing task.
do $test$
declare mid uuid;uid uuid:=gen_random_uuid();before_row jsonb;after_row jsonb;denied boolean;
begin
 begin
  select id into mid from public.profiles where role='manager' and active order by id limit 1;
  perform set_config('request.jwt.claim.sub',mid::text,true);
  insert into auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
  values(uid,'authenticated','authenticated','legacy-transfer-qa-'||uid::text||'@example.invalid','{"provider":"email","providers":["email"]}',jsonb_build_object('full_name','__LEGACY_TRANSFER_QA__'),now(),now());
  create temporary table people_legacy_probe (like public.tasks including defaults) on commit drop;
  -- Seed as imported historic data before attaching the current validation trigger.
  insert into people_legacy_probe(id,title,owner_id,created_by,status,priority,start_date,due_date,done_date,archived,row_version)
  values(1,'__LEGACY_TRANSFER_QA__',uid,uid,'در حال انجام','متوسط',current_date,current_date-5,current_date-2,false,1);
  create trigger legacy_rules before update on people_legacy_probe for each row execute function private.enforce_task_rules();
  select to_jsonb(t)-array['owner_id','created_by','former_owner_name','owner_deleted_at','last_updated_at','row_version'] into before_row from people_legacy_probe t;
  perform set_config('bamco.deleting_person',uid::text,true);
  update people_legacy_probe set owner_id=null;
  update people_legacy_probe set created_by=null;
  if not exists(select 1 from people_legacy_probe where owner_id is null and owner_deleted_at is not null and former_owner_name='__LEGACY_TRANSFER_QA__') then raise exception 'Legacy task reference removal failed';end if;
  perform set_config('bamco.deleting_person','',true);
  grant select,update on people_legacy_probe to authenticated;
  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub',uid::text,true);
  denied:=false;begin update people_legacy_probe set owner_id=mid;exception when insufficient_privilege then denied:=true;end;
  if not denied then raise exception 'Nonmanager reassigned legacy task';end if;
  perform set_config('request.jwt.claim.sub',mid::text,true);
  update people_legacy_probe set owner_id=mid;
  if not exists(select 1 from people_legacy_probe where owner_id=mid and owner_deleted_at is null and former_owner_name is null) then raise exception 'Manager could not transfer legacy task';end if;
  execute 'reset role';
  select to_jsonb(t)-array['owner_id','created_by','former_owner_name','owner_deleted_at','last_updated_at','row_version'] into after_row from people_legacy_probe t;
  if before_row is distinct from after_row then raise exception 'Legacy task history changed during deletion/transfer';end if;
  denied:=false;begin update people_legacy_probe set due_date=current_date-1;exception when raise_exception then denied:=true;end;
  if not denied then raise exception 'Normal date validation was weakened';end if;
  raise exception 'rollback fixtures' using errcode='ZX001';
 exception when sqlstate 'ZX001' then null;
 end;
end $test$;
