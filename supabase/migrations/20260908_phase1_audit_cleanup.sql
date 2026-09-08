-- Replace legacy row-level audit/touch triggers with the phase-1 field audit.
drop trigger if exists tasks_audit on public.tasks;
drop trigger if exists tasks_touch on public.tasks;

create or replace function public.review_request_stage(p_request_id bigint,p_decision text,p_note text default null,p_final_data jsonb default null)
returns text language plpgsql security definer set search_path='' as $$
declare r public.change_requests%rowtype; step public.request_approval_steps%rowtype; stage public.approval_chain_stages%rowtype; satisfied boolean; next_stage smallint; payload jsonb;
begin
 if p_decision not in ('approved','rejected','needs_revision') then raise exception 'تصمیم نامعتبر است'; end if;
 select * into r from public.change_requests where id=p_request_id and request_status in ('pending','in_review') for update;
 if not found then raise exception 'درخواست باز پیدا نشد'; end if;
 if r.approval_chain_id is null then
  if not (select private.is_manager()) then raise exception 'دسترسی بررسی ندارید'; end if;
  insert into public.change_request_events(request_id,actor_id,event_type,note,snapshot) values(r.id,auth.uid(),p_decision,p_note,p_final_data);
  if p_decision='approved' then perform private.apply_change_request(r.id,auth.uid(),coalesce(p_final_data,r.proposed_data)); else update public.change_requests set request_status=p_decision,manager_note=p_note,reviewed_by=auth.uid(),reviewed_at=now(),completed_at=case when p_decision='rejected' then now() end where id=r.id; end if;
  return p_decision;
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
revoke all on function public.review_request_stage(bigint,text,text,jsonb) from public,anon;
grant execute on function public.review_request_stage(bigint,text,text,jsonb) to authenticated;
