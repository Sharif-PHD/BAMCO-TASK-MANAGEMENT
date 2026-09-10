-- Exercise the configured approval chain without retaining requests or tasks.
begin;
do $$
declare qa_owner uuid; approver uuid; qa_request_id bigint; result text; current_request public.change_requests%rowtype; rounds integer:=0; denied boolean;
begin
 select p.id into qa_owner from public.profiles p where p.active and p.role='owner' and exists(select 1 from public.approval_chain_members m join public.approval_chains c on c.id=m.chain_id where m.user_id=p.id and c.active) order by p.id limit 1;
 if qa_owner is null then raise exception 'No active owner with an approval chain'; end if;
 perform set_config('request.jwt.claim.sub',qa_owner::text,true);execute 'set local role authenticated';
 qa_request_id:=public.submit_change_request('create',null,jsonb_build_object('title','__BAMCO_QA_APPROVAL_ROLLBACK__','priority','متوسط'),null);
 denied:=false;
 begin perform public.review_request_stage(qa_request_id,'approved',null,null); exception when raise_exception then denied:=true; end;
 if not denied then raise exception 'requester self-approved unauthorized stage'; end if;
 execute 'reset role';
 loop
  select * into current_request from public.change_requests where id=qa_request_id;
  exit when current_request.request_status='approved';
  rounds:=rounds+1;if rounds>10 then raise exception 'approval did not finish'; end if;
  select rs.approver_id into approver from public.request_approval_steps rs join public.approval_chain_stages s on s.id=rs.stage_id join public.profiles p on p.id=rs.approver_id where rs.request_id=qa_request_id and s.stage_no=current_request.current_stage and rs.decision='pending' and p.active order by rs.id limit 1;
  if approver is null then raise exception 'active stage has no available approver'; end if;
  perform set_config('request.jwt.claim.sub',approver::text,true);execute 'set local role authenticated';
  result:=public.review_request_stage(qa_request_id,'approved','__QA_ROLLBACK__',null);
  execute 'reset role';
 end loop;
 if not exists(select 1 from public.tasks where id=current_request.applied_task_id and status='ثبت شده' and owner_id is null and start_date is null and due_date is null) then raise exception 'approval did not create canonical registered task'; end if;
 if (select count(*) from public.change_request_events where request_id=qa_request_id and event_type='submitted')<>1 then raise exception 'duplicate request submission audit'; end if;
 if not exists(select 1 from public.task_history where task_id=current_request.applied_task_id and source_path='approval_workflow') then raise exception 'approval audit entry missing'; end if;
end $$;
rollback;
select 'PASS: request submission, self-approval protection, configured stages, task creation and audit; fixtures rolled back' result;
