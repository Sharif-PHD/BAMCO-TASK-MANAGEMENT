-- Final inbox behavior: one portal message per task/request event, no duplicate notifications,
-- and no non-dismissible automatic-system chat thread.

create or replace function private.create_portal_event(p_user uuid,p_title text,p_body text,p_type text,p_entity_type text,p_entity_id text)
returns void language plpgsql security definer set search_path to '' as $function$
declare mid bigint;
begin
  if p_user is null or not exists(select 1 from public.profiles where id=p_user and active) then return; end if;
  insert into public.portal_messages(sender_id,subject,body,importance,allow_reply,require_ack,template_key,sender_name_snapshot)
  values(null,left(coalesce(p_title,'پیام سامانه'),240),coalesce(p_body,''),'normal',false,false,'system_event','سامانه') returning id into mid;
  insert into public.portal_message_recipients(message_id,recipient_id) values(mid,p_user) on conflict do nothing;
end;
$function$;

drop trigger if exists delivery_system_conversation on public.message_deliveries;
update public.chat_threads set is_active=false,direct_key=null,updated_at=now() where system_recipient_id is not null and is_active;
update public.message_deliveries set chat_thread_id=null where chat_thread_id in (select id from public.chat_threads where system_recipient_id is not null);

create or replace function public.chat_conversation_list()
returns jsonb language sql stable security definer set search_path to '' as $function$
 select coalesce(jsonb_agg(x order by x.updated_at desc),'[]'::jsonb) from (
 select t.id,t.thread_type,t.task_id,t.avatar_path,t.system_recipient_id,t.is_active,t.participant_deleted_at,
 case when t.thread_type='direct' then coalesce(peer.full_name,t.deleted_participant_name,t.title) else t.title end title,
 peer.id person_id,t.updated_at,
 (select left(m.body,160) from public.chat_messages m where m.thread_id=t.id and m.deleted_at is null order by m.created_at desc limit 1) last_message,
 (select count(*) from public.notifications n where n.user_id=auth.uid() and n.entity_type='chat_thread' and n.entity_id=t.id::text and n.read_at is null) unread_count
 from public.chat_threads t
 left join lateral(select p.id,p.full_name from public.chat_members cm join public.profiles p on p.id=cm.user_id where cm.thread_id=t.id and cm.user_id<>auth.uid() order by cm.joined_at limit 1) peer on true
 where auth.uid() is not null and private.has_account() and t.system_recipient_id is null and (t.is_active or t.participant_deleted_at is not null) and
 (t.thread_type='public' or exists(select 1 from public.chat_members cm where cm.thread_id=t.id and cm.user_id=auth.uid()))
 ) x;
$function$;
