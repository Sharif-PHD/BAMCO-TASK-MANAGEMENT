-- Delivery identity and immutable context survive prepare, queue and delivery.
alter table public.message_snapshots add column if not exists reminder_context jsonb;
create table public.message_reminder_sources (
 batch_id uuid not null references public.message_batches(id),
 delivery_id bigint not null references public.message_deliveries(id),
 snapshot_id bigint not null references public.message_snapshots(id),
 recipient_id uuid not null references public.profiles(id),
 counted_at timestamptz,
 primary key(batch_id,delivery_id)
);
create index on public.message_reminder_sources(delivery_id);
alter table public.message_reminder_sources enable row level security;
create policy reminder_sources_read on public.message_reminder_sources for select to authenticated
 using ((select private.is_manager()) or recipient_id=(select auth.uid()));
revoke all on public.message_reminder_sources from public,anon,authenticated;
grant select on public.message_reminder_sources to authenticated;

create function private.prepare_delivery_reminders(p_delivery_ids bigint[],p_channel text,p_request_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare bid uuid; sid bigint; r record; ctx jsonb; body text; ch text; ids bigint[];
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
 insert into public.message_batches(batch_key,kind,subject,created_by,status)
 values(p_request_id,'reminder','یادآوری پاسخ به پیام',auth.uid(),'draft') returning id into bid;
 for r in select distinct p.id,p.full_name,p.display_name,p.email from public.profiles p join public.message_deliveries d on d.recipient_id=p.id where d.id=any(ids) loop
  select jsonb_agg(jsonb_build_object('delivery_id',d.id,'snapshot_id',d.snapshot_id,'batch_id',d.batch_id,
    'recipient_id',d.recipient_id,'recipient_name',s.recipient_name,'original_subject',s.subject,'sent_at',d.sent_at,
    'response_status',t.response_status,'reminder_count',d.reminder_count,'thread_key',d.thread_key) order by d.id),
    string_agg(format(E'موضوع پیام اصلی: %s\nشناسه ارسال: %s\nتاریخ ارسال: %s\nشناسه پیگیری: %s',s.subject,d.id,coalesce(to_char(d.sent_at at time zone 'Asia/Tehran','YYYY-MM-DD HH24:MI'),'ثبت نشده'),d.thread_key),E'\n\n' order by d.id)
  into ctx,body from public.message_deliveries d join public.message_snapshots s on s.id=d.snapshot_id join public.message_response_tracking t on t.delivery_id=d.id where d.id=any(ids) and d.recipient_id=r.id;
  body:=format(E'%s گرامی،\n\nیادآوری پاسخ به پیام‌های زیر:\n\n%s\n\nهنوز پاسخی برای این ارسال‌ها ثبت نشده است. لطفاً پاسخ یا نتیجه پیگیری را با ذکر شناسه پیام اصلی ثبت فرمایید.',coalesce(nullif(r.display_name,''),r.full_name,r.email),body);
  insert into public.message_snapshots(batch_id,recipient_id,recipient_name,recipient_email,sticker_state,template_key,subject,final_text,body_template,reminder_context)
   values(bid,r.id,coalesce(r.full_name,r.email),r.email,1,'delivery_reminder_v1','یادآوری پاسخ به پیام',body,body,ctx) returning id into sid;
  insert into public.message_reminder_sources(batch_id,delivery_id,snapshot_id,recipient_id)
   select bid,d.id,sid,r.id from public.message_deliveries d where d.id=any(ids) and d.recipient_id=r.id;
  foreach ch in array case when p_channel='both' then array['portal','email'] else array[p_channel] end loop
   insert into public.message_deliveries(batch_id,snapshot_id,recipient_id,channel,idempotency_key,thread_key)
    values(bid,sid,r.id,ch,bid||':'||r.id||':'||ch,'BAMCO-'||replace(bid::text,'-','')||'-'||replace(r.id::text,'-','')||'-'||ch);
  end loop;
 end loop;
 update public.message_batches set status='ready' where id=bid;
 return bid;
end $$;
revoke all on function private.prepare_delivery_reminders(bigint[],text,uuid) from public,anon;
grant execute on function private.prepare_delivery_reminders(bigint[],text,uuid) to authenticated;
create function public.prepare_message_reminders(p_delivery_ids bigint[],p_channel text,p_request_id uuid)
returns uuid language sql security invoker set search_path='' as $$ select private.prepare_delivery_reminders(p_delivery_ids,p_channel,p_request_id) $$;
revoke all on function public.prepare_message_reminders(bigint[],text,uuid) from public,anon;
grant execute on function public.prepare_message_reminders(bigint[],text,uuid) to authenticated;

create function private.finish_delivery_reminders(p_delivery_ids bigint[]) returns integer
language plpgsql security definer set search_path='' as $$
declare m record; n int:=0;
begin
 for m in select * from public.message_reminder_sources where delivery_id=any(p_delivery_ids) and counted_at is null order by delivery_id,batch_id for update loop
  if exists(select 1 from public.message_deliveries where snapshot_id=m.snapshot_id)
   and not exists(select 1 from public.message_deliveries where snapshot_id=m.snapshot_id and status not in ('sent','delivered')) then
   update public.message_deliveries set reminder_count=reminder_count+1,last_reminded_at=now() where id=m.delivery_id;
   update public.message_reminder_sources set counted_at=now() where batch_id=m.batch_id and delivery_id=m.delivery_id;
   n:=n+1;
  end if;
 end loop;
 return n;
end $$;
revoke all on function private.finish_delivery_reminders(bigint[]) from public,anon,authenticated;
create or replace function public.mark_message_reminders(p_delivery_ids bigint[]) returns integer
language plpgsql security invoker set search_path='' as $$
begin
 if auth.uid() is null or not coalesce(private.is_manager(),false) then raise exception 'فقط مدیر مجاز است'; end if;
 -- Compatibility: completion is persisted by the delivery trigger, never by the browser.
 return (select count(*)::int from public.message_reminder_sources where delivery_id=any(p_delivery_ids) and counted_at is not null);
end $$;
create function private.reminder_delivery_completed() returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform private.finish_delivery_reminders(array(select delivery_id from public.message_reminder_sources where snapshot_id=new.snapshot_id));
 return new;
end $$;
revoke all on function private.reminder_delivery_completed() from public,anon,authenticated;
create trigger reminder_delivery_completed after update of status on public.message_deliveries
for each row when (new.status in ('sent','delivered') and old.status is distinct from new.status) execute function private.reminder_delivery_completed();

create function private.guard_reminder_delivery() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.message_reminder_sources m join public.message_response_tracking t on t.delivery_id=m.delivery_id
   where m.snapshot_id=new.snapshot_id and (t.replied_at is not null or t.response_status='replied' or t.delivery_status='cancelled')) then
  raise exception 'پیام اصلی پاسخ داده شده یا لغو شده است؛ یادآوری ارسال نشد';
 end if;
 return new;
end $$;
revoke all on function private.guard_reminder_delivery() from public,anon,authenticated;
create trigger guard_reminder_delivery before update of status on public.message_deliveries for each row
 when ((new.status in ('queued','processing') or (new.status='sent' and new.channel='portal')) and old.status is distinct from new.status)
 execute function private.guard_reminder_delivery();
