-- Complete the existing conversation API. No existing messages are removed.
begin;

create or replace function private.can_access_chat_attachment(object_name text)
returns boolean language sql stable security invoker set search_path='' as $$
 select case when split_part(object_name,'/',1) ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
 then private.can_access_chat(split_part(object_name,'/',1)::uuid)
 and exists(select 1 from public.chat_threads t where t.id=split_part(object_name,'/',1)::uuid and t.is_active)
 and exists(select 1 from public.profiles me where me.id=auth.uid() and me.active) else false end
$$;
revoke all on function private.can_access_chat_attachment(text) from public,anon;
grant execute on function private.can_access_chat_attachment(text) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit)
values('chat-attachments','chat-attachments',false,5242880)
on conflict(id) do nothing;

create policy chat_attachments_read on storage.objects for select to authenticated
 using(bucket_id='chat-attachments' and private.can_access_chat_attachment(name));
create policy chat_attachments_upload on storage.objects for insert to authenticated
 with check(bucket_id='chat-attachments' and split_part(name,'/',2)=auth.uid()::text and private.can_access_chat_attachment(name));
create policy chat_attachments_cleanup on storage.objects for delete to authenticated
 using(bucket_id='chat-attachments' and split_part(name,'/',2)=auth.uid()::text and private.can_access_chat_attachment(name));

commit;
