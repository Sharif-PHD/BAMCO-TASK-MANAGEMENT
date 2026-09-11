drop index if exists public.chat_messages_source_portal_unique;
create unique index if not exists chat_messages_source_portal_thread_unique on public.chat_messages(source_portal_message_id,thread_id) where source_portal_message_id is not null;

create or replace function private.portal_recipient_to_system_chat()
returns trigger language plpgsql security definer set search_path='' as $$
declare p public.portal_messages%rowtype; tid uuid; v_kind text; v_sender_name text;
begin
  select * into p from public.portal_messages where id=new.message_id;if not found then return new;end if;
  v_sender_name:=coalesce(nullif(p.sender_name_snapshot,''),(select coalesce(nullif(display_name,''),nullif(full_name,''),email::text) from public.profiles where id=p.sender_id),'سامانه');v_kind:=coalesce(nullif(p.template_key,''),'system');
  insert into public.chat_threads(thread_type,title,direct_key,system_recipient_id,created_by,is_active,updated_at)
  values('direct','پیام‌های خودکار سامانه','system:'||new.recipient_id::text,new.recipient_id,p.sender_id,true,now())
  on conflict(system_recipient_id) where system_recipient_id is not null do update set is_active=true,direct_key='system:'||excluded.system_recipient_id::text,title='پیام‌های خودکار سامانه',updated_at=greatest(public.chat_threads.updated_at,now()) returning id into tid;
  insert into public.chat_members(thread_id,user_id) select tid,id from public.profiles where active and (id=new.recipient_id or role='manager') on conflict do nothing;
  insert into public.chat_messages(thread_id,sender_id,body,is_system,message_kind,source_portal_message_id,sender_name_snapshot,created_at)
  values(tid,p.sender_id,'BAMCO_PORTAL_MESSAGE_V1:'||p.id::text,true,v_kind,p.id,v_sender_name,p.created_at)
  on conflict(source_portal_message_id,thread_id) where source_portal_message_id is not null do nothing;
  update public.message_deliveries set chat_thread_id=tid where portal_message_id=p.id and recipient_id=new.recipient_id;return new;
end;$$;

with mapped as (
 select cm.id as chat_message_id,d.portal_message_id from public.chat_messages cm join public.message_deliveries d on d.id=cm.source_delivery_id where cm.is_system and d.portal_message_id is not null and cm.source_portal_message_id is null
), safe as (
 select m.* from mapped m where not exists(select 1 from public.chat_messages x where x.source_portal_message_id=m.portal_message_id and x.thread_id=(select thread_id from public.chat_messages where id=m.chat_message_id))
)
update public.chat_messages cm set source_portal_message_id=s.portal_message_id,body='BAMCO_PORTAL_MESSAGE_V1:'||s.portal_message_id::text from safe s where cm.id=s.chat_message_id;

insert into public.chat_threads(thread_type,title,direct_key,system_recipient_id,created_by,is_active,updated_at)
select 'direct','پیام‌های خودکار سامانه','system:'||r.recipient_id::text,r.recipient_id,null,true,max(pm.created_at)
from public.portal_message_recipients r join public.portal_messages pm on pm.id=r.message_id join public.profiles pr on pr.id=r.recipient_id and pr.active group by r.recipient_id
on conflict(system_recipient_id) where system_recipient_id is not null do update set is_active=true,title='پیام‌های خودکار سامانه',direct_key='system:'||excluded.system_recipient_id::text,updated_at=greatest(public.chat_threads.updated_at,excluded.updated_at);

insert into public.chat_members(thread_id,user_id)
select distinct t.id,p.id from public.chat_threads t join public.profiles p on p.active and (p.id=t.system_recipient_id or p.role='manager') where t.system_recipient_id is not null on conflict do nothing;

insert into public.chat_messages(thread_id,sender_id,body,is_system,message_kind,source_portal_message_id,sender_name_snapshot,created_at)
select t.id,pm.sender_id,'BAMCO_PORTAL_MESSAGE_V1:'||pm.id::text,true,coalesce(nullif(pm.template_key,''),'system'),pm.id,coalesce(nullif(pm.sender_name_snapshot,''),nullif(ps.display_name,''),nullif(ps.full_name,''),ps.email::text,'سامانه'),pm.created_at
from public.portal_message_recipients r join public.portal_messages pm on pm.id=r.message_id join public.chat_threads t on t.system_recipient_id=r.recipient_id left join public.profiles ps on ps.id=pm.sender_id
where not exists(select 1 from public.chat_messages cm where cm.source_portal_message_id=pm.id and cm.thread_id=t.id)
on conflict(source_portal_message_id,thread_id) where source_portal_message_id is not null do nothing;

update public.message_deliveries d set chat_thread_id=t.id from public.chat_threads t where d.channel='portal' and d.recipient_id=t.system_recipient_id and d.portal_message_id is not null;
