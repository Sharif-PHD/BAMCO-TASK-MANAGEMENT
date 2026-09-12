-- Transactional integration tests; no external email is sent. Fixtures rolled back.
do $$
declare mgr uuid; people uuid[]; a uuid; b uuid; did bigint; bid uuid; bid2 uuid; req uuid:=gen_random_uuid(); n int; denied boolean;
begin
 select id into mgr from public.profiles where active and role='manager' limit 1;
 select array_agg(id) into people from (select id from public.profiles where active and role='owner' and nullif(email,'') is not null limit 3) p;
 if mgr is null or cardinality(people)<3 then raise exception 'Three fixture recipients required'; end if;
 perform set_config('request.jwt.claim.sub',mgr::text,true);
 a:=public.prepare_workflow_messages(people,jsonb_object(array(select id::text from unnest(people) id),array['portal','portal','portal']),'__REMINDER_QA_A__','QA','manual');
 b:=public.prepare_workflow_messages(array[people[1]],jsonb_build_object(people[1]::text,'portal'),'__REMINDER_QA_B__','QA','manual');
 perform public.queue_message_batch(a);perform public.queue_message_batch(b);
 update public.message_deliveries set replied_at=now() where batch_id=b;
 select id into did from public.message_deliveries where batch_id=a and recipient_id=people[1];
 execute 'set local role authenticated';
 bid:=public.prepare_message_reminders(array[did],'both',req);
 bid2:=public.prepare_message_reminders(array[did],'both',req);
 if bid<>bid2 then raise exception 'Idempotency failed'; end if;
 if exists(select 1 from public.message_snapshots where batch_id=bid and (final_text like '%__REMINDER_QA_B__%' or jsonb_array_length(reminder_context)<>1)) then raise exception 'Unselected original leaked'; end if;
 perform public.queue_message_batch(bid);
 if (select reminder_count from public.message_deliveries where id=did)<>0 then raise exception 'Both counted before email success'; end if;
 if not exists(select 1 from public.message_deliveries d join public.portal_message_recipients p on p.message_id=d.portal_message_id and p.recipient_id=d.recipient_id where d.batch_id=bid and d.channel='portal' and d.status='sent') then raise exception 'Portal missing'; end if;
 execute 'reset role';
 update public.message_deliveries set status='failed',error_message='QA injected provider failure' where batch_id=bid and channel='email';
 if (select reminder_count from public.message_deliveries where id=did)<>0 then raise exception 'Failure counted'; end if;
 -- This simulates provider acceptance; not an actual email test.
 update public.message_deliveries set status='sent',sent_at=now() where batch_id=bid and channel='email';
 if (select reminder_count from public.message_deliveries where id=did)<>1 then raise exception 'Success not counted'; end if;
 perform public.mark_message_reminders(array[did]);perform public.mark_message_reminders(array[did]);
 if (select reminder_count from public.message_deliveries where id=did)<>1 then raise exception 'Duplicate increment'; end if;
 if not exists(select 1 from public.message_response_tracking where delivery_id=did and response_status<>'replied' and last_reminded_at is not null and reminder_count=1) then raise exception 'Tracking persistence'; end if;
 denied:=false;begin perform public.prepare_message_reminders(array(select id from public.message_deliveries where batch_id=b),'portal',gen_random_uuid());exception when raise_exception then denied:=true;end;
 if not denied then raise exception 'Replied message accepted'; end if;
 -- Multi-recipient snapshots, using a fresh original to avoid the intentional cooldown.
 a:=public.prepare_workflow_messages(people,jsonb_object(array(select id::text from unnest(people) id),array['portal','portal','portal']),'__REMINDER_QA_MULTI__','QA','manual');
 perform public.queue_message_batch(a);
 bid:=public.prepare_message_reminders(array(select id from public.message_deliveries where batch_id=a),'portal',gen_random_uuid());
 if (select count(*) from public.message_snapshots where batch_id=bid)<>3 then raise exception 'Per-recipient snapshots'; end if;
 if exists(select 1 from public.message_snapshots s cross join lateral jsonb_array_elements(s.reminder_context) c where s.batch_id=bid and c->>'recipient_id'<>s.recipient_id::text) then raise exception 'Cross-recipient context'; end if;
 perform public.queue_message_batch(bid);perform public.queue_message_batch(bid);
 if exists(select 1 from public.message_deliveries where batch_id=a and reminder_count<>1) then raise exception 'Portal count / duplicate queue'; end if;
 update public.profiles set email=null where id=people[2];
 denied:=false;begin perform public.prepare_message_reminders(array(select id from public.message_deliveries where batch_id=a and recipient_id=people[2]),'email',gen_random_uuid());exception when raise_exception then denied:=true;end;
 if not denied then raise exception 'Missing email accepted'; end if;
 perform set_config('request.jwt.claim.sub',people[1]::text,true);execute 'set local role authenticated';
 denied:=false;begin perform public.prepare_message_reminders(array[did],'portal',gen_random_uuid());exception when raise_exception then denied:=true;end;
 if not denied then raise exception 'Non-manager accepted'; end if;
 if exists(select 1 from public.message_reminder_sources where recipient_id<>people[1]) then raise exception 'RLS leak'; end if;
 execute 'reset role';
end $$;
