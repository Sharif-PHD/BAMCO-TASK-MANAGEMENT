alter table public.profiles alter column email drop not null;

alter table public.profiles
  drop constraint if exists profiles_default_message_channel_check;

alter table public.profiles
  add constraint profiles_default_message_channel_check
  check (default_message_channel = any (array['none'::text, 'portal'::text, 'email'::text, 'both'::text]));

alter table public.profiles
  add column if not exists messaging_enabled boolean not null default true;

update public.profiles
set messaging_enabled = false,
    default_message_channel = 'none'
where email is null or btrim(email::text) = '';

create or replace function public.chat_directory_v2()
returns table(id uuid, full_name text, display_name text, role text, avatar_path text)
language sql stable security definer set search_path=''
as $$
 select p.id,p.full_name,p.display_name,p.role,p.avatar_path
 from public.profiles p
 where p.active and p.messaging_enabled and auth.uid() is not null
   and exists(select 1 from public.profiles me where me.id=auth.uid() and me.active)
 order by coalesce(p.display_name,p.full_name),p.full_name
$$;

revoke all on function public.chat_directory_v2() from public, anon;
grant execute on function public.chat_directory_v2() to authenticated;

create or replace function public.bamco_prepare_message_batch_v2(p_recipient_ids uuid[], p_channels jsonb, p_subject text, p_template_text text, p_kind text default 'daily')
returns uuid language plpgsql security definer set search_path=''
as $$
declare bid uuid; rid uuid; p public.profiles%rowtype; active_n int; warning_n int; overdue_n int;
 sticker smallint; template_key text; selected_template text; final_text text; snap_id bigint; ch text; task_json jsonb;
 task_ids bigint[]; warning_ids bigint[]; overdue_ids bigint[];
begin
 if not (select private.is_manager()) then raise exception 'فقط مدیر مجاز به آماده‌سازی پیام است'; end if;
 if coalesce(array_length(p_recipient_ids,1),0)=0 then raise exception 'گیرنده انتخاب نشده است'; end if;
 if nullif(btrim(p_subject),'') is null then raise exception 'موضوع پیام الزامی است'; end if;
 insert into public.message_batches(kind,subject,created_by,status) values(p_kind,p_subject,auth.uid(),'draft') returning id into bid;
 foreach rid in array p_recipient_ids loop
  select * into p from public.profiles where id=rid and active and messaging_enabled;if not found then continue;end if;
  select count(*),count(*) filter(where due_state='warning'),count(*) filter(where due_state='overdue'),
   coalesce(array_agg(id order by id),'{}'),coalesce(array_agg(id order by id) filter(where due_state='warning'),'{}'),coalesce(array_agg(id order by id) filter(where due_state='overdue'),'{}'),
   coalesce(jsonb_agg(jsonb_build_object('id',id,'legacy_id',legacy_id,'title',title,'status',status,'priority',priority,'due_date',due_date,'due_state',due_state) order by id),'[]')
  into active_n,warning_n,overdue_n,task_ids,warning_ids,overdue_ids,task_json
  from (select t.*,case when t.status='منتظر پاسخ' then 'none' when t.due_date<current_date then 'overdue' when t.due_date<=current_date+greatest(coalesce(t.reminder_days,0),0) then 'warning' else 'none' end due_state from public.tasks t where t.owner_id=rid and not t.archived) x;
  sticker:=case when overdue_n>=5 then 5 when overdue_n>=3 then 4 when overdue_n>=1 then 3 when warning_n>=1 then 2 else 1 end;template_key:='state'||sticker;
  select mt.body_text into selected_template from public.message_templates mt where mt.template_key=template_key limit 1;
  final_text:=replace(replace(replace(replace(coalesce(nullif(p_template_text,''),selected_template,''),'[نام]',coalesce(p.full_name,p.email::text)),'[تعداد کار فعال]',active_n::text),'[تعداد هشدار]',warning_n::text),'[تعداد دیرکرد]',overdue_n::text);
  insert into public.message_snapshots(batch_id,recipient_id,recipient_name,recipient_email,cc_emails,active_count,warning_count,overdue_count,sticker_state,template_key,subject,final_text,task_ids,warning_task_ids,overdue_task_ids,tasks)
  values(bid,rid,coalesce(p.full_name,p.email::text),p.email,p.cc_emails,active_n,warning_n,overdue_n,sticker,template_key,p_subject,final_text,task_ids,warning_ids,overdue_ids,task_json) returning id into snap_id;
  ch:=coalesce(p_channels->>rid::text,p.default_message_channel,'none');
  if ch in ('portal','both') then insert into public.message_deliveries(batch_id,snapshot_id,recipient_id,channel,idempotency_key,thread_key) values(bid,snap_id,rid,'portal',bid||':'||rid||':portal','BAMCO-'||replace(bid::text,'-','')||'-'||left(replace(rid::text,'-',''),8));end if;
  if ch in ('email','both') and p.email is not null then insert into public.message_deliveries(batch_id,snapshot_id,recipient_id,channel,idempotency_key,thread_key) values(bid,snap_id,rid,'email',bid||':'||rid||':email','BAMCO-'||replace(bid::text,'-','')||'-'||left(replace(rid::text,'-',''),8)||'-E');end if;
 end loop;
 update public.message_batches set status='ready' where id=bid;return bid;
end $$;

revoke all on function public.bamco_prepare_message_batch_v2(uuid[],jsonb,text,text,text) from public, anon;
grant execute on function public.bamco_prepare_message_batch_v2(uuid[],jsonb,text,text,text) to authenticated;
