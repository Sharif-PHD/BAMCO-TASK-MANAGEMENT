create or replace function public.submit_change_request(
 p_request_type text,p_task_id bigint,p_proposed_data jsonb,p_note text default null
) returns bigint language plpgsql security definer set search_path='' as $$
declare rid bigint; owned boolean; before_snapshot jsonb;
begin
 if p_request_type not in ('create','update','status','priority','description','complete','delete','due_date') then raise exception 'نوع درخواست نامعتبر است'; end if;
 if p_request_type='create' then
  p_proposed_data=coalesce(p_proposed_data,'{}'::jsonb)||jsonb_build_object('owner_id',auth.uid()::text,'status','ثبت شده','start_date',null,'due_date',null,'done_date',null);
 else
  select exists(select 1 from public.tasks where id=p_task_id and owner_id=auth.uid()) into owned;
  if not owned and not (select private.is_manager()) then raise exception 'این وظیفه متعلق به شما نیست'; end if;
  select to_jsonb(t) into before_snapshot from public.tasks t where t.id=p_task_id;
 end if;
 insert into public.change_requests(task_id,request_type,before_data,proposed_data,requested_by,request_status,requester_note)
 values(p_task_id,p_request_type,before_snapshot,coalesce(p_proposed_data,'{}'::jsonb),auth.uid(),'pending',p_note) returning id into rid;
 insert into public.change_request_events(request_id,actor_id,event_type,note,snapshot) values(rid,auth.uid(),'submitted',p_note,p_proposed_data);
 perform private.route_change_request(rid);
 return rid;
end $$;
revoke all on function public.submit_change_request(text,bigint,jsonb,text) from public,anon;
grant execute on function public.submit_change_request(text,bigint,jsonb,text) to authenticated;
