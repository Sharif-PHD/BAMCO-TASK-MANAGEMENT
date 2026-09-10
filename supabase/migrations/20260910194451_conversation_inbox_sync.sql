alter table public.chat_threads add column if not exists system_recipient_id uuid references public.profiles(id) on delete set null;
create unique index if not exists chat_system_recipient_unique on public.chat_threads(system_recipient_id) where system_recipient_id is not null;
alter table public.chat_messages add column if not exists is_system boolean not null default false;
alter table public.chat_messages add column if not exists message_kind text;
alter table public.chat_messages add column if not exists source_delivery_id bigint references public.message_deliveries(id) on delete set null;
create unique index if not exists chat_source_delivery_unique on public.chat_messages(source_delivery_id) where source_delivery_id is not null;
alter table public.chat_messages alter column sender_id drop not null;
alter table public.chat_threads alter column created_by drop not null;
alter table public.chat_messages drop constraint chat_messages_body_check;
alter table public.chat_messages add constraint chat_messages_body_check check(length(btrim(body))>=1 and (is_system or length(btrim(body))<=10000));
alter table public.message_deliveries add column if not exists chat_thread_id uuid references public.chat_threads(id) on delete set null;
create index if not exists delivery_chat_thread_idx on public.message_deliveries(chat_thread_id) where chat_thread_id is not null;

create or replace function private.notify_chat_message() returns trigger language plpgsql security definer set search_path='' as $$
declare t public.chat_threads%rowtype; kind text; preview text;
begin
 select * into t from public.chat_threads where id=new.thread_id;
 kind:=case when new.is_system then coalesce(new.message_kind,'system') when t.system_recipient_id is not null then 'system_reply' when t.task_id is not null then 'task_chat' when t.thread_type='public' then 'public_chat' when t.thread_type='group' then 'group_chat' else 'direct_chat' end;
 preview:=case when new.body like 'BAMCO_ATTACHMENT_V1:%' then 'فایل یا تصویر جدید' when new.body like 'BAMCO_STICKER_V1:%' then 'استیکر جدید' else left(new.body,220) end;
 insert into public.notifications(user_id,notification_type,title,body,entity_type,entity_id)
 select p.id,kind,case when new.is_system then case when kind='reminder' then 'یادآور سامانه' when kind='daily' then 'گزارش وضعیت امور روزانه' else 'پیام سامانه' end else t.title end,preview,'chat_thread',t.id::text
 from public.profiles p where p.active and p.id is distinct from new.sender_id and
 (case when new.is_system then p.id=t.system_recipient_id when t.thread_type='public' then true else exists(select 1 from public.chat_members cm where cm.thread_id=t.id and cm.user_id=p.id) end);
 update public.chat_threads set updated_at=new.created_at where id=t.id;
 return new;
end $$;
revoke all on function private.notify_chat_message() from public,anon,authenticated;
create trigger chat_message_notification after insert on public.chat_messages for each row execute function private.notify_chat_message();

create or replace function private.delivery_to_system_chat() returns trigger language plpgsql security definer set search_path='' as $$
declare tid uuid; s public.message_snapshots%rowtype; kind text;
begin
 if new.channel<>'portal' or new.status not in ('sent','delivered') or new.portal_message_id is null or new.chat_thread_id is not null then return new; end if;
 select * into s from public.message_snapshots where id=new.snapshot_id;
 select b.kind into kind from public.message_batches b where b.id=new.batch_id;
 insert into public.chat_threads(thread_type,title,direct_key,system_recipient_id,created_by)
 values('direct','پیام‌های سامانه','system:'||new.recipient_id::text,new.recipient_id,null)
 on conflict(system_recipient_id) where system_recipient_id is not null do update set is_active=true
 returning id into tid;
 insert into public.chat_members(thread_id,user_id) select tid,id from public.profiles where active and (id=new.recipient_id or role='manager') on conflict do nothing;
 insert into public.chat_messages(thread_id,sender_id,body,is_system,message_kind,source_delivery_id,sender_name_snapshot)
 values(tid,null,s.subject||E'\n\n'||s.final_text,true,coalesce(kind,'system'),new.id,'سامانه') on conflict(source_delivery_id) where source_delivery_id is not null do nothing;
 new.chat_thread_id:=tid;
 return new;
end $$;
revoke all on function private.delivery_to_system_chat() from public,anon,authenticated;
create trigger delivery_system_conversation before update of status,portal_message_id on public.message_deliveries for each row execute function private.delivery_to_system_chat();

create or replace function private.chat_reply_delivery() returns trigger language plpgsql security definer set search_path='' as $$
declare d public.message_deliveries%rowtype;
begin
 if new.is_system or new.reply_to is null then return new; end if;
 select md.* into d from public.chat_messages parent join public.message_deliveries md on md.id=parent.source_delivery_id where parent.id=new.reply_to and parent.thread_id=new.thread_id and md.recipient_id=new.sender_id;
 if found then
  update public.portal_message_recipients set reply_text=new.body,replied_at=now(),read_at=coalesce(read_at,now()) where message_id=d.portal_message_id and recipient_id=new.sender_id;
  update public.message_deliveries set reply_text=new.body,replied_at=now(),reply_channel='portal' where id=d.id;
 end if;
 return new;
end $$;
revoke all on function private.chat_reply_delivery() from public,anon,authenticated;
create trigger chat_delivery_reply after insert or update of body on public.chat_messages for each row execute function private.chat_reply_delivery();

create or replace function public.chat_mark_read(p_thread_id uuid) returns boolean language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not private.can_access_chat(p_thread_id) then raise exception 'forbidden'; end if;
 insert into public.chat_members(thread_id,user_id,last_read_at) values(p_thread_id,auth.uid(),now()) on conflict(thread_id,user_id) do update set last_read_at=excluded.last_read_at;
 update public.notifications set read_at=now() where user_id=auth.uid() and entity_type='chat_thread' and entity_id=p_thread_id::text and read_at is null;
 update public.portal_message_recipients r set read_at=coalesce(r.read_at,now()) from public.message_deliveries d where d.chat_thread_id=p_thread_id and r.message_id=d.portal_message_id and r.recipient_id=auth.uid();
 return true;
end $$;

create or replace function public.chat_conversation_list() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(x order by x.updated_at desc),'[]'::jsonb) from (
 select t.id,t.thread_type,t.task_id,t.avatar_path,t.system_recipient_id,t.is_active,t.participant_deleted_at,
 case when t.system_recipient_id is not null then 'پیام‌های سامانه'||case when t.system_recipient_id<>auth.uid() then ' · '||coalesce(sp.full_name,'کاربر') else '' end
 when t.thread_type='direct' then coalesce(peer.full_name,t.deleted_participant_name,t.title) else t.title end title,
 peer.id person_id,t.updated_at,
 (select left(m.body,160) from public.chat_messages m where m.thread_id=t.id and m.deleted_at is null order by m.created_at desc limit 1) last_message,
 (select count(*) from public.notifications n where n.user_id=auth.uid() and n.entity_type='chat_thread' and n.entity_id=t.id::text and n.read_at is null) unread_count
 from public.chat_threads t left join public.profiles sp on sp.id=t.system_recipient_id
 left join lateral(select p.id,p.full_name from public.chat_members cm join public.profiles p on p.id=cm.user_id where cm.thread_id=t.id and cm.user_id<>auth.uid() order by cm.joined_at limit 1) peer on true
 where auth.uid() is not null and private.has_account() and (t.is_active or t.participant_deleted_at is not null) and
 (t.thread_type='public' or exists(select 1 from public.chat_members cm where cm.thread_id=t.id and cm.user_id=auth.uid()))
 ) x;
$$;
revoke all on function public.chat_conversation_list() from public,anon;
grant execute on function public.chat_conversation_list() to authenticated;
