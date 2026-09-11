create or replace function public.chat_conversation_list()
returns jsonb
language sql
stable security definer
set search_path=''
as $$
 select coalesce(jsonb_agg(x order by x.updated_at desc),'[]'::jsonb) from (
 select t.id,t.thread_type,t.task_id,t.avatar_path,t.system_recipient_id,t.is_active,t.participant_deleted_at,
 case when t.system_recipient_id is not null then 'پیام‌های خودکار سامانه'||case when t.system_recipient_id<>auth.uid() then ' · '||coalesce(sp.display_name,sp.full_name,'کاربر') else '' end
      when t.thread_type='direct' then coalesce(peer.full_name,t.deleted_participant_name,t.title) else t.title end title,
 peer.id person_id,t.updated_at,
 (select case when m.body like 'BAMCO_PORTAL_MESSAGE_V1:%' then coalesce((select pm.subject from public.portal_messages pm where pm.id=m.source_portal_message_id),'پیام سامانه') else left(m.body,160) end from public.chat_messages m where m.thread_id=t.id and m.deleted_at is null order by m.created_at desc limit 1) last_message,
 (select count(*) from public.notifications n where n.user_id=auth.uid() and n.entity_type='chat_thread' and n.entity_id=t.id::text and n.read_at is null) unread_count
 from public.chat_threads t
 left join public.profiles sp on sp.id=t.system_recipient_id
 left join lateral(select p.id,p.full_name from public.chat_members cm join public.profiles p on p.id=cm.user_id where cm.thread_id=t.id and cm.user_id<>auth.uid() and p.id is distinct from t.system_recipient_id order by cm.joined_at limit 1) peer on true
 where auth.uid() is not null and private.has_account() and (t.is_active or t.participant_deleted_at is not null) and
 (t.thread_type='public' or exists(select 1 from public.chat_members cm where cm.thread_id=t.id and cm.user_id=auth.uid()))
 ) x;
$$;

update public.notifications n
set read_at=coalesce(n.read_at,now())
where n.read_at is null and n.entity_type='chat_thread'
  and exists(select 1 from public.chat_threads t where t.id::text=n.entity_id and t.system_recipient_id is not null);
