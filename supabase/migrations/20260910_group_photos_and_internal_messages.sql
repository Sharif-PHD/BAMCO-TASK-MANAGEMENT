-- Group-photo feature only. Does not alter authentication, existing policies,
-- native sessions, triggers, or the global API hook.
alter table public.chat_threads add column if not exists avatar_path text;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('group-avatars','group-avatars',false,5242880,array['image/png','image/jpeg','image/webp']) on conflict(id) do nothing;
create or replace function private.can_access_group_photo(p_path text,p_write boolean default false)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles where id=auth.uid() and active) and
 exists(select 1 from public.chat_threads t where t.id::text=split_part(p_path,'/',1) and t.thread_type='group' and t.is_active and
 (case when p_write then private.is_manager() else private.is_manager() or exists(select 1 from public.chat_members m where m.thread_id=t.id and m.user_id=auth.uid()) end));
$$;
revoke all on function private.can_access_group_photo(text,boolean) from public,anon;
grant execute on function private.can_access_group_photo(text,boolean) to authenticated;
create policy group_photos_read on storage.objects for select to authenticated using(bucket_id='group-avatars' and private.can_access_group_photo(name,false));
create policy group_photos_insert on storage.objects for insert to authenticated with check(bucket_id='group-avatars' and private.can_access_group_photo(name,true));
create policy group_photos_delete on storage.objects for delete to authenticated using(bucket_id='group-avatars' and private.can_access_group_photo(name,true));
create or replace function public.chat_set_group_avatar(p_thread_id uuid,p_avatar_path text)
returns void language plpgsql security definer set search_path='' as $$ begin
 if not private.is_manager() then raise exception 'فقط مدیر مجاز به تغییر عکس گروه است.' using errcode='42501'; end if;
 if not exists(select 1 from public.chat_threads where id=p_thread_id and thread_type='group' and is_active) then raise exception 'گروه پیدا نشد'; end if;
 if p_avatar_path is not null and (split_part(p_avatar_path,'/',1)<>p_thread_id::text or p_avatar_path like '%..%' or not exists(select 1 from storage.objects where bucket_id='group-avatars' and name=p_avatar_path)) then raise exception 'تصویر بارگذاری‌شده معتبر نیست'; end if;
 update public.chat_threads set avatar_path=p_avatar_path,updated_at=now() where id=p_thread_id;
end $$;
revoke all on function public.chat_set_group_avatar(uuid,text) from public,anon;
grant execute on function public.chat_set_group_avatar(uuid,text) to authenticated;
-- Show colleagues' current profile pictures in the authenticated conversation directory.
create or replace function private.is_directory_photo(p_path text)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles where id=auth.uid() and active) and exists(select 1 from public.profiles where active and avatar_path=p_path);
$$;
revoke all on function private.is_directory_photo(text) from public,anon;
grant execute on function private.is_directory_photo(text) to authenticated;
create policy avatar_read_directory on storage.objects for select to authenticated using(bucket_id='avatars' and private.is_directory_photo(name));
-- Required messaging behavior: no email still permits portal delivery.
update public.profiles set messaging_enabled=true,default_message_channel='portal' where email is null or btrim(email)='';
notify pgrst,'reload schema';

