-- Add authenticated, role-checked actions; existing permissions and data are unchanged.
begin;
create or replace function public.chat_leave_group(p_thread_id uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and active)
 then raise exception 'دسترسی به حساب فعال لازم است'; end if;
 if not exists(select 1 from public.chat_threads where id=p_thread_id and thread_type='group' and is_active)
 then raise exception 'این گروه در دسترس نیست'; end if;
 delete from public.chat_members where thread_id=p_thread_id and user_id=auth.uid();
 if not found then raise exception 'عضو این گروه نیستید'; end if;
end $$;
revoke all on function public.chat_leave_group(uuid) from public,anon;
grant execute on function public.chat_leave_group(uuid) to authenticated;

create or replace function public.chat_delete_thread(p_thread_id uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not private.is_manager() or not private.can_access_chat(p_thread_id) or not exists(select 1 from public.profiles where id=auth.uid() and active)
 then raise exception 'حذف گفت‌وگو فقط با مدیر است'; end if;
 update public.chat_threads set is_active=false,direct_key=null,updated_at=now()
 where id=p_thread_id and thread_type<>'public';
 if not found then raise exception 'گفت‌وگوی عمومی قابل حذف نیست'; end if;
end $$;
revoke all on function public.chat_delete_thread(uuid) from public,anon;
grant execute on function public.chat_delete_thread(uuid) to authenticated;

create or replace function public.chat_delete_message(p_message_id bigint)
returns void language plpgsql security definer set search_path='' as $$
declare conversation_id uuid;
begin
 if auth.uid() is null or not private.is_manager() or not exists(select 1 from public.profiles where id=auth.uid() and active) then raise exception 'حذف پیام فقط با مدیر است'; end if;
 select thread_id into conversation_id from public.chat_messages where id=p_message_id and deleted_at is null;
 if conversation_id is null or not private.can_access_chat(conversation_id) then raise exception 'پیام در دسترس نیست'; end if;
 update public.chat_messages set deleted_at=now() where id=p_message_id;
end $$;
revoke all on function public.chat_delete_message(bigint) from public,anon;
grant execute on function public.chat_delete_message(bigint) to authenticated;

commit;
