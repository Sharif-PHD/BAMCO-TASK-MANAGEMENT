alter table public.chat_threads add column deleted_participant_name text;
alter table public.chat_threads add column participant_deleted_at timestamptz;
create or replace function public.delete_person_account(p_user_id uuid,p_actor_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r record;n int;photo_paths jsonb;affected_requests bigint[];person_name text;
begin
 perform pg_advisory_xact_lock(hashtextextended('bamco-delete-person',0));
 if p_actor_id is null or not exists(select 1 from public.profiles where id=p_actor_id and role='manager' and active) then raise exception 'دسترسی مدیر لازم است.' using errcode='42501';end if;
 if p_user_id is null or p_user_id=p_actor_id then raise exception 'حساب در حال استفاده را نمی‌توان حذف کرد.';end if;
 perform 1 from auth.users where id=p_user_id for update;
 if not found then return jsonb_build_object('ok',true,'already_deleted',true,'tasks_retained',0,'avatar_paths','[]'::jsonb);end if;
 perform set_config('request.jwt.claim.sub',p_actor_id::text,true);
 perform set_config('bamco.deleting_person',p_user_id::text,true);
 select full_name into person_name from public.profiles where id=p_user_id;
 update public.chat_messages set sender_name_snapshot=person_name where sender_id=p_user_id;
 update public.portal_messages set sender_name_snapshot=person_name where sender_id=p_user_id;
 update public.chat_threads t set is_active=false,deleted_participant_name=person_name,participant_deleted_at=now() where t.thread_type='direct' and exists(select 1 from public.chat_members m where m.thread_id=t.id and m.user_id=p_user_id);
 update public.change_requests set requester_name_snapshot=person_name where requested_by=p_user_id;
 update public.task_history set actor_name_snapshot=person_name where actor_id=p_user_id;
 update public.change_request_events set actor_name_snapshot=person_name where actor_id=p_user_id;
 select coalesce(jsonb_agg(name),'[]'::jsonb) into photo_paths from storage.objects where bucket_id='avatars' and split_part(name,'/',1)=p_user_id::text;
 update storage.objects set owner=p_actor_id,owner_id=p_actor_id::text where owner=p_user_id or owner_id=p_user_id::text;
 update public.tasks set owner_id=null where owner_id=p_user_id;get diagnostics n=row_count;
 update public.message_deliveries set status='cancelled',error_message='حساب گیرنده حذف شده است.' where recipient_id=p_user_id and status in ('ready','queued','failed');
 select coalesce(array_agg(distinct s.request_id),array[]::bigint[]) into affected_requests
 from public.request_approval_steps s join public.change_requests c on c.id=s.request_id
 where s.approver_id=p_user_id and s.decision='pending' and c.request_status in ('pending','in_review');
 update public.change_requests set request_status='needs_revision',manager_note='تأییدکننده حذف شده است؛ زنجیره را اصلاح و درخواست را دوباره ارسال کنید.' where id=any(affected_requests);
 update public.request_approval_steps set decision='needs_revision',note='حساب تأییدکننده حذف شده است.',decided_at=now() where approver_id=p_user_id and decision='pending';
 update public.change_requests set manager_note=concat_ws(E'\n',nullif(manager_note,''),'حساب درخواست‌دهنده حذف شده است؛ درخواست برای تصمیم‌گیری و تعیین متولی باقی مانده است.') where requested_by=p_user_id and request_status in ('draft','pending','in_review','needs_revision');
 delete from public.portal_message_recipients where recipient_id=p_user_id;
 -- Clear historical links; do not delete tasks, messages, stickers or audit rows.
 for r in select c.conrelid::regclass tab,a.attname col from pg_constraint c
 join pg_attribute a on a.attrelid=c.conrelid and a.attnum=c.conkey[1]
 where c.contype='f' and c.confrelid='public.profiles'::regclass and c.confdeltype<>'c'
 and c.conrelid<>'public.portal_message_recipients'::regclass
 loop execute format('update %s set %I=null where %I=$1',r.tab,r.col,r.col) using p_user_id;end loop;
 -- Auth deletion cascades native sessions/refresh tokens and the profile; profile
 -- deletion cascades app sessions, group/approval memberships and notifications.
 delete from auth.users where id=p_user_id;
 if exists(select 1 from auth.users where id=p_user_id) or exists(select 1 from public.profiles where id=p_user_id) then raise exception 'حذف حساب تأیید نشد.';end if;
 perform set_config('bamco.deleting_person','',true);
 return jsonb_build_object('ok',true,'tasks_retained',n,'avatar_paths',photo_paths);
end $$;
revoke all on function public.delete_person_account(uuid,uuid) from public,anon,authenticated;
grant execute on function public.delete_person_account(uuid,uuid) to service_role;
notify pgrst,'reload schema';
-- The inner subtransaction rolls every fixture back, including Auth users.
do $test$
declare mid uuid;uid uuid:=gen_random_uuid();sid uuid:=gen_random_uuid();tid bigint;aid bigint;gid uuid;did uuid;pmid bigint;bid uuid;cid bigint;reqid bigint;r record;n bigint;outcome jsonb;denied boolean;before_tasks jsonb;after_tasks jsonb;
begin
 begin
  select id into mid from public.profiles where role='manager' and active order by id limit 1;
  if mid is null then raise exception 'A manager is required';end if;
  perform set_config('request.jwt.claim.sub',mid::text,true);
  insert into auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
  values(uid,'authenticated','authenticated','people-qa-'||uid::text||'@example.invalid','{"provider":"email","providers":["email"]}',jsonb_build_object('full_name','__PEOPLE_DELETE_QA__'),now(),now());
  update public.profiles set active=true,messaging_enabled=true where id=uid;
  insert into auth.sessions(id,user_id,created_at,updated_at) values(sid,uid,now(),now());
  insert into public.user_sessions(user_id,last_activity_at) values(uid,now());
  insert into public.tasks(title,description,owner_id,status,priority,start_date,due_date,created_by)
  values('__PEOPLE_DELETE_QA_ACTIVE__','preserve description',uid,'در حال انجام','متوسط',current_date,current_date+5,uid) returning id into tid;
  insert into public.tasks(title,owner_id,status,priority,start_date,due_date,done_date,archived,created_by)
  values('__PEOPLE_DELETE_QA_ARCHIVED__',uid,'انجام شده','متوسط',current_date-5,current_date,current_date,true,uid) returning id into aid;
  select jsonb_agg(jsonb_build_array(id,title,description,status,start_date,due_date,done_date,archived) order by id) into before_tasks from public.tasks where id in (tid,aid);
  insert into public.portal_messages(sender_id,subject,body) values(uid,'__PEOPLE_QA__','__PEOPLE_QA__') returning id into pmid;
  insert into public.portal_message_recipients(message_id,recipient_id) values(pmid,uid);
  insert into public.chat_threads(thread_type,title,created_by) values('group','__PEOPLE_QA__',uid) returning id into gid;
  insert into public.chat_members(thread_id,user_id,member_role) values(gid,uid,'owner'),(gid,mid,'member');
  insert into public.chat_messages(thread_id,sender_id,body) values(gid,uid,'__PEOPLE_QA__');
  insert into public.chat_threads(thread_type,title,created_by) values('direct','__PEOPLE_DIRECT_QA__',uid) returning id into did;
  insert into public.chat_members(thread_id,user_id,member_role) values(did,uid,'member'),(did,mid,'member');
  insert into public.chat_messages(thread_id,sender_id,body) values(did,uid,'__DIRECT_HISTORY_QA__');
  insert into storage.objects(bucket_id,name,owner,owner_id) values('avatars',uid::text||'/qa.png',uid,uid::text);
  insert into public.change_requests(requested_by,request_type,request_status,proposed_data) values(uid,'create','pending',jsonb_build_object('title','__PEOPLE_QA__','owner_id',uid)) returning id into reqid;
  bid:=public.prepare_workflow_messages(array[uid],jsonb_build_object(uid::text,'portal'),'__PEOPLE_QA__','__PEOPLE_QA__');
  update public.message_batches set created_by=uid where id=bid;
  update public.message_deliveries set status='queued' where batch_id=bid;
  execute 'set local role authenticated';
  denied:=false;begin perform public.delete_person_account(uid,mid);exception when insufficient_privilege then denied:=true;end;
  if not denied then raise exception 'Browser role can call privileged account deletion';end if;
  denied:=false;begin update public.tasks set owner_id=null,owner_deleted_at=now(),former_owner_name='forged' where id=tid;exception when raise_exception then denied:=true;end;
  if not denied then raise exception 'Manual owner-removal marker was accepted';end if;
  execute 'reset role';execute 'set local role service_role';
  denied:=false;begin perform public.delete_person_account(mid,mid);exception when raise_exception then denied:=true;end;
  if not denied then raise exception 'Self deletion accepted';end if;
  denied:=false;begin perform public.delete_person_account(mid,uid);exception when insufficient_privilege then denied:=true;end;
  if not denied then raise exception 'Nonmanager actor accepted';end if;
  outcome:=public.delete_person_account(uid,mid);
  if (outcome->>'tasks_retained')::int<>2 then raise exception 'Retained task count incorrect';end if;
  execute 'reset role';
  if exists(select 1 from auth.users where id=uid) or exists(select 1 from auth.sessions where user_id=uid) or exists(select 1 from public.profiles where id=uid) or exists(select 1 from public.user_sessions where user_id=uid) or exists(select 1 from public.chat_members where user_id=uid) then raise exception 'Account/session/membership survived deletion';end if;
  select jsonb_agg(jsonb_build_array(id,title,description,status,start_date,due_date,done_date,archived) order by id) into after_tasks from public.tasks where id in (tid,aid);
  if before_tasks is distinct from after_tasks then raise exception 'Task content, dates, status or archive changed';end if;
  if (select count(*) from public.tasks where id in(tid,aid) and owner_id is null and former_owner_name='__PEOPLE_DELETE_QA__' and owner_deleted_at is not null)<>2 then raise exception 'Task deletion annotations missing';end if;
  if not exists(select 1 from public.change_requests where id=reqid and request_status='pending' and requested_by is null and requester_name_snapshot='__PEOPLE_DELETE_QA__') then raise exception 'Open request was decided automatically or history was lost';end if;
  if exists(select 1 from public.message_deliveries where batch_id=bid and (recipient_id is not null or status<>'cancelled')) then raise exception 'Queued recipient delivery not cancelled';end if;
  if not exists(select 1 from public.chat_messages where thread_id=gid and sender_id is null and sender_name_snapshot='__PEOPLE_DELETE_QA__') then raise exception 'Conversation history lost';end if;
  perform set_config('request.jwt.claim.sub',uid::text,true);execute 'set local role authenticated';
  -- Simulates the old signed access-token subject after physical Auth deletion.
  for r in select c.oid::regclass tab from pg_class c join pg_namespace ns on ns.oid=c.relnamespace where ns.nspname='public' and c.relkind='r' and c.relrowsecurity loop
   begin execute format('select count(*) from %s',r.tab) into n;exception when insufficient_privilege then n:=0;end;if n<>0 then raise exception 'Deleted identity can still read %',r.tab;end if;
  end loop;
  select count(*) into n from storage.objects;if n<>0 then raise exception 'Deleted identity can read Storage';end if;
  denied:=false;begin perform public.chat_send_message(gid,'__DENIED__',null);exception when raise_exception then denied:=true;end;if not denied then raise exception 'Deleted identity sent chat';end if;
  denied:=false;begin insert into storage.objects(bucket_id,name) values('avatars',uid::text||'/unauthorized.png');exception when insufficient_privilege then denied:=true;end;if not denied then raise exception 'Deleted identity uploaded avatar';end if;
  execute 'reset role';perform set_config('request.jwt.claim.sub',mid::text,true);execute 'set local role authenticated';
  if not exists(select 1 from public.chat_threads where id=did and is_active=false and deleted_participant_name='__PEOPLE_DELETE_QA__') or not exists(select 1 from public.chat_messages where thread_id=did and body='__DIRECT_HISTORY_QA__' and sender_name_snapshot='__PEOPLE_DELETE_QA__') then raise exception 'Surviving member cannot read archived direct conversation';end if;
  update public.tasks set owner_id=mid where id=tid;
  if not exists(select 1 from public.tasks where id=tid and owner_id=mid and owner_deleted_at is null and former_owner_name is null) or not exists(select 1 from public.tasks where id=aid and owner_id is null and owner_deleted_at is not null) then raise exception 'Individual transfer changed another task or retained obsolete marker';end if;
  execute 'reset role';execute 'set local role service_role';outcome:=public.delete_person_account(uid,mid);if outcome->>'already_deleted'<>'true' then raise exception 'Retry is not idempotent';end if;
  execute 'reset role';
  raise exception 'rollback fixtures' using errcode='ZX001';
 exception when sqlstate 'ZX001' then null;
 end;
end $test$;
