-- Manager-only soft deletion for response-report rows.

alter table public.message_deliveries drop constraint if exists message_deliveries_status_check;
alter table public.message_deliveries
  add constraint message_deliveries_status_check
  check (status = any (array['ready'::text,'queued'::text,'processing'::text,'sent'::text,'delivered'::text,'failed'::text,'cancelled'::text]));

create or replace function public.cancel_message_deliveries(p_ids bigint[])
returns integer
language plpgsql
security definer
set search_path to ''
as $function$
declare v_count integer;
begin
  if auth.uid() is null or not private.is_manager() then raise exception 'دسترسی مدیر لازم است'; end if;
  if p_ids is null or coalesce(array_length(p_ids,1),0)=0 then return 0; end if;
  update public.message_deliveries set status='cancelled' where id=any(p_ids) and status<>'cancelled';
  get diagnostics v_count = row_count;
  return v_count;
end;
$function$;

create or replace view public.message_response_tracking as
select d.id as delivery_id,
       d.batch_id,
       d.recipient_id,
       s.recipient_name,
       s.recipient_email,
       d.channel,
       d.status as delivery_status,
       s.subject,
       d.thread_key,
       d.sent_at,
       coalesce(d.replied_at,pmr.replied_at) as replied_at,
       coalesce(d.reply_channel,case when pmr.replied_at is not null then 'portal'::text else null::text end) as reply_channel,
       coalesce(d.reply_text,pmr.reply_text) as reply_text,
       d.reminder_count,
       d.last_reminded_at,
       case when d.status='failed' then 'failed'
            when coalesce(d.replied_at,pmr.replied_at) is not null then 'replied'
            when d.sent_at is not null and d.sent_at < now()-interval '2 days' then 'reminder_needed'
            else 'awaiting' end as response_status
from public.message_deliveries d
join public.message_snapshots s on s.id=d.snapshot_id
left join public.portal_message_recipients pmr on pmr.message_id=d.portal_message_id and pmr.recipient_id=d.recipient_id;
