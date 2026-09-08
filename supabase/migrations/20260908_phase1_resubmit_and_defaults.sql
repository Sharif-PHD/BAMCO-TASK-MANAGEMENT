create unique index if not exists approval_chains_single_default_idx on public.approval_chains(is_default) where is_default and active;

create or replace function public.resubmit_change_request(p_request_id bigint,p_proposed_data jsonb)
returns void language plpgsql security definer set search_path='' as $$
begin
 update public.change_requests set proposed_data=coalesce(p_proposed_data,'{}'::jsonb),request_status='pending',
  revision_count=revision_count+1,resubmitted_at=now(),reviewed_by=null,reviewed_at=null,manager_note=null,
  current_stage=1,completed_at=null,final_data=null,applied_task_id=null
 where id=p_request_id and requested_by=auth.uid() and request_status='needs_revision';
 if not found then raise exception 'درخواست قابل اصلاح پیدا نشد'; end if;
 delete from public.request_approval_steps where request_id=p_request_id;
 insert into public.change_request_events(request_id,actor_id,event_type,note,snapshot)
 values(p_request_id,auth.uid(),'resubmitted','درخواست پس از اصلاح دوباره ارسال شد',p_proposed_data);
 perform private.route_change_request(p_request_id);
end $$;
revoke all on function public.resubmit_change_request(bigint,jsonb) from public,anon;
grant execute on function public.resubmit_change_request(bigint,jsonb) to authenticated;
