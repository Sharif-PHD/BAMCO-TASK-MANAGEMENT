-- Live contract test. All fixtures and audit entries are rolled back.
-- Run only through an authorized database connection; never in the browser.
begin;
do $$
declare manager_id uuid; owner_a uuid; owner_b uuid; task_id bigint; thread_id uuid; denied boolean; saved public.tasks%rowtype;
begin
 select id into manager_id from public.profiles where active and role='manager' order by id limit 1;
 select id into owner_a from public.profiles where active and role='owner' order by id limit 1;
 select id into owner_b from public.profiles where active and role='owner' and id<>owner_a order by id limit 1;
 if manager_id is null or owner_b is null then raise exception 'QA requires manager and two active owners'; end if;
 perform set_config('request.jwt.claim.sub',manager_id::text,true);
 execute 'set local role authenticated';
 insert into public.tasks(title,status,priority,owner_id,start_date,due_date)
 values('__BAMCO_QA_ROLLBACK__','ثبت شده','متوسط',owner_a,current_date,current_date)
 returning * into saved;
 task_id:=saved.id;
 if saved.owner_id is not null or saved.start_date is not null or saved.due_date is not null then raise exception 'registered invariant failed'; end if;
 denied:=false;
 begin update public.tasks set status='در حال انجام' where id=task_id; exception when raise_exception then denied:=true; end;
 if not denied then raise exception 'incomplete doing task accepted'; end if;
 update public.tasks set status='در حال انجام',owner_id=owner_a,start_date=current_date,due_date=current_date+2 where id=task_id;
 update public.tasks set status='منتظر پاسخ',due_date=current_date+2 where id=task_id returning * into saved;
 if saved.due_date is not null then raise exception 'waiting task retained due date'; end if;
 update public.tasks set status='ثبت شده' where id=task_id;
 thread_id:=public.chat_ensure_task_direct(task_id,owner_a);
 if thread_id is null then raise exception 'manager cannot discuss unassigned task'; end if;
 execute 'reset role';
 perform set_config('request.jwt.claim.sub',owner_b::text,true);
 execute 'set local role authenticated';
 denied:=false;
 begin perform public.chat_ensure_task_direct(task_id,owner_a); exception when raise_exception then denied:=true; end;
 if not denied then raise exception 'non-owner gained unassigned task access'; end if;
 if exists(select 1 from public.tasks where id=task_id) then raise exception 'non-owner can read unassigned task'; end if;
 execute 'reset role';
 perform set_config('request.jwt.claim.sub',manager_id::text,true);
 execute 'set local role authenticated';
 perform public.chat_delete_thread(thread_id);
 denied:=false;
 begin perform public.chat_send_message(thread_id,'__BAMCO_QA_ROLLBACK__',null); exception when raise_exception then denied:=true; end;
 if not denied then raise exception 'closed conversation accepted a message'; end if;
 execute 'reset role';
end $$;
rollback;
select 'PASS: task state invariants, NULL owner permissions and closed conversation writes; fixtures rolled back' result;
