alter table public.message_deliveries
  add column if not exists replied_at timestamptz,
  add column if not exists reply_channel text,
  add column if not exists reply_text text,
  add column if not exists reminder_count integer not null default 0,
  add column if not exists last_reminded_at timestamptz;

alter table public.message_deliveries
  drop constraint if exists message_deliveries_reply_channel_check;
alter table public.message_deliveries
  add constraint message_deliveries_reply_channel_check
  check (reply_channel is null or reply_channel in ('portal','email','manual'));

create index if not exists message_deliveries_response_idx
  on public.message_deliveries (replied_at, sent_at desc);

drop policy if exists message_deliveries_manager_update on public.message_deliveries;
create policy message_deliveries_manager_update
  on public.message_deliveries for update
  to authenticated
  using ((select private.is_manager()))
  with check ((select private.is_manager()));

create or replace view public.message_response_tracking
with (security_invoker=true)
as
select d.id delivery_id,d.batch_id,d.recipient_id,s.recipient_name,s.recipient_email,
  d.channel,d.status delivery_status,s.subject,d.thread_key,d.sent_at,
  coalesce(d.replied_at,pmr.replied_at) replied_at,
  coalesce(d.reply_channel,case when pmr.replied_at is not null then 'portal' end) reply_channel,
  coalesce(d.reply_text,pmr.reply_text) reply_text,d.reminder_count,d.last_reminded_at,
  case when d.status='failed' then 'failed'
    when coalesce(d.replied_at,pmr.replied_at) is not null then 'replied'
    when d.sent_at is not null and d.sent_at < now()-interval '2 days' then 'reminder_needed'
    else 'awaiting' end response_status
from public.message_deliveries d
join public.message_snapshots s on s.id=d.snapshot_id
left join public.portal_message_recipients pmr
  on pmr.message_id=d.portal_message_id and pmr.recipient_id=d.recipient_id;

grant select on public.message_response_tracking to authenticated;

create or replace function public.mark_message_reminders(p_delivery_ids bigint[])
returns integer language plpgsql security invoker set search_path='' as $$
declare v_count integer;
begin
  update public.message_deliveries
  set reminder_count=reminder_count+1,last_reminded_at=now()
  where id=any(p_delivery_ids);
  get diagnostics v_count=row_count;
  return v_count;
end;$$;

revoke all on function public.mark_message_reminders(bigint[]) from public,anon;
grant execute on function public.mark_message_reminders(bigint[]) to authenticated;
