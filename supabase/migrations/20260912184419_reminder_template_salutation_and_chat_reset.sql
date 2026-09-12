-- Preserve the reset watermark on clean database migration replay as well.
create table if not exists private.system_chat_resets (
 user_id uuid primary key references public.profiles(id) on delete cascade,
 cleared_at timestamptz not null
);
alter table private.system_chat_resets enable row level security;
revoke all on table private.system_chat_resets from public,anon,authenticated;
-- Original followup template from the user-supplied desktop source.
create or replace function private.message_salutation(p_salutation text,p_name text,p_gender text) returns text language sql immutable set search_path='' as $$
 select coalesce(nullif(btrim(p_salutation),''),concat(case when p_gender='خانم' then 'سرکار خانم ' else 'جناب آقای ' end,p_name))
$$;
revoke all on function private.message_salutation(text,text,text) from public,anon,authenticated;
create or replace function private.message_persian_date(p_date date) returns text language plpgsql immutable set search_path='' as $$
declare gy int;gm int;gd int;gy2 int;jy int;jm int;jd int;days int;gdm int[]:=array[0,31,59,90,120,151,181,212,243,273,304,334];
begin
 if p_date is null then return 'ثبت نشده';end if;
 gy:=extract(year from p_date);gm:=extract(month from p_date);gd:=extract(day from p_date);gy2:=case when gm>2 then gy+1 else gy end;
 days:=355666+365*gy+(gy2+3)/4-(gy2+99)/100+(gy2+399)/400+gd+gdm[gm];
 jy:=-1595+33*(days/12053);days:=days%12053;jy:=jy+4*(days/1461);days:=days%1461;
 if days>365 then jy:=jy+(days-1)/365;days:=(days-1)%365;end if;
 if days<186 then jm:=1+days/31;jd:=1+days%31;else jm:=7+(days-186)/30;jd:=1+(days-186)%30;end if;
 return translate(jy::text||'/'||lpad(jm::text,2,'0')||'/'||lpad(jd::text,2,'0'),'0123456789','۰۱۲۳۴۵۶۷۸۹');
end $$;
revoke all on function private.message_persian_date(date) from public,anon,authenticated;
update public.email_templates set subject_template=$subject$یادآوری مجدد وضعیت امور | [تاریخ کامل شمسی]$subject$,body_html=$body$[عنوان و نام مخاطب]

با درود و مهر،

پیرو آخرین گزارش ارسال‌شده درباره وضعیت امور در تاریخ [تاریخ آخرین ارسال]، تاکنون پاسخی از سوی شما دریافت نشده است.

خواهشمند است در صورت انجام فعالیت‌ها، ایجاد پیشرفت یا تغییر در آخرین وضعیت امور، مراتب را از طریق پاسخ به همین ایمیل اعلام فرمایید تا اطلاعات فایل «مدیریت وظایف» به‌روزرسانی شود.

همچنین در صورت نیاز می‌توانید از طریق شماره داخلی ۷۴۸۸ با مهندس قائمی در ارتباط باشید.

با تشکر و احترام
سامانه خودکار پایش و پیگیری امور
شرکت خودروسازان بم
واحد مهندسی محصول$body$ where template_key='followup';
CREATE OR REPLACE FUNCTION public.prepare_workflow_messages(p_recipient_ids uuid[], p_channels jsonb, p_subject text, p_template_text text DEFAULT NULL::text, p_kind text DEFAULT 'daily'::text, p_report_date text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  bid uuid; rid uuid; p public.profiles%rowtype;
  active_n int; warning_n int; overdue_n int; waiting_n int;
  v_sticker smallint; v_key text; v_body text; v_final text; v_subject text; v_title text; v_path text; v_date text;
  snap_id bigint; ch text; task_json jsonb; task_ids bigint[]; warning_ids bigint[]; overdue_ids bigint[]; waiting_ids bigint[];
  warning_text text; overdue_text text; waiting_text text; last_sent text; v_pair record;
  v_today date:=(now() at time zone 'Asia/Tehran')::date;
begin
  if not (select private.is_manager()) or not exists(select 1 from public.profiles where id=auth.uid() and active) then
    raise exception 'فقط مدیر فعال مجاز به آماده‌سازی پیام است';
  end if;
  if coalesce(cardinality(p_recipient_ids),0)=0 then raise exception 'گیرنده انتخاب نشده است'; end if;
  if p_kind not in ('daily','reminder','manual') then raise exception 'نوع پیام نامعتبر است'; end if;
  if length(coalesce(p_template_text,''))>30000 then raise exception 'متن پیام بیش از حد طولانی است'; end if;
  v_date:=coalesce(nullif(btrim(p_report_date),''),v_today::text);

  insert into public.message_batches(kind,subject,created_by,status)
  values(p_kind,coalesce(nullif(btrim(p_subject),''),'گزارش وضعیت امور'),auth.uid(),'draft')
  returning id into bid;

  for rid in select distinct unnest(p_recipient_ids) loop
    select * into p from public.profiles where id=rid and active;
    if not found then raise exception 'گیرنده غیرفعال یا نامعتبر است'; end if;
    ch:=coalesce(p_channels->>rid::text,p.default_message_channel,'portal');
    if ch not in ('portal','email','both') then raise exception 'کانال ارسال نامعتبر است'; end if;
    if ch in ('email','both') and nullif(btrim(p.email),'') is null then
      raise exception 'برای % ایمیل ثبت نشده است؛ ارسال داخل سامانه را انتخاب کنید',p.full_name;
    end if;

    select count(*),
           count(*) filter(where message_due_state='warning'),
           count(*) filter(where message_due_state='overdue'),
           count(*) filter(where status_kind='waiting'),
           coalesce(array_agg(id order by id),'{}'),
           coalesce(array_agg(id order by id) filter(where message_due_state='warning'),'{}'),
           coalesce(array_agg(id order by id) filter(where message_due_state='overdue'),'{}'),
           coalesce(array_agg(id order by id) filter(where status_kind='waiting'),'{}'),
           coalesce(jsonb_agg(jsonb_build_object(
             'id',id,'legacy_id',legacy_id,'title',title,'description',description,
             'status',status,'status_key',status_key,'status_kind',status_kind,'status_color',status_color,
             'priority',priority,'priority_key',priority_key,'priority_color',priority_color,
             'start_date',start_date,'due_date',due_date,'due_state',message_due_state
           ) order by id),'[]'::jsonb)
    into active_n,warning_n,overdue_n,waiting_n,task_ids,warning_ids,overdue_ids,waiting_ids,task_json
    from public.message_task_state
    where owner_id=rid and not archived and status_kind not in ('registered','completed','cancelled');

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
    v_title:=private.message_salutation(p.salutation,coalesce(nullif(p.display_name,''),p.full_name,p.email),p.gender);
    select max(d.sent_at)::date::text into last_sent from public.message_deliveries d where d.recipient_id=rid and d.status in ('sent','delivered');

    for v_pair in select * from (values
      ('[عنوان و نام مخاطب]',v_title),('[عنوان مخاطب]',v_title),('[نام مخاطب]',coalesce(p.full_name,p.email)),('[نام]',coalesce(p.full_name,p.email)),
      ('[تعداد امور هشداری]',warning_n::text),('[تعداد هشدار]',warning_n::text),
      ('[تعداد امور دیرکردی]',overdue_n::text),('[تعداد دیرکرد]',overdue_n::text),
      ('[تعداد امور منتظر پاسخ]',waiting_n::text),('[تعداد منتظر پاسخ]',waiting_n::text),
      ('[تعداد کار فعال]',active_n::text),('[تاریخ کامل شمسی]',v_date),('[تاریخ گزارش]',v_date),('[تاریخ آخرین ارسال]',coalesce(last_sent,'—'))
    ) placeholders(k,v) loop
      v_body:=replace(v_body,v_pair.k,v_pair.v);
      v_subject:=replace(v_subject,v_pair.k,v_pair.v);
    end loop;

    select string_agg((t->>'id')||' | '||(t->>'title')||' | '||(t->>'status')||' | پایان: '||coalesce(t->>'due_date','—'),E'\n') filter(where t->>'due_state'='warning'),
           string_agg((t->>'id')||' | '||(t->>'title')||' | '||(t->>'status')||' | پایان: '||coalesce(t->>'due_date','—'),E'\n') filter(where t->>'due_state'='overdue'),
           string_agg((t->>'id')||' | '||(t->>'title')||' | '||(t->>'priority')||' | شروع: '||coalesce(t->>'start_date','—'),E'\n') filter(where t->>'status_kind'='waiting')
    into warning_text,overdue_text,waiting_text
    from jsonb_array_elements(task_json) t;

    if waiting_n>0 and position('[جدول امور منتظر پاسخ]' in v_body)=0 then
      v_body:=v_body||E'\n\n[جدول امور منتظر پاسخ]';
    end if;

    v_final:=replace(replace(replace(replace(
      v_body,
      '[جدول امور هشداری]',E'امور هشداری:\n'||coalesce(warning_text,'موردی وجود ندارد.')),
      '[جدول امور دیرکردی]',E'امور دیرکردی:\n'||coalesce(overdue_text,'موردی وجود ندارد.')),
      '[جدول امور منتظر پاسخ]',E'امور منتظر پاسخ:\n'||coalesce(waiting_text,'موردی در انتظار پاسخ نیست.')),
      '[استیکر]','');



    select s.storage_path into v_path
    from public.stickers s join public.sticker_sets ss on ss.id=s.set_id
    where ss.active and s.state_key='state'||v_sticker and s.gender=case when p.gender='خانم' then 'female' else 'male' end
    order by ss.id desc limit 1;

    insert into public.message_snapshots(
      batch_id,recipient_id,recipient_name,recipient_email,cc_emails,
      active_count,warning_count,overdue_count,waiting_count,sticker_state,template_key,subject,final_text,
      task_ids,warning_task_ids,overdue_task_ids,waiting_task_ids,tasks,body_template,sticker_path
    ) values(
      bid,rid,coalesce(p.full_name,p.email),p.email,p.cc_emails,
      active_n,warning_n,overdue_n,waiting_n,v_sticker,v_key,v_subject,v_final,
      task_ids,warning_ids,overdue_ids,waiting_ids,task_json,v_body,v_path
    ) returning id into snap_id;

    if ch in ('portal','both') then
      insert into public.message_deliveries(batch_id,snapshot_id,recipient_id,channel,idempotency_key,thread_key)
      values(bid,snap_id,rid,'portal',bid||':'||rid||':portal','BAMCO-'||replace(bid::text,'-','')||'-'||left(replace(rid::text,'-',''),8));
    end if;
    if ch in ('email','both') then
      insert into public.message_deliveries(batch_id,snapshot_id,recipient_id,channel,idempotency_key,thread_key)
      values(bid,snap_id,rid,'email',bid||':'||rid||':email','BAMCO-'||replace(bid::text,'-','')||'-'||left(replace(rid::text,'-',''),8)||'-E');
    end if;
  end loop;

  update public.message_batches set status='ready' where id=bid;
  return bid;
end $function$
;
CREATE OR REPLACE FUNCTION private.prepare_delivery_reminders(p_delivery_ids bigint[], p_channel text, p_request_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare bid uuid; sid bigint; r record; ctx jsonb; body text; template_body text; template_subject text; subject_text text; context_text text; last_sent text; report_date text; greeting text; ch text; ids bigint[];
begin
 if auth.uid() is null or not coalesce(private.is_manager(),false) or not exists(select 1 from public.profiles where id=auth.uid() and active) then raise exception 'فقط مدیر فعال مجاز است'; end if;
 if p_channel not in ('portal','email','both') or p_channel is null or p_request_id is null then raise exception 'کانال یا شناسه درخواست نامعتبر است'; end if;
 select array_agg(distinct id order by id) into ids from unnest(p_delivery_ids) id;
 if coalesce(cardinality(ids),0)=0 or cardinality(ids)>200 then raise exception 'بین ۱ تا ۲۰۰ پیام انتخاب کنید'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_request_id::text,0));
 select id into bid from public.message_batches where batch_key=p_request_id and created_by=auth.uid() and kind='reminder';
 if bid is not null then
  if ids is distinct from (select array_agg(delivery_id order by delivery_id) from public.message_reminder_sources where batch_id=bid)
   or exists(select 1 from public.message_deliveries where batch_id=bid and channel<>p_channel and p_channel<>'both')
   or (p_channel='both' and (select count(distinct channel) from public.message_deliveries where batch_id=bid)<>2)
  then raise exception 'شناسه درخواست با انتخاب قبلی یکسان نیست'; end if;
  return bid;
 end if;
 perform id from public.message_deliveries where id=any(ids) order by id for update;
 if (select count(*) from public.message_response_tracking t join public.profiles p on p.id=t.recipient_id and p.active
     where t.delivery_id=any(ids) and t.response_status<>'replied' and t.replied_at is null and t.delivery_status<>'cancelled')<>cardinality(ids)
 then raise exception 'بعضی پیام‌ها پاسخ داده شده، لغو شده یا گیرنده نامعتبر دارند؛ جدول را تازه‌سازی کنید'; end if;
 if p_channel in ('email','both') then
  select p.full_name into body from public.profiles p join public.message_deliveries d on d.recipient_id=p.id
   where d.id=any(ids) and nullif(btrim(p.email),'') is null limit 1;
  if found then raise exception 'برای % ایمیل ثبت نشده است؛ داخل سامانه را انتخاب کنید',body; end if;
 end if;
 if exists(select 1 from public.message_reminder_sources m join public.message_batches b on b.id=m.batch_id
    where m.delivery_id=any(ids) and (b.created_at>now()-interval '1 minute' or exists(
     select 1 from public.message_deliveries rd where rd.snapshot_id=m.snapshot_id and rd.status in ('queued','processing'))))
 then raise exception 'یادآوری این پیام به‌تازگی ساخته شده یا در حال ارسال است؛ وضعیت قبلی را بررسی کنید'; end if;
 select body_html,subject_template into template_body,template_subject from public.email_templates where template_key='followup';
 if nullif(btrim(template_body),'') is null then raise exception 'قالب یادآوری تعریف نشده است';end if;
 report_date:=private.message_persian_date((now() at time zone 'Asia/Tehran')::date);
 insert into public.message_batches(batch_key,kind,subject,created_by,status)
 values(p_request_id,'reminder',replace(template_subject,'[تاریخ کامل شمسی]',report_date),auth.uid(),'draft') returning id into bid;
 for r in select distinct p.id,p.full_name,p.display_name,p.email,p.salutation,p.gender from public.profiles p join public.message_deliveries d on d.recipient_id=p.id where d.id=any(ids) loop
  select jsonb_agg(jsonb_build_object('delivery_id',d.id,'snapshot_id',d.snapshot_id,'batch_id',d.batch_id,
    'recipient_id',d.recipient_id,'recipient_name',s.recipient_name,'original_subject',s.subject,'sent_at',d.sent_at,
    'response_status',t.response_status,'reminder_count',d.reminder_count,'thread_key',d.thread_key) order by d.id),
    string_agg(format(E'موضوع پیام اصلی: %s\nشناسه ارسال: %s\nتاریخ ارسال: %s\nشناسه پیگیری: %s',s.subject,d.id,private.message_persian_date((d.sent_at at time zone 'Asia/Tehran')::date),d.thread_key),E'\n\n' order by d.id)
  into ctx,body from public.message_deliveries d join public.message_snapshots s on s.id=d.snapshot_id join public.message_response_tracking t on t.delivery_id=d.id where d.id=any(ids) and d.recipient_id=r.id;
  context_text:=body;
  select private.message_persian_date(max(d.sent_at at time zone 'Asia/Tehran')::date) into last_sent from public.message_deliveries d where d.id=any(ids) and d.recipient_id=r.id;
  greeting:=private.message_salutation(r.salutation,coalesce(nullif(r.display_name,''),r.full_name,r.email),r.gender);
  body:=replace(replace(replace(template_body,'[عنوان و نام مخاطب]',greeting),'[تاریخ آخرین ارسال]',last_sent),'[تاریخ کامل شمسی]',report_date);
  if p_channel='portal' then body:=replace(body,'همین ایمیل','همین پیام');end if;
  body:=body||E'\n\nپیام‌های اصلی مرتبط با این یادآوری:\n\n'||context_text;
  subject_text:=replace(replace(template_subject,'[عنوان و نام مخاطب]',greeting),'[تاریخ کامل شمسی]',report_date);
  insert into public.message_snapshots(batch_id,recipient_id,recipient_name,recipient_email,sticker_state,template_key,subject,final_text,body_template,reminder_context)
   values(bid,r.id,coalesce(r.full_name,r.email),r.email,1,'followup',subject_text,body,body,ctx) returning id into sid;
  insert into public.message_reminder_sources(batch_id,delivery_id,snapshot_id,recipient_id)
   select bid,d.id,sid,r.id from public.message_deliveries d where d.id=any(ids) and d.recipient_id=r.id;
  foreach ch in array case when p_channel='both' then array['portal','email'] else array[p_channel] end loop
   insert into public.message_deliveries(batch_id,snapshot_id,recipient_id,channel,idempotency_key,thread_key)
    values(bid,sid,r.id,ch,bid||':'||r.id||':'||ch,'BAMCO-'||replace(bid::text,'-','')||'-'||replace(r.id::text,'-','')||'-'||ch);
  end loop;
 end loop;
 update public.message_batches set status='ready' where id=bid;
 return bid;
end $function$
;
CREATE OR REPLACE FUNCTION private.portal_recipient_to_system_chat()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  p public.portal_messages%rowtype;
  tid uuid;
  v_kind text;
  v_sender_name text;
  v_cleared_at timestamptz;
begin
  select * into p from public.portal_messages where id=new.message_id;
  if not found then return new; end if;

  perform pg_advisory_xact_lock(hashtextextended('system-chat:'||new.recipient_id::text,0));
  select cleared_at into v_cleared_at
  from private.system_chat_resets
  where user_id=new.recipient_id;

  if v_cleared_at is not null and p.created_at <= v_cleared_at then
    return new;
  end if;

  v_sender_name:=coalesce(
    nullif(p.sender_name_snapshot,''),
    (select coalesce(nullif(display_name,''),nullif(full_name,''),email::text)
       from public.profiles where id=p.sender_id),
    'سامانه'
  );
  v_kind:=coalesce(nullif(p.template_key,''),'system');

  insert into public.chat_threads(thread_type,title,direct_key,system_recipient_id,created_by,is_active,updated_at)
  values('direct','پیام‌های خودکار سامانه','system:'||new.recipient_id::text,new.recipient_id,p.sender_id,true,now())
  on conflict(system_recipient_id) where system_recipient_id is not null
  do update set
    is_active=true,
    direct_key='system:'||excluded.system_recipient_id::text,
    title='پیام‌های خودکار سامانه',
    updated_at=greatest(public.chat_threads.updated_at,now())
  returning id into tid;

  insert into public.chat_members(thread_id,user_id)
  select tid,id from public.profiles
  where active and (id=new.recipient_id or role='manager')
  on conflict do nothing;

  insert into public.chat_messages(
    thread_id,sender_id,body,is_system,message_kind,
    source_portal_message_id,sender_name_snapshot,created_at
  )
  values(
    tid,p.sender_id,'BAMCO_PORTAL_MESSAGE_V1:'||p.id::text,true,v_kind,
    p.id,v_sender_name,p.created_at
  )
  on conflict(source_portal_message_id,thread_id)
  where source_portal_message_id is not null do nothing;

  update public.message_deliveries
  set chat_thread_id=tid
  where portal_message_id=p.id and recipient_id=new.recipient_id;

  return new;
end
$function$
;
CREATE OR REPLACE FUNCTION public.chat_clear_system_thread(p_thread_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := auth.uid();
  v_count integer := 0;
begin
  if v_uid is null or not exists(select 1 from public.profiles where id=v_uid and active) then
    raise exception 'نشست کاربری معتبر نیست';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('system-chat:'||v_uid::text,0));
  if not exists(
    select 1 from public.chat_threads t
    where t.id=p_thread_id and t.system_recipient_id=v_uid
  ) then
    raise exception 'فقط زنجیره خودکار مربوط به حساب خودتان قابل پاک کردن است';
  end if;

  select count(*) into v_count
  from public.chat_messages
  where thread_id=p_thread_id;

  insert into private.system_chat_resets(user_id,cleared_at)
  values(v_uid,clock_timestamp())
  on conflict(user_id) do update
  set cleared_at=excluded.cleared_at;

  -- Deleting the chat sets delivery.chat_thread_id to null. Dismiss its originals
  -- first so the inbox does not misclassify them as unlinked legacy messages.
  update public.portal_message_recipients r
  set dismissed_at=clock_timestamp(),read_at=coalesce(r.read_at,clock_timestamp())
  where r.recipient_id=v_uid and r.message_id in
    (select source_portal_message_id from public.chat_messages where thread_id=p_thread_id and source_portal_message_id is not null);

  delete from public.notifications
  where user_id=v_uid
    and entity_type='chat_thread'
    and entity_id=p_thread_id::text;

  delete from public.chat_threads
  where id=p_thread_id and system_recipient_id=v_uid;

  return v_count;
end
$function$
;
-- Repair originals from chains already cleared before this fix.
update public.portal_message_recipients r
set dismissed_at=x.cleared_at,read_at=coalesce(r.read_at,x.cleared_at)
from public.portal_messages p,private.system_chat_resets x
where r.message_id=p.id and r.recipient_id=x.user_id
 and p.created_at<=x.cleared_at and r.dismissed_at is null;
notify pgrst,'reload schema';
