-- Exercise real delivery/reply/notification functions; nothing is committed or emailed.
begin;
do $$
declare manager_id uuid; owner_id uuid; other_id uuid; tid uuid; mid bigint; bid uuid; system_tid uuid; system_mid bigint; reply_id bigint; untouched_batch uuid;
begin
 select id into manager_id from public.profiles where active and role='manager' limit 1;
 select id into owner_id from public.profiles where active and role='owner' limit 1;
 if manager_id is null or owner_id is null then raise exception 'test requires a manager and recipient'; end if;
 perform set_config('request.jwt.claims',json_build_object('sub',manager_id,'role','authenticated')::text,true);
 tid:=public.chat_create_group('آزمون تراکنشی گفت‌وگو',array[manager_id,owner_id]);
 mid:=public.chat_send_message(tid,'پیام آزمایشی؛ این تراکنش بازگردانده می‌شود',null);
 if not exists(select 1 from public.notifications where user_id=owner_id and entity_id=tid::text and notification_type='group_chat' and read_at is null) then raise exception 'group notification missing'; end if;
 bid:=public.prepare_workflow_messages(array[owner_id],jsonb_build_object(owner_id::text,'portal'),'آزمون گزارش','متن آزمایشی گزارش','daily',null);
 perform public.queue_message_batch(bid);
 select chat_thread_id into system_tid from public.message_deliveries where batch_id=bid and channel='portal';
 select id into system_mid from public.chat_messages where thread_id=system_tid and source_portal_message_id in(select portal_message_id from public.message_deliveries where batch_id=bid) and is_system and sender_id=manager_id;
 if system_mid is null then raise exception 'system delivery was not linked'; end if;
 if not exists(select 1 from public.notifications where user_id=owner_id and entity_id=system_tid::text and read_at is null) then raise exception 'daily notification missing'; end if;
 perform public.queue_message_batch(bid);
 if (select count(*) from public.chat_messages where source_portal_message_id in(select portal_message_id from public.message_deliveries where batch_id=bid))<>1 then raise exception 'duplicate system message'; end if;
 untouched_batch:=public.prepare_workflow_messages(array[owner_id],jsonb_build_object(owner_id::text,'portal'),'Unselected message','QA','daily',null);
 perform public.queue_message_batch(untouched_batch);
 perform public.chat_send_message(system_tid,'Manager note must not count as recipient reply',system_mid);
 if exists(select 1 from public.message_deliveries where batch_id=bid and replied_at is not null) then raise exception 'Manager reply changed recipient status'; end if;
 perform set_config('request.jwt.claims',json_build_object('sub',owner_id,'role','authenticated')::text,true);
 if not exists(select 1 from jsonb_array_elements(public.chat_conversation_list()) t where t->>'id'=system_tid::text) then raise exception 'recipient thread missing'; end if;
 reply_id:=public.chat_send_message(system_tid,'پاسخ آزمایشی',system_mid);
 if not exists(select 1 from public.message_deliveries where batch_id=bid and reply_text='پاسخ آزمایشی' and replied_at is not null) then raise exception 'reply not synced to sender report'; end if;
 if exists(select 1 from public.message_deliveries where batch_id=untouched_batch and replied_at is not null) then raise exception 'Reply leaked to unselected original'; end if;
 if not exists(select 1 from public.notifications where user_id=manager_id and entity_id=system_tid::text and notification_type='system_reply') then raise exception 'manager reply notification missing'; end if;
 perform public.chat_mark_read(system_tid);
 if exists(select 1 from public.notifications where user_id=owner_id and entity_id=system_tid::text and read_at is null) then raise exception 'read status not synced'; end if;
 select id into other_id from public.profiles where active and role='owner' and id<>owner_id limit 1;
 if other_id is not null then
  perform set_config('request.jwt.claims',json_build_object('sub',other_id,'role','authenticated')::text,true);
  if exists(select 1 from jsonb_array_elements(public.chat_conversation_list()) t where t->>'id'=system_tid::text) then raise exception 'private system inbox exposed'; end if;
 end if;
end $$;
select 'PASS: group alert, portal delivery, system identity, recipient inbox, idempotency, reply sync, read status, privacy' result;
rollback;
