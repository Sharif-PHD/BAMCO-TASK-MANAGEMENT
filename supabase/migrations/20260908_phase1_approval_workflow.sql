-- BAMCO phase 1: request routing and multi-stage review RPCs.

alter table public.change_requests add column if not exists approval_chain_id bigint references public.approval_chains(id);

create or replace function private.route_change_request(p_request_id bigint)
returns void language plpgsql security definer set search_path='' as $$
declare r public.change_requests%rowtype; chain bigint;
begin
 select * into r from public.change_requests where id=p_request_id for update;
 if not found then raise exception 'درخواست پیدا نشد'; end if;
 select c.id into chain from public.approval_chains c join public.approval_chain_members m on m.chain_id=c.id
  where c.active and m.user_id=r.requested_by order by c.id limit 1;
 if chain is null then select id into chain from public.approval_chains where active and is_default order by id limit 1; end if;
 if chain is null then
  update public.change_requests set request_status='pending',current_stage=1 where id=r.id;
  return;
 end if;
 update public.change_requests set approval_chain_id=chain,request_status='in_review',current_stage=1 where id=r.id;
 insert into public.request_approval_steps(request_id,stage_id,approver_id)
 select r.id,s.id,a.approver_id from public.approval_chain_stages s
 join public.approval_stage_approvers a on a.stage_id=s.id where s.chain_id=chain
 on conflict do nothing;
 insert into public.change_request_events(request_id,actor_id,event_type,note,snapshot)
 values(r.id,auth.uid(),'routed','درخواست وارد زنجیره تأیید شد',jsonb_build_object('chain_id',chain));
end $$;

create or replace function public.submit_change_request(
 p_request_type text,p_task_id bigint,p_proposed_data jsonb,p_note text default null
) returns bigint language plpgsql security definer set search_path='' as $$
declare rid bigint; owned boolean;
begin
 if p_request_type not in ('create','update','status','priority','description','complete','delete','due_date') then raise exception 'نوع درخواست نامعتبر است'; end if;
 if p_request_type='create' then
  p_proposed_data=coalesce(p_proposed_data,'{}'::jsonb)||jsonb_build_object('owner_id',auth.uid()::text,'status','ثبت شده','start_date',null,'due_date',null,'done_date',null);
 else
  select exists(select 1 from public.tasks where id=p_task_id and owner_id=auth.uid()) into owned;
  if not owned and not (select private.is_manager()) then raise exception 'این وظیفه متعلق به شما نیست'; end if;
 end if;
 insert into public.change_requests(task_id,request_type,before_data,proposed_data,requested_by,request_status,requester_note)
 select p_task_id,p_request_type,case when p_task_id is null then null else to_jsonb(t) end,coalesce(p_proposed_data,'{}'::jsonb),auth.uid(),'pending',p_note
 from (select * from public.tasks where id=p_task_id union all select null::public.tasks where p_task_id is null) t limit 1 returning id into rid;
 insert into public.change_request_events(request_id,actor_id,event_type,note,snapshot) values(rid,auth.uid(),'submitted',p_note,p_proposed_data);
 perform private.route_change_request(rid);
 return rid;
end $$;

create or replace function private.apply_change_request(p_request_id bigint,p_actor uuid,p_payload jsonb)
returns bigint language plpgsql security definer set search_path='' as $$
declare r public.change_requests%rowtype; tid bigint;
begin
 select * into r from public.change_requests where id=p_request_id for update;
 perform set_config('app.request_id',r.id::text,true);perform set_config('app.source_path','approval_workflow',true);
 if r.request_type='create' then
  insert into public.tasks(title,description,owner_id,status,priority,start_date,due_date,done_date,reminder_days,manager_notes,created_by,change_reason)
  values(p_payload->>'title',coalesce(p_payload->>'description',''),coalesce(nullif(p_payload->>'owner_id','')::uuid,r.requested_by),coalesce(p_payload->>'status','ثبت شده'),coalesce(p_payload->>'priority','متوسط'),nullif(p_payload->>'start_date','')::date,nullif(p_payload->>'due_date','')::date,nullif(p_payload->>'done_date','')::date,coalesce(nullif(p_payload->>'reminder_days','')::int,0),coalesce(p_payload->>'manager_notes',''),p_actor,'درخواست شماره '||r.id) returning id into tid;
 else
  tid=r.task_id;
  if r.request_type='delete' then delete from public.tasks where id=tid;
  elsif r.request_type='complete' then update public.tasks set status='انجام شده',done_date=coalesce(nullif(p_payload->>'done_date','')::date,current_date),archived=true,archived_at=now(),change_reason='درخواست شماره '||r.id where id=tid;
  else update public.tasks set
   title=coalesce(p_payload->>'title',title),description=coalesce(p_payload->>'description',description),
   status=coalesce(p_payload->>'status',status),priority=coalesce(p_payload->>'priority',priority),
   start_date=case when p_payload?'start_date' then nullif(p_payload->>'start_date','')::date else start_date end,
   due_date=case when p_payload?'due_date' then nullif(p_payload->>'due_date','')::date else due_date end,
   manager_notes=coalesce(p_payload->>'manager_notes',manager_notes),change_reason='درخواست شماره '||r.id where id=tid;
  end if;
 end if;
 update public.change_requests set task_id=coalesce(task_id,tid),applied_task_id=tid,request_status='approved',final_data=p_payload,completed_at=now(),reviewed_by=p_actor,reviewed_at=now() where id=r.id;
 insert into public.change_request_events(request_id,actor_id,event_type,note,snapshot) values(r.id,p_actor,'applied','تغییر روی وظیفه اعمال شد',jsonb_build_object('task_id',tid));
 return tid;
end $$;

create or replace function public.review_request_stage(p_request_id bigint,p_decision text,p_note text default null,p_final_data jsonb default null)
returns text language plpgsql security definer set search_path='' as $$
declare r public.change_requests%rowtype; step public.request_approval_steps%rowtype; stage public.approval_chain_stages%rowtype; satisfied boolean; next_stage smallint; payload jsonb;
begin
 if p_decision not in ('approved','rejected','needs_revision') then raise exception 'تصمیم نامعتبر است'; end if;
 select * into r from public.change_requests where id=p_request_id and request_status in ('pending','in_review') for update;
 if not found then raise exception 'درخواست باز پیدا نشد'; end if;
 if r.approval_chain_id is null then
  if not (select private.is_manager()) then raise exception 'دسترسی بررسی ندارید'; end if;
  if p_decision='approved' then perform private.apply_change_request(r.id,auth.uid(),coalesce(p_final_data,r.proposed_data)); else update public.change_requests set request_status=p_decision,manager_note=p_note,reviewed_by=auth.uid(),reviewed_at=now() where id=r.id; end if;
  insert into public.change_request_events(request_id,actor_id,event_type,note,snapshot) values(r.id,auth.uid(),p_decision,p_note,p_final_data);return p_decision;
 end if;
 select rs.* into step from public.request_approval_steps rs join public.approval_chain_stages s on s.id=rs.stage_id where rs.request_id=r.id and s.stage_no=r.current_stage and rs.approver_id=auth.uid() for update;
 if not found then raise exception 'این مرحله به شما تخصیص داده نشده است'; end if;
 update public.request_approval_steps set decision=p_decision,note=p_note,decided_at=now() where id=step.id;
 insert into public.change_request_events(request_id,actor_id,event_type,note,snapshot) values(r.id,auth.uid(),p_decision,p_note,p_final_data);
 if p_decision='rejected' then update public.change_requests set request_status='rejected',manager_note=p_note,reviewed_by=auth.uid(),reviewed_at=now(),completed_at=now() where id=r.id;return 'rejected'; end if;
 if p_decision='needs_revision' then update public.change_requests set request_status='needs_revision',manager_note=p_note,reviewed_by=auth.uid(),reviewed_at=now() where id=r.id;return 'needs_revision'; end if;
 select * into stage from public.approval_chain_stages where id=step.stage_id;
 select case when stage.approval_rule='all' then bool_and(decision='approved') else bool_or(decision='approved') end into satisfied from public.request_approval_steps where request_id=r.id and stage_id=stage.id;
 if not satisfied then return 'waiting_stage'; end if;
 select min(stage_no) into next_stage from public.approval_chain_stages where chain_id=r.approval_chain_id and stage_no>r.current_stage;
 if next_stage is not null then update public.change_requests set current_stage=next_stage where id=r.id;return 'next_stage'; end if;
 payload=coalesce(p_final_data,r.proposed_data);perform private.apply_change_request(r.id,auth.uid(),payload);return 'approved';
end $$;

grant execute on function public.submit_change_request(text,bigint,jsonb,text) to authenticated;
grant execute on function public.review_request_stage(bigint,text,text,jsonb) to authenticated;
revoke all on function private.route_change_request(bigint) from public,authenticated;
revoke all on function private.apply_change_request(bigint,uuid,jsonb) from public,authenticated;
