-- New system cards link to portal_messages; legacy cards link to deliveries.
-- Resolve either representation, always within the replying recipient/thread.
create or replace function private.chat_reply_delivery()
returns trigger language plpgsql security definer set search_path = '' as $$
declare d public.message_deliveries%rowtype;
begin
 if new.is_system or new.reply_to is null then return new; end if;
 select md.* into d
 from public.chat_messages parent
 join public.message_deliveries md on
   (md.id=parent.source_delivery_id or md.portal_message_id=parent.source_portal_message_id)
 where parent.id=new.reply_to and parent.thread_id=new.thread_id
   and parent.is_system and md.recipient_id=new.sender_id and md.channel='portal'
 order by (md.id=parent.source_delivery_id) desc nulls last,md.id
 limit 1;
 if found then
  update public.portal_message_recipients
  set reply_text=new.body,replied_at=now(),read_at=coalesce(read_at,now())
  where message_id=d.portal_message_id and recipient_id=new.sender_id;
  update public.message_deliveries
  set reply_text=new.body,replied_at=now(),reply_channel='portal'
  where id=d.id;
 end if;
 return new;
end $$;
revoke all on function private.chat_reply_delivery() from public,anon,authenticated;
