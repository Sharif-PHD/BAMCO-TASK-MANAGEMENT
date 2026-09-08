-- Security and query-path hardening found by the staging advisor.
alter table public.change_request_events enable row level security;
drop policy if exists request_events_read on public.change_request_events;
create policy request_events_read on public.change_request_events for select to authenticated using(
 (select private.is_manager()) or actor_id=(select auth.uid()) or
 exists(select 1 from public.change_requests r where r.id=request_id and r.requested_by=(select auth.uid()))
);
revoke insert,update,delete on public.change_request_events from anon,authenticated;

revoke all on function public.submit_change_request(text,bigint,jsonb,text) from public,anon;
revoke all on function public.review_request_stage(bigint,text,text,jsonb) from public,anon;
grant execute on function public.submit_change_request(text,bigint,jsonb,text) to authenticated;
grant execute on function public.review_request_stage(bigint,text,text,jsonb) to authenticated;

create index if not exists approval_chain_members_user_idx on public.approval_chain_members(user_id);
create index if not exists approval_stage_approvers_user_idx on public.approval_stage_approvers(approver_id);
create index if not exists request_steps_approver_idx on public.request_approval_steps(approver_id,decision);
create index if not exists request_steps_stage_idx on public.request_approval_steps(stage_id);
create index if not exists request_events_request_idx on public.change_request_events(request_id,created_at);
create index if not exists request_events_actor_idx on public.change_request_events(actor_id);
create index if not exists change_requests_chain_idx on public.change_requests(approval_chain_id,current_stage,request_status);
create index if not exists change_requests_applied_task_idx on public.change_requests(applied_task_id);
