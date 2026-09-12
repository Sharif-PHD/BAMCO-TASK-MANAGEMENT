-- Run in a rollback transaction. No external email is sent.
do $$
declare mgr uuid; rid uuid; bid uuid; rem uuid; did bigint; tid uuid; count_before int; greeting text:='جناب آقای مهندس آزمایش خطاب'; snap public.message_snapshots%rowtype;
begin
 select id into mgr from public.profiles where active and role='manager' limit 1;
 select id into rid from public.profiles where active and role='owner' limit 1;
 perform set_config('request.jwt.claim.sub',mgr::text,true);
 update public.profiles set salutation=greeting where id=rid;
 bid:=public.prepare_workflow_messages(array[rid],jsonb_build_object(rid::text,'portal'),'',null,'daily');
 select * into snap from public.message_snapshots where batch_id=bid;
 if split_part(snap.body_template,E'\n',1)<>greeting then raise exception 'Daily salutation incorrect';end if;
 perform public.queue_message_batch(bid);
 select id,chat_thread_id into did,tid from public.message_deliveries where batch_id=bid;
 rem:=public.prepare_message_reminders(array[did],'portal',gen_random_uuid());
 select * into snap from public.message_snapshots where batch_id=rem;
 if split_part(snap.body_template,E'\n',1)<>greeting or snap.template_key<>'followup' then raise exception 'Reminder salutation/template incorrect';end if;
 if position('با درود و مهر' in snap.final_text)=0 or position('۷۴۸۸' in snap.final_text)=0 or snap.final_text like '%[تاریخ%' then raise exception 'Original reminder template not expanded';end if;
 if jsonb_array_length(snap.reminder_context)<>1 or (snap.reminder_context->0->>'delivery_id')::bigint<>did then raise exception 'Original delivery context lost';end if;
 perform public.queue_message_batch(rem);
 if (select reminder_count from public.message_deliveries where id=did)<>1 then raise exception 'Portal success not tracked';end if;
 perform set_config('request.jwt.claim.sub',rid::text,true);
 execute 'set local role authenticated';
 perform public.chat_clear_system_thread(tid);
 execute 'reset role';
 if exists(select 1 from public.chat_threads where id=tid) or exists(select 1 from public.chat_messages where thread_id=tid) then raise exception 'Old chat survived';end if;
 if exists(select 1 from public.portal_message_recipients r join public.message_deliveries d on d.portal_message_id=r.message_id where d.batch_id in(bid,rem) and r.recipient_id=rid and r.dismissed_at is null) then raise exception 'Deleted chat resurfaced in inbox';end if;
 perform set_config('request.jwt.claim.sub',mgr::text,true);
 -- Simulate a later send within this single rollback transaction (now() is fixed at BEGIN).
 alter table public.portal_messages alter column created_at set default clock_timestamp();
 bid:=public.prepare_workflow_messages(array[rid],jsonb_build_object(rid::text,'portal'),'NEW AFTER CLEAR',null,'daily');
 perform public.queue_message_batch(bid);
 if not exists(select 1 from public.chat_messages m join public.chat_threads t on t.id=m.thread_id join public.portal_messages p on p.id=m.source_portal_message_id where t.system_recipient_id=rid and p.subject='NEW AFTER CLEAR') then raise exception 'Fresh message missing after clear';end if;
 if exists(select 1 from public.chat_messages m join public.chat_threads t on t.id=m.thread_id join public.portal_messages p on p.id=m.source_portal_message_id where t.system_recipient_id=rid and p.subject<>'NEW AFTER CLEAR') then raise exception 'Old history in fresh chat';end if;
end $$;
