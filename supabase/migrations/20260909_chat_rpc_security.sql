-- Chat RPCs are available only to signed-in users; each function also validates role/membership internally.
revoke all on function public.chat_create_group(text,uuid[]) from public,anon;
revoke all on function public.chat_directory() from public,anon;
revoke all on function public.chat_ensure_direct(uuid) from public,anon;
revoke all on function public.chat_ensure_public() from public,anon;
revoke all on function public.chat_ensure_task(bigint) from public,anon;
revoke all on function public.chat_ensure_task_direct(bigint,uuid) from public,anon;
revoke all on function public.chat_mark_read(uuid) from public,anon;
revoke all on function public.chat_send_message(uuid,text,bigint) from public,anon;
revoke all on function public.revoke_user_session(uuid) from public,anon;
grant execute on function public.chat_create_group(text,uuid[]),public.chat_directory(),public.chat_ensure_direct(uuid),public.chat_ensure_public(),public.chat_ensure_task(bigint),public.chat_ensure_task_direct(bigint,uuid),public.chat_mark_read(uuid),public.chat_send_message(uuid,text,bigint),public.revoke_user_session(uuid) to authenticated;
create index if not exists chat_messages_reply_to_idx on public.chat_messages(reply_to);
create index if not exists chat_messages_sender_id_idx on public.chat_messages(sender_id);
create index if not exists chat_threads_created_by_idx on public.chat_threads(created_by);
