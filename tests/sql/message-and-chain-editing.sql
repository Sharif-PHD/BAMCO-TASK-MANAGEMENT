-- Run on the configured database. Everything created here is rolled back.
begin;
do $$
declare manager_id uuid; owner_id uuid; bid uuid; snap public.message_snapshots%rowtype; qa_chain_id bigint; new_chain_id bigint; stage_id bigint; tid uuid; mid bigint; portal_id bigint; portal_delivery_id bigint; denied boolean; count_before int;
begin
 select id into manager_id from public.profiles where active and role='manager' order by id limit 1;
 select id into owner_id from public.profiles where active and role='owner' and email is not null order by id limit 1;
 if manager_id is null or owner_id is null then raise exception 'Active manager and owner required'; end if;
 perform set_config('request.jwt.claim.sub',manager_id::text,true);execute 'set local role authenticated';
 bid:=public.prepare_workflow_messages(array[owner_id,owner_id],jsonb_build_object(owner_id::text,'both'),'__QA_SUBJECT__','سلام [عنوان و نام مخاطب]؛ [تعداد امور هشداری] / [تعداد امور دیرکردی]؛ [تاریخ کامل شمسی]'||E'\n[جدول امور هشداری]\n[جدول امور دیرکردی]\n[استیکر]','manual','۱۴۰۵/۰۶/۱۹');
 select * into snap from public.message_snapshots where batch_id=bid;
 if snap.final_text not like 'سلام %۱۴۰۵/۰۶/۱۹%' or snap.final_text like '%[%' then raise exception 'Placeholder expansion failed'; end if;
 if (select count(*) from public.message_snapshots where batch_id=bid)<>1 or (select count(*) from public.message_deliveries where batch_id=bid)<>2 then raise exception 'Distinct recipients/channels failed'; end if;
 if exists(select 1 from jsonb_array_elements(snap.tasks) t where t->>'status' in ('انجام شده','متوقف','ثبت شده')) then raise exception 'Closed work entered reminder counts'; end if;
 -- Portal delivery and response linking are transactional; email remains unprocessed.
 perform public.queue_message_batch(bid);perform public.queue_message_batch(bid);
 if (select count(*) from public.message_deliveries where batch_id=bid and channel='portal' and status='sent' and portal_message_id is not null)<>1 then raise exception 'Portal delivery not linked'; end if;
 if (select count(*) from public.message_deliveries where batch_id=bid and channel='email' and status='queued')<>1 then raise exception 'Email queue not independent'; end if;
 select d.portal_message_id,d.id into portal_id,portal_delivery_id from public.message_deliveries d where batch_id=bid and channel='portal';
 bid:=public.prepare_message_batch(array[owner_id],jsonb_build_object(owner_id::text,'portal'),'__QA_DEFAULT__',null,'daily');
 select * into snap from public.message_snapshots where batch_id=bid;
 if length(snap.final_text)<80 or snap.body_template not like '%[استیکر]%' then raise exception 'Template editor source not used'; end if;
 qa_chain_id:=public.save_approval_chain(null,'__BAMCO_QA_CHAIN_'||gen_random_uuid()::text,array[owner_id],jsonb_build_array(jsonb_build_object('title','QA 1','rule','any','approvers',jsonb_build_array(manager_id))),false);
 select id into stage_id from public.approval_chain_stages where approval_chain_stages.chain_id=qa_chain_id;
 new_chain_id:=public.save_approval_chain(qa_chain_id,'__BAMCO_QA_EDITED_'||gen_random_uuid()::text,array[owner_id],jsonb_build_array(jsonb_build_object('title','QA 2','rule','all','approvers',jsonb_build_array(manager_id))),false);
 if not exists(select 1 from public.approval_chains c where c.id=qa_chain_id and not c.active and c.superseded_by=new_chain_id) then raise exception 'Old chain was not versioned'; end if;
 if not exists(select 1 from public.approval_chain_stages where id=stage_id and title='QA 1') then raise exception 'In-flight approval stage changed'; end if;
 tid:=public.chat_ensure_direct(owner_id);mid:=public.chat_send_message(tid,'__QA_EDIT_BEFORE__',null);perform public.chat_edit_message(mid,'__QA_EDIT_AFTER__');
 if not exists(select 1 from public.chat_messages where id=mid and body='__QA_EDIT_AFTER__' and edited_at is not null) then raise exception 'Chat edit failed'; end if;
 execute 'reset role';perform set_config('request.jwt.claim.sub',owner_id::text,true);execute 'set local role authenticated';
 update public.portal_message_recipients set reply_text='__QA_LINKED_REPLY__',replied_at=now() where message_id=portal_id and recipient_id=owner_id;
 if not exists(select 1 from public.message_response_tracking where delivery_id=portal_delivery_id and reply_text='__QA_LINKED_REPLY__' and response_status='replied') then raise exception 'Reply did not reach original message tracking';end if;
 denied:=false;begin perform public.chat_edit_message(mid,'__UNAUTHORIZED__');exception when raise_exception then denied:=true;end;if not denied then raise exception 'Editing another sender message was allowed';end if;
 denied:=false;begin perform public.prepare_workflow_messages(array[manager_id],jsonb_build_object(manager_id::text,'portal'),'QA','QA');exception when raise_exception then denied:=true;end;if not denied then raise exception 'Owner prepared manager delivery';end if;
 execute 'reset role';
end $$;
rollback;
select 'PASS: templates, placeholders, distinct recipients, channel isolation, portal linking, versioned chains, own-message editing and permission checks; all fixtures rolled back' result;
