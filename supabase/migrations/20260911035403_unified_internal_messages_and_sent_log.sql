alter table public.chat_messages add column if not exists source_portal_message_id bigint references public.portal_messages(id) on delete set null;
create unique index if not exists chat_messages_source_portal_unique on public.chat_messages(source_portal_message_id) where source_portal_message_id is not null;

create or replace function private.create_portal_event(p_user uuid, p_title text, p_body text, p_type text, p_entity_type text, p_entity_id text)
returns void language plpgsql security definer set search_path='' as $$
declare mid bigint; v_sender uuid:=auth.uid(); v_sender_name text;
begin
  if p_user is null or not exists(select 1 from public.profiles where id=p_user and active) then return; end if;
  select coalesce(nullif(display_name,''),nullif(full_name,''),email::text,'سامانه') into v_sender_name from public.profiles where id=v_sender;
  v_sender_name:=coalesce(v_sender_name,'سامانه');
  insert into public.portal_messages(sender_id,subject,body,importance,allow_reply,require_ack,template_key,sender_name_snapshot)
  values(v_sender,left(coalesce(p_title,'پیام سامانه'),240),coalesce(p_body,''),'normal',false,false,coalesce(nullif(p_type,''),'system_event'),v_sender_name) returning id into mid;
  insert into public.portal_message_recipients(message_id,recipient_id) values(mid,p_user) on conflict do nothing;
end;$$;

create or replace function private.portal_recipient_to_system_chat()
returns trigger language plpgsql security definer set search_path='' as $$
declare p public.portal_messages%rowtype; tid uuid; v_kind text; v_sender_name text;
begin
  select * into p from public.portal_messages where id=new.message_id;if not found then return new; end if;
  v_sender_name:=coalesce(nullif(p.sender_name_snapshot,''),(select coalesce(nullif(display_name,''),nullif(full_name,''),email::text) from public.profiles where id=p.sender_id),'سامانه');v_kind:=coalesce(nullif(p.template_key,''),'system');
  insert into public.chat_threads(thread_type,title,direct_key,system_recipient_id,created_by,is_active,updated_at)
  values('direct','پیام‌های خودکار سامانه','system:'||new.recipient_id::text,new.recipient_id,p.sender_id,true,now())
  on conflict(system_recipient_id) where system_recipient_id is not null do update set is_active=true,direct_key='system:'||excluded.system_recipient_id::text,title='پیام‌های خودکار سامانه',updated_at=now() returning id into tid;
  insert into public.chat_members(thread_id,user_id) select tid,id from public.profiles where active and (id=new.recipient_id or role='manager') on conflict do nothing;
  insert into public.chat_messages(thread_id,sender_id,body,is_system,message_kind,source_portal_message_id,sender_name_snapshot)
  values(tid,p.sender_id,'BAMCO_PORTAL_MESSAGE_V1:'||p.id::text,true,v_kind,p.id,v_sender_name)
  on conflict(source_portal_message_id) where source_portal_message_id is not null do nothing;
  update public.message_deliveries set chat_thread_id=tid where portal_message_id=p.id and recipient_id=new.recipient_id;
  return new;
end;$$;
drop trigger if exists portal_recipient_system_chat on public.portal_message_recipients;
create trigger portal_recipient_system_chat after insert on public.portal_message_recipients for each row execute function private.portal_recipient_to_system_chat();

create or replace function private.notify_chat_message()
returns trigger language plpgsql security definer set search_path='' as $$
declare t public.chat_threads%rowtype; kind text; preview text; v_subject text; v_portal_body text;
begin
 select * into t from public.chat_threads where id=new.thread_id;
 kind:=case when new.is_system then coalesce(new.message_kind,'system') when t.system_recipient_id is not null then 'system_reply' when t.task_id is not null then 'task_chat' when t.thread_type='public' then 'public_chat' when t.thread_type='group' then 'group_chat' else 'direct_chat' end;
 if new.body like 'BAMCO_PORTAL_MESSAGE_V1:%' then select subject,body into v_subject,v_portal_body from public.portal_messages where id=new.source_portal_message_id;preview:=left(coalesce(v_portal_body,v_subject,'پیام جدید سامانه'),220);else preview:=case when new.body like 'BAMCO_ATTACHMENT_V1:%' then 'فایل یا تصویر جدید' when new.body like 'BAMCO_STICKER_V1:%' then 'استیکر جدید' else left(new.body,220) end;end if;
 insert into public.notifications(user_id,notification_type,title,body,entity_type,entity_id)
 select p.id,kind,case when new.is_system then coalesce(v_subject,case when kind='reminder' then 'یادآور سامانه' when kind='daily' then 'گزارش وضعیت امور روزانه' else 'پیام سامانه' end) else t.title end,preview,'chat_thread',t.id::text
 from public.profiles p where p.active and p.id is distinct from new.sender_id and (case when new.is_system then p.id=t.system_recipient_id when t.thread_type='public' then true else exists(select 1 from public.chat_members cm where cm.thread_id=t.id and cm.user_id=p.id) end);
 update public.chat_threads set updated_at=new.created_at where id=t.id;return new;
end $$;

create or replace function public.chat_conversation_list()
returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(x order by x.updated_at desc),'[]'::jsonb) from (
 select t.id,t.thread_type,t.task_id,t.avatar_path,t.system_recipient_id,t.is_active,t.participant_deleted_at,
 case when t.system_recipient_id is not null then 'پیام‌های خودکار سامانه' when t.thread_type='direct' then coalesce(peer.full_name,t.deleted_participant_name,t.title) else t.title end title,
 peer.id person_id,t.updated_at,
 (select case when m.body like 'BAMCO_PORTAL_MESSAGE_V1:%' then coalesce((select pm.subject from public.portal_messages pm where pm.id=m.source_portal_message_id),'پیام سامانه') else left(m.body,160) end from public.chat_messages m where m.thread_id=t.id and m.deleted_at is null order by m.created_at desc limit 1) last_message,
 (select count(*) from public.notifications n where n.user_id=auth.uid() and n.entity_type='chat_thread' and n.entity_id=t.id::text and n.read_at is null) unread_count
 from public.chat_threads t left join lateral(select p.id,p.full_name from public.chat_members cm join public.profiles p on p.id=cm.user_id where cm.thread_id=t.id and cm.user_id<>auth.uid() and p.id is distinct from t.system_recipient_id order by cm.joined_at limit 1) peer on true
 where auth.uid() is not null and private.has_account() and (t.is_active or t.participant_deleted_at is not null) and (t.thread_type='public' or exists(select 1 from public.chat_members cm where cm.thread_id=t.id and cm.user_id=auth.uid()))
 ) x;
$$;

create or replace function public.chat_system_message_payload(p_message_id bigint)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare cm public.chat_messages%rowtype; pm public.portal_messages%rowtype; d public.message_deliveries%rowtype; s public.message_snapshots%rowtype; v_sender text;
begin
 select * into cm from public.chat_messages where id=p_message_id and source_portal_message_id is not null and deleted_at is null;if not found then raise exception 'پیام سامانه پیدا نشد'; end if;
 if auth.uid() is null or not private.can_access_chat(cm.thread_id) then raise exception 'دسترسی ندارید'; end if;
 select * into pm from public.portal_messages where id=cm.source_portal_message_id;select * into d from public.message_deliveries where portal_message_id=pm.id order by id desc limit 1;if found and d.snapshot_id is not null then select * into s from public.message_snapshots where id=d.snapshot_id;end if;
 v_sender:=coalesce(nullif(pm.sender_name_snapshot,''),(select coalesce(nullif(display_name,''),nullif(full_name,''),email::text) from public.profiles where id=pm.sender_id),'سامانه');
 return jsonb_build_object('portal_message_id',pm.id,'subject',pm.subject,'body',pm.body,'created_at',pm.created_at,'sender_name',v_sender,'snapshot',case when s.id is null then null else to_jsonb(s) end);
end;$$;
grant execute on function public.chat_system_message_payload(bigint) to authenticated;

create or replace function public.prepare_workflow_messages(p_recipient_ids uuid[], p_channels jsonb, p_subject text, p_template_text text default null, p_kind text default 'daily', p_report_date text default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare bid uuid; rid uuid; p public.profiles%rowtype; active_n int; warning_n int; overdue_n int;v_sticker smallint; v_key text; v_body text; v_final text; v_subject text; v_title text; v_path text; v_date text;snap_id bigint; ch text; task_json jsonb; task_ids bigint[]; warning_ids bigint[]; overdue_ids bigint[];warning_text text; overdue_text text; last_sent text; v_pair record; v_today date:=(now() at time zone 'Asia/Tehran')::date;
begin
 if not (select private.is_manager()) or not exists(select 1 from public.profiles where id=auth.uid() and active) then raise exception 'فقط مدیر فعال مجاز به آماده‌سازی پیام است'; end if;if coalesce(cardinality(p_recipient_ids),0)=0 then raise exception 'گیرنده انتخاب نشده است'; end if;if p_kind not in ('daily','reminder','manual') then raise exception 'نوع پیام نامعتبر است'; end if;if length(coalesce(p_template_text,''))>30000 then raise exception 'متن پیام بیش از حد طولانی است'; end if;v_date:=coalesce(nullif(btrim(p_report_date),''),v_today::text);
 insert into public.message_batches(kind,subject,created_by,status) values(p_kind,coalesce(nullif(btrim(p_subject),''),'گزارش وضعیت امور'),auth.uid(),'draft') returning id into bid;
 for rid in select distinct unnest(p_recipient_ids) loop
  select * into p from public.profiles where id=rid and active;if not found then raise exception 'گیرنده غیرفعال یا نامعتبر است'; end if;ch:=coalesce(p_channels->>rid::text,p.default_message_channel,'portal');if ch not in ('portal','email','both') then raise exception 'کانال ارسال نامعتبر است'; end if;if ch in ('email','both') and nullif(btrim(p.email::text),'') is null then raise exception 'برای % ایمیل ثبت نشده است؛ ارسال داخل سامانه را انتخاب کنید',p.full_name; end if;
  select count(*),count(*) filter(where due_state='warning'),count(*) filter(where due_state='overdue'),coalesce(array_agg(id order by id),'{}'),coalesce(array_agg(id order by id) filter(where due_state='warning'),'{}'),coalesce(array_agg(id order by id) filter(where due_state='overdue'),'{}'),coalesce(jsonb_agg(jsonb_build_object('id',id,'legacy_id',legacy_id,'title',title,'description',description,'status',(private.task_status_option(status)).label,'priority',(private.task_priority_option(priority)).label,'start_date',start_date,'due_date',due_date,'due_state',due_state) order by id),'[]') into active_n,warning_n,overdue_n,task_ids,warning_ids,overdue_ids,task_json from (select t.*,case when not coalesce((private.task_status_option(t.status)).tracks_deadline,false) then 'none' when t.due_date<v_today then 'overdue' when t.due_date<=v_today+greatest(coalesce(t.reminder_days,0),0) then 'warning' else 'none' end due_state from public.tasks t where t.owner_id=rid and not t.archived and (private.task_status_option(t.status)).kind not in ('completed','cancelled','registered')) x;
  v_sticker:=case when overdue_n>=5 then 5 when overdue_n>=3 then 4 when overdue_n>=1 then 3 when warning_n>=1 then 2 else 1 end;v_key:=case when p_kind='reminder' then 'followup' else 'state'||v_sticker end;select e.body_html,e.subject_template into v_body,v_subject from public.email_templates e where e.template_key=v_key;v_body:=coalesce(nullif(btrim(p_template_text),''),nullif(v_body,''));if v_body is null then raise exception 'متن پیش‌فرض % تعریف نشده است',v_key;end if;
  if nullif(btrim(p_template_text),'') is null then v_body:=regexp_replace(regexp_replace(regexp_replace(v_body,'<br\\s*/?>',E'\n','gi'),'</p>',E'\n\n','gi'),'<[^>]*>','','g');v_body:=replace(replace(replace(replace(replace(replace(v_body,'&nbsp;',' '),'&lt;','<'),'&gt;','>'),'&quot;','"'),'&#39;',''''),'&amp;','&');end if;
  v_subject:=coalesce(nullif(btrim(p_subject),''),nullif(v_subject,''),'گزارش وضعیت امور');v_title:=trim(coalesce(nullif(p.salutation,''),case when p.gender='خانم' then 'سرکار خانم' else 'جناب آقای' end))||' '||coalesce(nullif(p.display_name,''),nullif(p.full_name,''),p.email::text,'');select max(d.sent_at)::date::text into last_sent from public.message_deliveries d where d.recipient_id=rid and d.status in ('sent','delivered');
  for v_pair in select * from (values('[عنوان و نام مخاطب]',v_title),('[عنوان مخاطب]',v_title),('[نام مخاطب]',coalesce(nullif(p.display_name,''),p.full_name,p.email::text)),('[نام]',coalesce(nullif(p.display_name,''),p.full_name,p.email::text)),('[تعداد امور هشداری]',warning_n::text),('[تعداد هشدار]',warning_n::text),('[تعداد امور دیرکردی]',overdue_n::text),('[تعداد دیرکرد]',overdue_n::text),('[تعداد کار فعال]',active_n::text),('[تاریخ کامل شمسی]',v_date),('[تاریخ گزارش]',v_date),('[تاریخ آخرین ارسال]',coalesce(last_sent,'—'))) placeholders(k,v) loop v_body:=replace(v_body,v_pair.k,v_pair.v);v_subject:=replace(v_subject,v_pair.k,v_pair.v);end loop;
  select string_agg((t->>'id')||' | '||(t->>'title')||' | '||(t->>'status')||' | پایان: '||coalesce(t->>'due_date','—'),E'\n') filter(where t->>'due_state'='warning'),string_agg((t->>'id')||' | '||(t->>'title')||' | '||(t->>'status')||' | پایان: '||coalesce(t->>'due_date','—'),E'\n') filter(where t->>'due_state'='overdue') into warning_text,overdue_text from jsonb_array_elements(task_json) t;v_final:=replace(replace(replace(v_body,'[جدول امور هشداری]',E'امور هشداری:\n'||coalesce(warning_text,'موردی وجود ندارد.')),'[جدول امور دیرکردی]',E'امور دیرکردی:\n'||coalesce(overdue_text,'موردی وجود ندارد.')),'[استیکر]','');
  select s.storage_path into v_path from public.stickers s join public.sticker_sets ss on ss.id=s.set_id where ss.active and s.state_key='state'||v_sticker and s.gender=case when p.gender='خانم' then 'female' else 'male' end order by ss.id desc limit 1;
  insert into public.message_snapshots(batch_id,recipient_id,recipient_name,recipient_email,cc_emails,active_count,warning_count,overdue_count,sticker_state,template_key,subject,final_text,task_ids,warning_task_ids,overdue_task_ids,tasks,body_template,sticker_path) values(bid,rid,coalesce(nullif(p.display_name,''),p.full_name,p.email::text),p.email,p.cc_emails,active_n,warning_n,overdue_n,v_sticker,v_key,v_subject,v_final,task_ids,warning_ids,overdue_ids,task_json,v_body,v_path) returning id into snap_id;
  if ch in ('portal','both') then insert into public.message_deliveries(batch_id,snapshot_id,recipient_id,channel,idempotency_key,thread_key) values(bid,snap_id,rid,'portal',bid||':'||rid||':portal','BAMCO-'||replace(bid::text,'-','')||'-'||left(replace(rid::text,'-',''),8));end if;if ch in ('email','both') then insert into public.message_deliveries(batch_id,snapshot_id,recipient_id,channel,idempotency_key,thread_key) values(bid,snap_id,rid,'email',bid||':'||rid||':email','BAMCO-'||replace(bid::text,'-','')||'-'||left(replace(rid::text,'-',''),8)||'-E');end if;
 end loop;update public.message_batches set status='ready' where id=bid;return bid;
end $$;

create or replace function public.queue_message_batch(p_batch_id uuid)
returns integer language plpgsql security definer set search_path='' as $$
declare d public.message_deliveries%rowtype; s public.message_snapshots%rowtype; mid bigint; n int:=0; tid uuid; v_sender_name text;
begin
 if not (select private.is_manager()) then raise exception 'فقط مدیر مجاز به ارسال پیام است'; end if;select coalesce(nullif(display_name,''),nullif(full_name,''),email::text,'سامانه') into v_sender_name from public.profiles where id=auth.uid();v_sender_name:=coalesce(v_sender_name,'سامانه');
 for d in select * from public.message_deliveries where batch_id=p_batch_id and status='ready' for update loop select * into s from public.message_snapshots where id=d.snapshot_id;if d.channel='portal' then insert into public.portal_messages(sender_id,subject,body,importance,allow_reply,require_ack,template_key,sender_name_snapshot) values(auth.uid(),s.subject,s.final_text,'normal',false,false,s.template_key,v_sender_name) returning id into mid;insert into public.portal_message_recipients(message_id,recipient_id,sticker_state) values(mid,d.recipient_id,'state'||s.sticker_state) on conflict do nothing;select id into tid from public.chat_threads where system_recipient_id=d.recipient_id limit 1;update public.message_deliveries set status='sent',portal_message_id=mid,chat_thread_id=tid,attempt_count=1,last_attempt_at=now(),sent_at=now() where id=d.id;else update public.message_deliveries set status='queued' where id=d.id;end if;n:=n+1;end loop;
 update public.message_batches set status=case when exists(select 1 from public.message_deliveries where batch_id=p_batch_id and status='queued') then 'queued' else 'sent' end,queued_at=now(),completed_at=case when not exists(select 1 from public.message_deliveries where batch_id=p_batch_id and status in ('ready','queued','processing')) then now() end where id=p_batch_id;return n;
end $$;

create or replace view public.sent_message_log with (security_invoker=true) as
select 'delivery:'||d.id::text as log_key,'delivery'::text as source_type,d.id::text as source_id,d.recipient_id,s.recipient_name,s.subject,d.channel,d.status as delivery_status,coalesce(d.sent_at,d.created_at) as sent_at,d.attempt_count,d.error_message,d.thread_key,b.created_by as sender_id,coalesce(nullif(p.display_name,''),nullif(p.full_name,''),p.email::text,'سامانه') as sender_name,d.snapshot_id,d.portal_message_id
from public.message_deliveries d join public.message_snapshots s on s.id=d.snapshot_id join public.message_batches b on b.id=d.batch_id left join public.profiles p on p.id=b.created_by
union all
select 'portal:'||pm.id::text||':'||r.recipient_id::text,'portal_event',pm.id::text,r.recipient_id,coalesce(nullif(pr.display_name,''),nullif(pr.full_name,''),pr.email::text,r.recipient_id::text),pm.subject,'portal','sent',pm.created_at,1,null,null,pm.sender_id,coalesce(nullif(pm.sender_name_snapshot,''),nullif(ps.display_name,''),nullif(ps.full_name,''),ps.email::text,'سامانه'),null::bigint,pm.id
from public.portal_messages pm join public.portal_message_recipients r on r.message_id=pm.id left join public.profiles pr on pr.id=r.recipient_id left join public.profiles ps on ps.id=pm.sender_id where not exists(select 1 from public.message_deliveries d where d.portal_message_id=pm.id and d.recipient_id=r.recipient_id);
grant select on public.sent_message_log to authenticated;
