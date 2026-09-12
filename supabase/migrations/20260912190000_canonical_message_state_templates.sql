-- Never compare localized display labels with machine status keys.
create or replace view public.message_task_state with (security_invoker=true) as
select t.*, case
 when t.status_kind='waiting' then 'none'
 when t.due_state in ('warning','دوره هشدار') then 'warning'
 when t.due_state in ('overdue','دیرکرد') then 'overdue'
 else 'none' end as message_due_state
from public.task_status_view t;
grant select on public.message_task_state to authenticated;

create or replace view public.message_recipient_live_state with (security_invoker=true) as
select p.id as recipient_id,p.full_name as recipient_name,p.email,p.cc_emails,p.default_message_channel,
 count(t.id) as active_count,
 count(t.id) filter(where t.message_due_state='warning') as warning_count,
 count(t.id) filter(where t.message_due_state='overdue') as overdue_count,
 (case when count(t.id) filter(where t.message_due_state='overdue')>=5 then 5
 when count(t.id) filter(where t.message_due_state='overdue')>=3 then 4
 when count(t.id) filter(where t.message_due_state='overdue')>=1 then 3
 when count(t.id) filter(where t.message_due_state='warning')>=1 then 2 else 1 end)::smallint as sticker_state,
 (select max(d.sent_at) from public.message_deliveries d where d.recipient_id=p.id and d.status in ('sent','delivered')) as last_sent_at
from public.profiles p left join public.message_task_state t
 on t.owner_id=p.id and not t.archived and t.status_kind not in ('registered','completed','cancelled')
where p.active group by p.id,p.full_name,p.email,p.cc_emails,p.default_message_channel;

create or replace function public.prepare_workflow_messages(
  p_recipient_ids uuid[],
  p_channels jsonb,
  p_subject text,
  p_template_text text default null,
  p_kind text default 'daily',
  p_report_date text default null
)
returns uuid
language plpgsql
security definer
set search_path=''
as $$
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
end $$;

revoke all on function public.prepare_workflow_messages(uuid[],jsonb,text,text,text,text) from public,anon;
grant execute on function public.prepare_workflow_messages(uuid[],jsonb,text,text,text,text) to authenticated;
