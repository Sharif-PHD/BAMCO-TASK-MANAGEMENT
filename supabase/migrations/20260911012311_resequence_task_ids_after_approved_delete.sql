-- Keep the public/visible task number (legacy_id) contiguous after an approved or direct manager delete.
-- Primary key tasks.id is intentionally never resequenced.

create or replace function private.resequence_task_display_ids()
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_start bigint;
  v_row record;
begin
  select coalesce(min(coalesce(legacy_id, id)), 1)
    into v_start
  from public.tasks;

  for v_row in
    select id, row_number() over (order by coalesce(legacy_id, id), id) as seq
    from public.tasks
  loop
    update public.tasks
       set legacy_id = -v_row.seq
     where id = v_row.id;
  end loop;

  for v_row in
    select id, -legacy_id as seq
    from public.tasks
    order by -legacy_id
  loop
    update public.tasks
       set legacy_id = v_start + v_row.seq - 1
     where id = v_row.id;
  end loop;
end;
$function$;

create or replace function public.delete_task_and_resequence(p_task_id bigint)
returns void
language plpgsql
set search_path to ''
as $function$
begin
  if not (select private.is_manager()) then
    raise exception 'دسترسی مدیر لازم است';
  end if;

  lock table public.tasks in share row exclusive mode;
  delete from public.tasks where id = p_task_id;
  if not found then raise exception 'تسک پیدا نشد'; end if;
  perform private.resequence_task_display_ids();
end;
$function$;

-- Final production definition; the delete branch also resequences visible ids.
create or replace function private.apply_change_request(p_request_id bigint, p_actor uuid, p_payload jsonb)
returns bigint
language plpgsql
security definer
set search_path to ''
as $function$
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
   manager_notes=coalesce(p_payload->>'manager_notes',manager_notes),change_reason='درخواست شماره '||r.id where id=tid;
  end if;
 end if;
 update public.change_requests set task_id=coalesce(task_id,tid),applied_task_id=tid,request_status='approved',final_data=p_payload,completed_at=now(),reviewed_by=p_actor,reviewed_at=now() where id=r.id;
 insert into public.change_request_events(request_id,actor_id,event_type,note,snapshot) values(r.id,p_actor,'applied','تغییر روی وظیفه اعمال شد',jsonb_build_object('task_id',tid));
 return tid;
end;
$function$;
