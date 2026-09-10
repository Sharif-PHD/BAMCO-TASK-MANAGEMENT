-- One preparation path for default/custom messages; preserve old RPC clients.
alter table public.message_snapshots add column if not exists body_template text;
alter table public.message_snapshots add column if not exists sticker_path text;
alter table public.approval_chains add column if not exists superseded_by bigint references public.approval_chains(id);
create index if not exists approval_chains_superseded_idx on public.approval_chains(superseded_by) where superseded_by is not null;

create or replace function public.save_approval_chain(p_chain_id bigint,p_name text,p_member_ids uuid[],p_stages jsonb,p_is_default boolean default false)
returns bigint language plpgsql security definer set search_path='' as $$
declare v_id bigint; v_stage_id bigint; v_stage jsonb; v_n smallint:=0; v_old public.approval_chains%rowtype;
begin
 if not (select private.is_manager()) or not exists(select 1 from public.profiles where id=auth.uid() and active) then raise exception 'فقط مدیر فعال مجاز به تنظیم زنجیره است'; end if;
 perform pg_advisory_xact_lock(hashtext('bamco.approval-chain-config'));
 if nullif(btrim(p_name),'') is null then raise exception 'نام زنجیره الزامی است'; end if;
 if coalesce(cardinality(p_member_ids),0)=0 then raise exception 'کاربران مشمول را انتخاب کنید'; end if;
 if exists(select 1 from unnest(p_member_ids) u where not exists(select 1 from public.profiles p where p.id=u and p.active)) then raise exception 'یکی از کاربران غیرفعال یا نامعتبر است'; end if;
 if jsonb_typeof(p_stages)<>'array' or coalesce(jsonb_array_length(p_stages),0) not between 1 and 2 then raise exception 'زنجیره باید یک یا دو مرحله داشته باشد'; end if;
 for v_stage in select value from jsonb_array_elements(p_stages) loop
  if nullif(btrim(v_stage->>'title'),'') is null or coalesce(v_stage->>'rule','') not in ('any','all') or jsonb_typeof(v_stage->'approvers')<>'array' or coalesce(jsonb_array_length(v_stage->'approvers'),0)=0 then raise exception 'عنوان، قانون و تأییدکنندگان هر مرحله را کامل کنید'; end if;
  if exists(select 1 from jsonb_array_elements_text(v_stage->'approvers') u where not exists(select 1 from public.profiles p where p.id::text=u and p.active and p.role='manager')) then raise exception 'تأییدکننده باید مدیر فعال باشد'; end if;
 end loop;
 if p_chain_id is not null then
  select * into v_old from public.approval_chains where id=p_chain_id and superseded_by is null for update;
  if not found then raise exception 'زنجیره قبلاً تغییر کرده است؛ صفحه را تازه‌سازی کنید'; end if;
  update public.approval_chains set name=name||' (نسخه '||id||')',active=false,is_default=false where id=p_chain_id;
 end if;
 if p_is_default then update public.approval_chains set is_default=false where is_default; end if;
 insert into public.approval_chains(name,active,is_default,created_by) values(btrim(p_name),coalesce(v_old.active,true),p_is_default,auth.uid()) returning id into v_id;
 insert into public.approval_chain_members(chain_id,user_id) select v_id,u from (select distinct unnest(p_member_ids) u) x;
 for v_stage in select value from jsonb_array_elements(p_stages) loop
  v_n:=v_n+1;
  insert into public.approval_chain_stages(chain_id,stage_no,title,approval_rule) values(v_id,v_n,btrim(v_stage->>'title'),v_stage->>'rule') returning id into v_stage_id;
  insert into public.approval_stage_approvers(stage_id,approver_id) select distinct v_stage_id,u::uuid from jsonb_array_elements_text(v_stage->'approvers') u;
 end loop;
 if p_chain_id is not null then update public.approval_chains set superseded_by=v_id where id=p_chain_id; end if;
 return v_id;
end $$;
revoke all on function public.save_approval_chain(bigint,text,uuid[],jsonb,boolean) from public,anon;
grant execute on function public.save_approval_chain(bigint,text,uuid[],jsonb,boolean) to authenticated;

create or replace function public.chat_edit_message(p_message_id bigint,p_body text)
returns void language plpgsql security definer set search_path='' as $$
declare m public.chat_messages%rowtype;
begin
 select * into m from public.chat_messages where id=p_message_id and deleted_at is null for update;
 if not found or m.sender_id<>auth.uid() or not (select private.can_access_chat(m.thread_id)) or not exists(select 1 from public.profiles where id=auth.uid() and active) then raise exception 'فقط پیام خودتان در گفت‌وگوی فعال قابل ویرایش است'; end if;
 if m.body like 'BAMCO_ATTACHMENT_V1:%' or m.body like 'BAMCO_STICKER_V1:%' then raise exception 'فقط متن پیام قابل ویرایش است'; end if;
 if nullif(btrim(p_body),'') is null or length(p_body)>12000 or p_body like 'BAMCO_ATTACHMENT_V1:%' or p_body like 'BAMCO_STICKER_V1:%' then raise exception 'متن پیام نامعتبر است'; end if;
 update public.chat_messages set body=btrim(p_body),edited_at=now() where id=p_message_id;
 update public.chat_threads set updated_at=now() where id=m.thread_id;
end $$;
revoke all on function public.chat_edit_message(bigint,text) from public,anon;
grant execute on function public.chat_edit_message(bigint,text) to authenticated;

-- Templates edited in the UI are also the templates used by delivery.
update public.email_templates e set subject_template=coalesce(nullif(s.value->>'value',''),nullif(s.value#>>'{}',''),e.subject_template)
from public.app_settings s where s.key='email_subject_'||e.template_key;

create or replace function public.prepare_workflow_messages(p_recipient_ids uuid[],p_channels jsonb,p_subject text,p_template_text text default null,p_kind text default 'daily',p_report_date text default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare bid uuid; rid uuid; p public.profiles%rowtype; active_n int; warning_n int; overdue_n int;
 v_sticker smallint; v_key text; v_body text; v_final text; v_subject text; v_title text; v_path text; v_date text;
 snap_id bigint; ch text; task_json jsonb; task_ids bigint[]; warning_ids bigint[]; overdue_ids bigint[];
 warning_text text; overdue_text text; last_sent text; v_pair record; v_today date:=(now() at time zone 'Asia/Tehran')::date;
begin
 if not (select private.is_manager()) or not exists(select 1 from public.profiles where id=auth.uid() and active) then raise exception 'فقط مدیر فعال مجاز به آماده‌سازی پیام است'; end if;
 if coalesce(cardinality(p_recipient_ids),0)=0 then raise exception 'گیرنده انتخاب نشده است'; end if;
 if p_kind not in ('daily','reminder','manual') then raise exception 'نوع پیام نامعتبر است'; end if;
 if length(coalesce(p_template_text,''))>30000 then raise exception 'متن پیام بیش از حد طولانی است'; end if;
 v_date:=coalesce(nullif(btrim(p_report_date),''),v_today::text);
 insert into public.message_batches(kind,subject,created_by,status) values(p_kind,coalesce(nullif(btrim(p_subject),''),'گزارش وضعیت امور'),auth.uid(),'draft') returning id into bid;
 for rid in select distinct unnest(p_recipient_ids) loop
  select * into p from public.profiles where id=rid and active;
  if not found then raise exception 'گیرنده غیرفعال یا نامعتبر است'; end if;
  ch:=coalesce(p_channels->>rid::text,p.default_message_channel,'portal');
  if ch not in ('portal','email','both') then raise exception 'کانال ارسال نامعتبر است'; end if;
  if ch in ('email','both') and nullif(btrim(p.email),'') is null then raise exception 'برای % ایمیل ثبت نشده است؛ ارسال داخل سامانه را انتخاب کنید',p.full_name; end if;
  select count(*),count(*) filter(where due_state='warning'),count(*) filter(where due_state='overdue'),
   coalesce(array_agg(id order by id),'{}'),coalesce(array_agg(id order by id) filter(where due_state='warning'),'{}'),coalesce(array_agg(id order by id) filter(where due_state='overdue'),'{}'),
   coalesce(jsonb_agg(jsonb_build_object('id',id,'legacy_id',legacy_id,'title',title,'description',description,'status',status,'priority',priority,'start_date',start_date,'due_date',due_date,'due_state',due_state) order by id),'[]')
  into active_n,warning_n,overdue_n,task_ids,warning_ids,overdue_ids,task_json
  from (select t.*,case when t.status='منتظر پاسخ' then 'none' when t.due_date<v_today then 'overdue' when t.due_date<=v_today+greatest(coalesce(t.reminder_days,0),0) then 'warning' else 'none' end due_state from public.tasks t where t.owner_id=rid and not t.archived and t.status not in ('انجام شده','متوقف','ثبت شده')) x;
  v_sticker:=case when overdue_n>=5 then 5 when overdue_n>=3 then 4 when overdue_n>=1 then 3 when warning_n>=1 then 2 else 1 end;
  v_key:=case when p_kind='reminder' then 'followup' else 'state'||v_sticker end;
  select e.body_html,e.subject_template into v_body,v_subject from public.email_templates e where e.template_key=v_key;
  v_body:=coalesce(nullif(btrim(p_template_text),''),nullif(v_body,''));
  if v_body is null then raise exception 'متن پیش‌فرض % تعریف نشده است',v_key; end if;
  if nullif(btrim(p_template_text),'') is null then
   v_body:=regexp_replace(regexp_replace(regexp_replace(v_body,'<br\s*/?>',E'\n','gi'),'</p>',E'\n\n','gi'),'<[^>]*>','','g');
   v_body:=replace(replace(replace(replace(replace(replace(v_body,'&nbsp;',' '),'&lt;','<'),'&gt;','>'),'&quot;','"'),'&#39;',''''),'&amp;','&');
  end if;
  v_subject:=coalesce(nullif(btrim(p_subject),''),nullif(v_subject,''),'گزارش وضعیت امور');
  v_title:=(case when p.gender='خانم' then 'سرکار خانم ' else 'جناب آقای ' end)||coalesce(nullif(p.display_name,''),p.full_name,p.email);
  select max(d.sent_at)::date::text into last_sent from public.message_deliveries d where d.recipient_id=rid and d.status in ('sent','delivered');
  for v_pair in select * from (values
   ('[عنوان و نام مخاطب]',v_title),('[عنوان مخاطب]',v_title),('[نام مخاطب]',coalesce(p.full_name,p.email)),('[نام]',coalesce(p.full_name,p.email)),
   ('[تعداد امور هشداری]',warning_n::text),('[تعداد هشدار]',warning_n::text),('[تعداد امور دیرکردی]',overdue_n::text),('[تعداد دیرکرد]',overdue_n::text),('[تعداد کار فعال]',active_n::text),
   ('[تاریخ کامل شمسی]',v_date),('[تاریخ گزارش]',v_date),('[تاریخ آخرین ارسال]',coalesce(last_sent,'—'))
  ) placeholders(k,v) loop v_body:=replace(v_body,v_pair.k,v_pair.v);v_subject:=replace(v_subject,v_pair.k,v_pair.v);end loop;
  select string_agg((t->>'id')||' | '||(t->>'title')||' | '||(t->>'status')||' | پایان: '||coalesce(t->>'due_date','—'),E'\n') filter(where t->>'due_state'='warning'),string_agg((t->>'id')||' | '||(t->>'title')||' | '||(t->>'status')||' | پایان: '||coalesce(t->>'due_date','—'),E'\n') filter(where t->>'due_state'='overdue') into warning_text,overdue_text from jsonb_array_elements(task_json) t;
  v_final:=replace(replace(replace(v_body,'[جدول امور هشداری]',E'امور هشداری:\n'||coalesce(warning_text,'موردی وجود ندارد.')),'[جدول امور دیرکردی]',E'امور دیرکردی:\n'||coalesce(overdue_text,'موردی وجود ندارد.')),'[استیکر]','');
  select s.storage_path into v_path from public.stickers s join public.sticker_sets ss on ss.id=s.set_id where ss.active and s.state_key='state'||v_sticker and s.gender=case when p.gender='خانم' then 'female' else 'male' end order by ss.id desc limit 1;
  insert into public.message_snapshots(batch_id,recipient_id,recipient_name,recipient_email,cc_emails,active_count,warning_count,overdue_count,sticker_state,template_key,subject,final_text,task_ids,warning_task_ids,overdue_task_ids,tasks,body_template,sticker_path)
  values(bid,rid,coalesce(p.full_name,p.email),p.email,p.cc_emails,active_n,warning_n,overdue_n,v_sticker,v_key,v_subject,v_final,task_ids,warning_ids,overdue_ids,task_json,v_body,v_path) returning id into snap_id;
  if ch in ('portal','both') then insert into public.message_deliveries(batch_id,snapshot_id,recipient_id,channel,idempotency_key,thread_key) values(bid,snap_id,rid,'portal',bid||':'||rid||':portal','BAMCO-'||replace(bid::text,'-','')||'-'||left(replace(rid::text,'-',''),8));end if;
  if ch in ('email','both') then insert into public.message_deliveries(batch_id,snapshot_id,recipient_id,channel,idempotency_key,thread_key) values(bid,snap_id,rid,'email',bid||':'||rid||':email','BAMCO-'||replace(bid::text,'-','')||'-'||left(replace(rid::text,'-',''),8)||'-E');end if;
 end loop;
 update public.message_batches set status='ready' where id=bid;return bid;
end $$;
revoke all on function public.prepare_workflow_messages(uuid[],jsonb,text,text,text,text) from public,anon;
grant execute on function public.prepare_workflow_messages(uuid[],jsonb,text,text,text,text) to authenticated;

create or replace function public.prepare_message_batch(p_recipient_ids uuid[],p_channels jsonb,p_subject text,p_template_text text,p_kind text default 'daily')
returns uuid language sql security invoker set search_path='' as $$ select public.prepare_workflow_messages(p_recipient_ids,p_channels,p_subject,p_template_text,p_kind) $$;
create or replace function public.bamco_prepare_message_batch_v2(p_recipient_ids uuid[],p_channels jsonb,p_subject text,p_template_text text,p_kind text default 'daily')
returns uuid language sql security invoker set search_path='' as $$ select public.prepare_workflow_messages(p_recipient_ids,p_channels,p_subject,p_template_text,p_kind) $$;

-- Completed/cancelled work must never generate late reminders.
create or replace view public.message_recipient_live_state with (security_invoker=true) as
select p.id recipient_id,p.full_name recipient_name,p.email,p.cc_emails,p.default_message_channel,
 count(t.id) active_count,count(t.id) filter(where d.due_state='warning') warning_count,count(t.id) filter(where d.due_state='overdue') overdue_count,
 case when count(t.id) filter(where d.due_state='overdue')>=5 then 5 when count(t.id) filter(where d.due_state='overdue')>=3 then 4 when count(t.id) filter(where d.due_state='overdue')>=1 then 3 when count(t.id) filter(where d.due_state='warning')>=1 then 2 else 1 end::smallint sticker_state,
 (select max(md.sent_at) from public.message_deliveries md where md.recipient_id=p.id and md.status in ('sent','delivered')) last_sent_at
from public.profiles p left join public.tasks t on t.owner_id=p.id and not t.archived and t.status not in ('انجام شده','متوقف','ثبت شده')
left join lateral(select case when t.status='منتظر پاسخ' then 'none' when t.due_date<(now() at time zone 'Asia/Tehran')::date then 'overdue' when t.due_date<=(now() at time zone 'Asia/Tehran')::date+greatest(coalesce(t.reminder_days,0),0) then 'warning' else 'none' end due_state) d on true
where p.active group by p.id,p.full_name,p.email,p.cc_emails,p.default_message_channel;
