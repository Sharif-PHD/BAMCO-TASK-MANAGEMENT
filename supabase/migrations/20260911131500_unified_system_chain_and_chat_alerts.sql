create or replace function public.chat_conversation_list()
returns jsonb
language sql
stable security definer
set search_path to ''
as $function$
 select coalesce(jsonb_agg(x order by (x.system_recipient_id is not null) desc, x.updated_at desc),'[]'::jsonb) from (
 select t.id,t.thread_type,t.task_id,t.avatar_path,t.system_recipient_id,t.is_active,t.participant_deleted_at,
 case when t.system_recipient_id is not null then 'پیام‌های خودکار سامانه'
      when t.thread_type='direct' then coalesce(peer.full_name,t.deleted_participant_name,t.title) else t.title end title,
 peer.id person_id,t.updated_at,
 (select case when m.body like 'BAMCO_PORTAL_MESSAGE_V1:%' then coalesce((select pm.subject from public.portal_messages pm where pm.id=m.source_portal_message_id),'پیام سامانه') else left(m.body,160) end from public.chat_messages m where m.thread_id=t.id and m.deleted_at is null order by m.created_at desc limit 1) last_message,
 (select count(*) from public.notifications n where n.user_id=auth.uid() and n.entity_type='chat_thread' and n.entity_id=t.id::text and n.read_at is null and n.dismissed_at is null) unread_count
 from public.chat_threads t
 left join public.profiles sp on sp.id=t.system_recipient_id
 left join lateral(select p.id,p.full_name from public.chat_members cm join public.profiles p on p.id=cm.user_id where cm.thread_id=t.id and cm.user_id<>auth.uid() and p.id is distinct from t.system_recipient_id order by cm.joined_at limit 1) peer on true
 where auth.uid() is not null and private.has_account() and (t.is_active or t.participant_deleted_at is not null) and
 (t.thread_type='public' or exists(select 1 from public.chat_members cm where cm.thread_id=t.id and cm.user_id=auth.uid()))
 and (t.system_recipient_id is null or t.system_recipient_id=auth.uid())
 ) x;
$function$;

create or replace function private.notify_chat_message()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare t public.chat_threads%rowtype; kind text; preview text; v_subject text; v_portal_body text;
begin
 select * into t from public.chat_threads where id=new.thread_id;
 kind:=case when new.is_system then coalesce(new.message_kind,'system') when t.system_recipient_id is not null then 'system_reply' when t.task_id is not null then 'task_chat' when t.thread_type='public' then 'public_chat' when t.thread_type='group' then 'group_chat' else 'direct_chat' end;
 if new.body like 'BAMCO_PORTAL_MESSAGE_V1:%' then
   select subject,body into v_subject,v_portal_body from public.portal_messages where id=new.source_portal_message_id;
   preview:=left(coalesce(v_portal_body,v_subject,'پیام جدید سامانه'),220);
 else
   preview:=case when new.body like 'BAMCO_ATTACHMENT_V1:%' then 'فایل یا تصویر جدید' when new.body like 'BAMCO_STICKER_V1:%' then 'استیکر جدید' else left(new.body,220) end;
 end if;
 insert into public.notifications(user_id,notification_type,title,body,entity_type,entity_id)
 select p.id,kind,
   case when new.is_system then coalesce(v_subject,case when kind='reminder' then 'یادآور سامانه' when kind='daily' then 'گزارش وضعیت امور روزانه' else 'پیام سامانه' end) else t.title end,
   preview,'chat_thread',t.id::text
 from public.profiles p where p.active and (
   (new.is_system and p.id=t.system_recipient_id)
   or
   (not new.is_system and p.id is distinct from new.sender_id and (t.thread_type='public' or exists(select 1 from public.chat_members cm where cm.thread_id=t.id and cm.user_id=p.id)))
 );
 update public.chat_threads set updated_at=new.created_at where id=t.id;
 return new;
end $function$;

create or replace function public.chat_clear_system_thread(p_thread_id uuid)
returns integer
language plpgsql
security definer
set search_path to ''
as $function$
declare v_count integer;
begin
 if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and active) then raise exception 'نشست کاربری معتبر نیست'; end if;
 if not exists(select 1 from public.chat_threads t where t.id=p_thread_id and t.system_recipient_id=auth.uid()) then raise exception 'فقط زنجیره خودکار مربوط به حساب خودتان قابل پاک کردن است'; end if;
 delete from public.notifications where entity_type='chat_thread' and entity_id=p_thread_id::text;
 delete from public.chat_messages where thread_id=p_thread_id;
 get diagnostics v_count=row_count;
 update public.chat_threads set is_active=true,title='پیام‌های خودکار سامانه',direct_key='system:'||auth.uid()::text,updated_at=now() where id=p_thread_id;
 return v_count;
end $function$;

revoke all on function public.chat_clear_system_thread(uuid) from public,anon;
grant execute on function public.chat_clear_system_thread(uuid) to authenticated;
notify pgrst,'reload schema';