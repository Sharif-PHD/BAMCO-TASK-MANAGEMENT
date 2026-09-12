CREATE OR REPLACE FUNCTION private.submit_preserved_change_request(p_request_type text, p_task_id bigint, p_proposed_data jsonb, p_note text DEFAULT NULL::text)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare rid bigint; owned boolean; before_snapshot jsonb;
begin
 if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and active) then raise exception 'نشست فعال لازم است'; end if;
 if jsonb_typeof(p_proposed_data) is distinct from 'object' then raise exception 'اطلاعات درخواست نامعتبر است'; end if;
 if p_request_type not in ('create','update','status','priority','description','complete','delete','due_date') then raise exception 'نوع درخواست نامعتبر است'; end if;
 if p_request_type='create' then
  if nullif(btrim(p_proposed_data->>'title'),'') is null then raise exception 'عنوان فعالیت الزامی است'; end if;
  if not (select private.is_manager()) then
   p_proposed_data:=p_proposed_data||jsonb_build_object('owner_id',auth.uid());
  end if;
  if nullif(p_proposed_data->>'start_date','')::date > nullif(p_proposed_data->>'due_date','')::date then raise exception 'تاریخ پایان نمی‌تواند قبل از شروع باشد'; end if;
 else
  select exists(select 1 from public.tasks where id=p_task_id and owner_id=auth.uid()) into owned;
  if not owned and not (select private.is_manager()) then raise exception 'این وظیفه متعلق به شما نیست'; end if;
  select to_jsonb(t) into before_snapshot from public.tasks t where t.id=p_task_id;
 end if;
 insert into public.change_requests(task_id,request_type,before_data,proposed_data,requested_by,request_status,requester_note)
 values(p_task_id,p_request_type,before_snapshot,coalesce(p_proposed_data,'{}'::jsonb),auth.uid(),'pending',p_note) returning id into rid;
 -- The existing change_request_submission_event trigger records submission once.
 perform private.route_change_request(rid);
 return rid;
end $function$;

CREATE OR REPLACE FUNCTION private.apply_change_request(p_request_id bigint, p_actor uuid, p_payload jsonb)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare r public.change_requests%rowtype; tid bigint;
begin
 select * into r from public.change_requests where id=p_request_id for update;
 perform set_config('app.request_id',r.id::text,true);perform set_config('app.source_path','approval_workflow',true);
 if r.request_type='create' then
  insert into public.tasks(title,description,owner_id,status,priority,start_date,due_date,done_date,reminder_days,manager_notes,created_by,change_reason)
  values(p_payload->>'title',coalesce(p_payload->>'description',''),coalesce(nullif(p_payload->>'owner_id','')::uuid,r.requested_by),coalesce(p_payload->>'status','ثبت شده'),coalesce(p_payload->>'priority','متوسط'),nullif(p_payload->>'start_date','')::date,nullif(p_payload->>'due_date','')::date,nullif(p_payload->>'done_date','')::date,coalesce(nullif(p_payload->>'reminder_days','')::int,0),coalesce(p_payload->>'manager_notes',''),p_actor,'درخواست شماره '||r.id) returning id into tid;
 else
  tid=r.task_id;
  if r.request_type='delete' then
   lock table public.tasks in share row exclusive mode;
   delete from public.tasks where id=tid;
   perform private.resequence_task_display_ids();
  elsif r.request_type='complete' then update public.tasks set status='انجام شده',done_date=coalesce(nullif(p_payload->>'done_date','')::date,current_date),archived=true,archived_at=now(),change_reason='درخواست شماره '||r.id where id=tid;
  else update public.tasks set
   title=coalesce(p_payload->>'title',title),description=coalesce(p_payload->>'description',description),
   status=coalesce(p_payload->>'status',status),priority=coalesce(p_payload->>'priority',priority),
   owner_id=case when p_payload?'owner_id' then nullif(p_payload->>'owner_id','')::uuid else owner_id end,
   done_date=case when p_payload?'done_date' then nullif(p_payload->>'done_date','')::date else done_date end,
   archived=case when p_payload?'archived' then (p_payload->>'archived')::boolean else archived end,
   archived_at=case when p_payload->>'archived'='true' then now() else archived_at end,
   start_date=case when p_payload?'start_date' then nullif(p_payload->>'start_date','')::date else start_date end,
   due_date=case when p_payload?'due_date' then nullif(p_payload->>'due_date','')::date else due_date end,
   reminder_days=case when p_payload?'reminder_days' then coalesce(nullif(p_payload->>'reminder_days','')::int,0) else reminder_days end,
   manager_notes=coalesce(p_payload->>'manager_notes',manager_notes),change_reason='درخواست شماره '||r.id where id=tid;
  end if;
 end if;
 update public.change_requests set task_id=coalesce(task_id,tid),applied_task_id=tid,request_status='approved',final_data=p_payload,completed_at=now(),reviewed_by=p_actor,reviewed_at=now() where id=r.id;
 insert into public.change_request_events(request_id,actor_id,event_type,note,snapshot) values(r.id,p_actor,'applied','تغییر روی وظیفه اعمال شد',jsonb_build_object('task_id',tid));
 return tid;
end;
$function$;


revoke all on function private.submit_preserved_change_request(text,bigint,jsonb,text) from public,anon;
grant execute on function private.submit_preserved_change_request(text,bigint,jsonb,text) to authenticated;
create or replace function public.submit_change_request(p_request_type text,p_task_id bigint,p_proposed_data jsonb,p_note text default null)
returns bigint language sql security invoker set search_path='' as $$
select private.submit_preserved_change_request(p_request_type,p_task_id,p_proposed_data,p_note);
$$;
revoke all on function public.submit_change_request(text,bigint,jsonb,text) from public,anon;
grant execute on function public.submit_change_request(text,bigint,jsonb,text) to authenticated;

create or replace function private.activate_complete_sticker_set(p_set_id bigint)
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and active and role='manager') then raise exception 'فقط مدیر فعال مجاز است'; end if;
 perform pg_advisory_xact_lock(812031);
 if not exists(select 1 from public.sticker_sets where id=p_set_id) then raise exception 'نسخه پیدا نشد'; end if;
 if (select count(distinct (s.state_key,s.gender)) from public.stickers s join storage.objects o on o.bucket_id='stickers' and o.name=s.storage_path where s.set_id=p_set_id and s.state_key in ('state1','state2','state3','state4','state5') and s.gender in ('female','male'))<>10 then raise exception 'هر ده تصویر نسخه باید بارگذاری شده باشد'; end if;
 update public.sticker_sets set active=false where active and id<>p_set_id;
 update public.sticker_sets set active=true where id=p_set_id;
end $$;
revoke all on function private.activate_complete_sticker_set(bigint) from public,anon;
grant execute on function private.activate_complete_sticker_set(bigint) to authenticated;
create or replace function public.activate_sticker_set(p_set_id bigint)
returns void language sql security invoker set search_path='' as $$ select private.activate_complete_sticker_set(p_set_id); $$;
revoke all on function public.activate_sticker_set(bigint) from public,anon;
grant execute on function public.activate_sticker_set(bigint) to authenticated;

-- RLS on snapshots limits resolution to the manager / actual recipient.
create or replace function public.resolve_message_sticker(p_snapshot_id bigint)
returns text language sql stable security invoker set search_path='' as $$
 select st.storage_path
 from public.message_snapshots s
 join public.profiles p on p.id=s.recipient_id
 join public.sticker_sets ss on ss.active
 join public.stickers st on st.set_id=ss.id and st.state_key='state'||s.sticker_state
  and st.gender=case when p.gender='خانم' then 'female' else 'male' end
 where s.id=p_snapshot_id and s.template_key like 'state%'
 order by ss.id desc limit 1;
$$;
revoke all on function public.resolve_message_sticker(bigint) from public,anon;
grant execute on function public.resolve_message_sticker(bigint) to authenticated;
