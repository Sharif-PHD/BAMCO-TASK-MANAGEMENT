-- Reject writes to closed conversations and allow managers to discuss unassigned tasks.
begin;
CREATE OR REPLACE FUNCTION public.chat_send_message(p_thread_id uuid, p_body text, p_reply_to bigint DEFAULT NULL::bigint)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid := (select auth.uid()); v_message_id bigint;
begin
 if not exists(select 1 from public.profiles where id=v_uid and active) or not exists(select 1 from public.chat_threads where id=p_thread_id and is_active) then raise exception 'گفت‌وگو یا حساب فعال نیست'; end if;
 if v_uid is null or not (select private.can_access_chat(p_thread_id)) then raise exception 'forbidden'; end if;
 if length(btrim(coalesce(p_body,'')))<1 or length(p_body)>10000 then raise exception 'invalid_message'; end if;
 if p_reply_to is not null and not exists(select 1 from public.chat_messages where id=p_reply_to and thread_id=p_thread_id) then raise exception 'invalid_reply'; end if;
 insert into public.chat_messages(thread_id,sender_id,body,reply_to) values(p_thread_id,v_uid,btrim(p_body),p_reply_to) returning id into v_message_id;
 update public.chat_threads set updated_at=now() where id=p_thread_id;
 insert into public.chat_members(thread_id,user_id,last_read_at) values(p_thread_id,v_uid,now()) on conflict(thread_id,user_id) do update set last_read_at=excluded.last_read_at;
 return v_message_id;
end $function$
;
CREATE OR REPLACE FUNCTION public.chat_ensure_task_direct(p_task_id bigint, p_other_user uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := (select auth.uid());
  v_owner uuid;
  v_title text;
  v_key text;
  v_id uuid;
begin
  if v_uid is null or p_other_user is null or p_other_user=v_uid then raise exception 'invalid_recipient'; end if;
  select owner_id,title into v_owner,v_title from public.tasks where id=p_task_id;
  if not found then raise exception 'task_not_found'; end if;
  if not ((select private.is_manager()) or v_owner=v_uid) then raise exception 'forbidden'; end if;
  if not exists(select 1 from public.profiles where id=p_other_user and active) then raise exception 'invalid_recipient'; end if;
  v_key := 'task:'||p_task_id::text||':'||case when v_uid::text < p_other_user::text then v_uid::text||':'||p_other_user::text else p_other_user::text||':'||v_uid::text end;
  select id into v_id from public.chat_threads where direct_key=v_key limit 1;
  if v_id is null then
    begin
      insert into public.chat_threads(thread_type,title,task_id,direct_key,created_by)
      values('direct','وظیفه '||p_task_id::text||' — '||left(coalesce(v_title,''),90),p_task_id,v_key,v_uid)
      returning id into v_id;
    exception when unique_violation then
      select id into v_id from public.chat_threads where direct_key=v_key limit 1;
    end;
  end if;
  insert into public.chat_members(thread_id,user_id) values(v_id,v_uid),(v_id,p_other_user) on conflict do nothing;
  return v_id;
end $function$
;
commit;
