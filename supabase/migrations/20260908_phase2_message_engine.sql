-- BAMCO phase 2: unified message engine, immutable snapshots and idempotent deliveries.
alter table public.profiles
  add column if not exists default_message_channel text not null default 'portal'
  check (default_message_channel in ('portal','email','both'));

create table if not exists public.message_batches(
 id uuid primary key default gen_random_uuid(),
 batch_key uuid not null default gen_random_uuid() unique,
 kind text not null default 'daily' check(kind in ('daily','reminder','manual')),
 subject text not null,
 template_key text,
 template_version integer not null default 1,
 status text not null default 'draft' check(status in ('draft','ready','queued','processing','sent','partial','failed','cancelled')),
 created_by uuid not null references public.profiles(id),
 created_at timestamptz not null default now(),
 queued_at timestamptz,
 completed_at timestamptz
);

create table if not exists public.message_snapshots(
 id bigint generated always as identity primary key,
 batch_id uuid not null references public.message_batches(id) on delete restrict,
 recipient_id uuid not null references public.profiles(id),
 recipient_name text not null,
 recipient_email text,
 cc_emails text[] not null default '{}',
 active_count integer not null default 0,
 warning_count integer not null default 0,
 overdue_count integer not null default 0,
 sticker_state smallint not null check(sticker_state between 1 and 5),
 template_key text not null,
 template_version integer not null default 1,
 subject text not null,
 final_text text not null,
 task_ids bigint[] not null default '{}',
 warning_task_ids bigint[] not null default '{}',
 overdue_task_ids bigint[] not null default '{}',
 tasks jsonb not null default '[]',
 created_at timestamptz not null default now(),
 unique(batch_id,recipient_id)
);

create table if not exists public.message_deliveries(
 id bigint generated always as identity primary key,
 batch_id uuid not null references public.message_batches(id) on delete restrict,
 snapshot_id bigint not null references public.message_snapshots(id) on delete restrict,
 recipient_id uuid not null references public.profiles(id),
 channel text not null check(channel in ('portal','email')),
 status text not null default 'ready' check(status in ('ready','queued','processing','sent','delivered','failed','cancelled')),
 idempotency_key text not null unique,
 provider_message_id text,
 thread_key text not null unique,
 attempt_count integer not null default 0,
 last_attempt_at timestamptz,
 sent_at timestamptz,
 delivered_at timestamptz,
 error_message text,
 portal_message_id bigint references public.portal_messages(id),
 created_at timestamptz not null default now(),
 unique(batch_id,recipient_id,channel)
);

create index if not exists message_batches_status_idx on public.message_batches(status,created_at);
create index if not exists message_batches_created_by_idx on public.message_batches(created_by);
create index if not exists message_snapshots_recipient_idx on public.message_snapshots(recipient_id,created_at desc);
create index if not exists message_deliveries_queue_idx on public.message_deliveries(status,channel,created_at);
create index if not exists message_deliveries_recipient_idx on public.message_deliveries(recipient_id,created_at desc);
create index if not exists message_deliveries_snapshot_idx on public.message_deliveries(snapshot_id);
create index if not exists message_deliveries_portal_message_idx on public.message_deliveries(portal_message_id) where portal_message_id is not null;

alter table public.message_batches enable row level security;
alter table public.message_snapshots enable row level security;
alter table public.message_deliveries enable row level security;

drop policy if exists message_batches_manager_read on public.message_batches;
create policy message_batches_manager_read on public.message_batches for select to authenticated
 using ((select private.is_manager()));
drop policy if exists message_snapshots_read on public.message_snapshots;
create policy message_snapshots_read on public.message_snapshots for select to authenticated
 using ((select private.is_manager()) or recipient_id=(select auth.uid()));
drop policy if exists message_deliveries_read on public.message_deliveries;
create policy message_deliveries_read on public.message_deliveries for select to authenticated
 using ((select private.is_manager()) or recipient_id=(select auth.uid()));

revoke all on public.message_batches,public.message_snapshots,public.message_deliveries from anon;
grant select on public.message_batches,public.message_snapshots,public.message_deliveries to authenticated;
revoke insert,update,delete on public.message_batches,public.message_snapshots,public.message_deliveries from authenticated;

create or replace view public.message_recipient_live_state with (security_invoker=true) as
select p.id recipient_id,p.full_name recipient_name,p.email,p.cc_emails,p.default_message_channel,
 count(t.id) filter(where not t.archived) active_count,
 count(t.id) filter(where not t.archived and norm_due.due_state='warning') warning_count,
 count(t.id) filter(where not t.archived and norm_due.due_state='overdue') overdue_count,
 case
  when count(t.id) filter(where not t.archived and norm_due.due_state='overdue')>=5 then 5
  when count(t.id) filter(where not t.archived and norm_due.due_state='overdue')>=3 then 4
  when count(t.id) filter(where not t.archived and norm_due.due_state='overdue')>=1 then 3
  when count(t.id) filter(where not t.archived and norm_due.due_state='warning')>=1 then 2 else 1 end::smallint sticker_state,
 (select max(d.created_at) from public.message_deliveries d where d.recipient_id=p.id and d.status in ('sent','delivered')) last_sent_at
from public.profiles p
left join public.tasks t on t.owner_id=p.id
left join lateral (select case when t.status='منتظر پاسخ' or t.archived then 'none'
 when t.due_date is not null and t.due_date<current_date then 'overdue'
 when t.due_date is not null and t.due_date<=current_date+greatest(coalesce(t.reminder_days,0),0) then 'warning'
 else 'none' end due_state) norm_due on true
where p.active and p.role='owner'
group by p.id,p.full_name,p.email,p.cc_emails,p.default_message_channel;
grant select on public.message_recipient_live_state to authenticated;

create or replace function public.prepare_message_batch(
 p_recipient_ids uuid[],p_channels jsonb,p_subject text,p_template_text text,p_kind text default 'daily'
) returns uuid language plpgsql security definer set search_path='' as $$
declare bid uuid; rid uuid; p public.profiles%rowtype; active_n int; warning_n int; overdue_n int;
 sticker smallint; template_key text; selected_template text; final_text text; snap_id bigint; ch text; task_json jsonb;
 task_ids bigint[]; warning_ids bigint[]; overdue_ids bigint[];
begin
 if not (select private.is_manager()) then raise exception 'فقط مدیر مجاز به آماده‌سازی پیام است'; end if;
 if coalesce(array_length(p_recipient_ids,1),0)=0 then raise exception 'گیرنده انتخاب نشده است'; end if;
 if nullif(btrim(p_subject),'') is null then raise exception 'موضوع پیام الزامی است'; end if;
 insert into public.message_batches(kind,subject,created_by,status) values(p_kind,p_subject,auth.uid(),'draft') returning id into bid;
 foreach rid in array p_recipient_ids loop
  select * into p from public.profiles where id=rid and active;
  if not found then continue; end if;
  select count(*),count(*) filter(where due_state='warning'),count(*) filter(where due_state='overdue'),
   coalesce(array_agg(id order by id),'{}'),coalesce(array_agg(id order by id) filter(where due_state='warning'),'{}'),
   coalesce(array_agg(id order by id) filter(where due_state='overdue'),'{}'),
   coalesce(jsonb_agg(jsonb_build_object('id',id,'legacy_id',legacy_id,'title',title,'status',status,'priority',priority,'due_date',due_date,'due_state',due_state) order by id),'[]')
  into active_n,warning_n,overdue_n,task_ids,warning_ids,overdue_ids,task_json
  from (select t.*,case when t.status='منتظر پاسخ' then 'none' when t.due_date<current_date then 'overdue'
        when t.due_date<=current_date+greatest(coalesce(t.reminder_days,0),0) then 'warning' else 'none' end due_state
        from public.tasks t where t.owner_id=rid and not t.archived) x;
  sticker:=case when overdue_n>=5 then 5 when overdue_n>=3 then 4 when overdue_n>=1 then 3 when warning_n>=1 then 2 else 1 end;
  template_key:='state'||sticker;
  select mt.body_text into selected_template from public.message_templates mt where mt.template_key=('state'||sticker) limit 1;
  final_text:=replace(replace(replace(replace(coalesce(selected_template,p_template_text,''),'[نام]',coalesce(p.full_name,p.email)),'[تعداد کار فعال]',active_n::text),'[تعداد هشدار]',warning_n::text),'[تعداد دیرکرد]',overdue_n::text);
  insert into public.message_snapshots(batch_id,recipient_id,recipient_name,recipient_email,cc_emails,active_count,warning_count,overdue_count,sticker_state,template_key,subject,final_text,task_ids,warning_task_ids,overdue_task_ids,tasks)
  values(bid,rid,coalesce(p.full_name,p.email),p.email,p.cc_emails,active_n,warning_n,overdue_n,sticker,template_key,p_subject,final_text,task_ids,warning_ids,overdue_ids,task_json) returning id into snap_id;
  ch:=coalesce(p_channels->>rid::text,p.default_message_channel,'portal');
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

create or replace function public.queue_message_batch(p_batch_id uuid) returns integer
language plpgsql security definer set search_path='' as $$
declare d public.message_deliveries%rowtype; s public.message_snapshots%rowtype; mid bigint; n int:=0;
begin
 if not (select private.is_manager()) then raise exception 'فقط مدیر مجاز به ارسال پیام است'; end if;
 for d in select * from public.message_deliveries where batch_id=p_batch_id and status='ready' for update loop
  select * into s from public.message_snapshots where id=d.snapshot_id;
  if d.channel='portal' then
   insert into public.portal_messages(sender_id,subject,body,importance,allow_reply,require_ack,template_key)
   values(auth.uid(),s.subject,s.final_text,'normal',true,true,s.template_key) returning id into mid;
   insert into public.portal_message_recipients(message_id,recipient_id,sticker_state)
   values(mid,d.recipient_id,'state'||s.sticker_state) on conflict do nothing;
   update public.message_deliveries set status='sent',portal_message_id=mid,attempt_count=1,last_attempt_at=now(),sent_at=now() where id=d.id;
  else
   update public.message_deliveries set status='queued' where id=d.id;
  end if;
  n:=n+1;
 end loop;
 update public.message_batches set status=case when exists(select 1 from public.message_deliveries where batch_id=p_batch_id and status='queued') then 'queued' else 'sent' end,queued_at=now(),completed_at=case when not exists(select 1 from public.message_deliveries where batch_id=p_batch_id and status in ('ready','queued','processing')) then now() end where id=p_batch_id;
 return n;
end $$;

revoke all on function public.prepare_message_batch(uuid[],jsonb,text,text,text) from public,anon;
revoke all on function public.queue_message_batch(uuid) from public,anon;
grant execute on function public.prepare_message_batch(uuid[],jsonb,text,text,text) to authenticated;
grant execute on function public.queue_message_batch(uuid) to authenticated;
