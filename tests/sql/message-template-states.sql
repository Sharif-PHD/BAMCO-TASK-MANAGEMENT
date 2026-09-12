-- Run inside BEGIN/ROLLBACK. No external message is sent.
do $$
declare mgr uuid; rid uuid; ids bigint[]; bid uuid; snap public.message_snapshots%rowtype; k int; n int; recipients uuid[];
begin
 select id into mgr from public.profiles where active and role='manager' limit 1;
 perform set_config('request.jwt.claim.sub',mgr::text,true);
 select array_agg(recipient_id) into recipients from public.message_recipient_live_state;
 bid:=public.prepare_workflow_messages(recipients,(select jsonb_object_agg(x::text,'portal') from unnest(recipients) x),'',null,'daily');
 if exists(select 1 from public.message_snapshots s join public.message_recipient_live_state v on v.recipient_id=s.recipient_id where s.batch_id=bid and (s.sticker_state<>v.sticker_state or s.warning_count<>v.warning_count or s.overdue_count<>v.overdue_count)) then raise exception 'UI/snapshot mismatch'; end if;
 if exists(select 1 from public.message_snapshots s cross join lateral jsonb_array_elements(s.tasks) t join public.tasks original on original.id=(t->>'id')::bigint where s.batch_id=bid and original.owner_id<>s.recipient_id) then raise exception 'Cross-user task leak'; end if;
 select owner_id into rid from public.message_task_state where status_kind='active' and not archived group by owner_id having count(*)>=5 limit 1;
 select array_agg(id order by id) into ids from public.message_task_state where owner_id=rid and status_kind='active' and not archived;
 if cardinality(ids)<5 then raise exception 'Five tasks required'; end if;
 for k in 1..5 loop
   update public.tasks set due_date=current_date+365 where id=any(ids);
   n:=case k when 3 then 1 when 4 then 3 when 5 then 5 else 0 end;
   if n>0 then update public.tasks set due_date=current_date-1 where id=any(ids[1:n]); end if;
   if k=2 then update public.tasks set due_date=current_date,reminder_days=1 where id=ids[1]; end if;
   bid:=public.prepare_workflow_messages(array[rid],jsonb_build_object(rid::text,'portal'),'',null,'daily');
   select * into snap from public.message_snapshots where batch_id=bid;
   if snap.template_key<>'state'||k or snap.sticker_state<>k or snap.overdue_count<>n then raise exception 'Wrong template for state %: %',k,snap.template_key; end if;
   if snap.waiting_count>0 and position('[جدول امور منتظر پاسخ]' in snap.body_template)=0 then raise exception 'Missing waiting table'; end if;
   if snap.body_template like '%[عنوان و نام مخاطب]%' then raise exception 'Unexpanded recipient'; end if;
 end loop;
end $$;
