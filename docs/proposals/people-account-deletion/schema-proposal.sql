-- DRAFT / NOT APPLIED. Automatic approval review rejected production execution.
-- People-tab deletion only: no global API hook, native session trigger, password
-- enforcement or existing-user rewrite. Business history survives account removal.
alter table public.tasks add column former_owner_name text;
alter table public.tasks add column owner_deleted_at timestamptz;

-- Historical authors may no longer have a live account. Membership rows retain
-- their existing cascading deletes; only historical references become nullable.
do $$ declare r record; begin
 for r in select c.conrelid::regclass tab,a.attname col from pg_constraint c
 join pg_attribute a on a.attrelid=c.conrelid and a.attnum=c.conkey[1]
 where c.contype='f' and c.confrelid='public.profiles'::regclass
 and c.confdeltype<>'c' and c.conrelid<>'public.portal_message_recipients'::regclass
 loop execute format('alter table %s alter column %I drop not null',r.tab,r.col); end loop;
end $$;

create or replace function private.enforce_task_rules()
returns trigger language plpgsql set search_path='' as $$
begin
 if new.owner_id is not null then new.former_owner_name=null;new.owner_deleted_at=null;
 elsif tg_op='UPDATE' and old.owner_id is not null
 and current_user='postgres' and current_setting('bamco.deleting_person',true)=old.owner_id::text then
  select full_name into new.former_owner_name from public.profiles where id=old.owner_id;
  new.owner_deleted_at=now();
 elsif tg_op='INSERT' then
  if new.owner_deleted_at is not null or new.former_owner_name is not null then raise exception 'اطلاعات حذف متولی قابل ثبت دستی نیست';end if;
 elsif new.owner_deleted_at is distinct from old.owner_deleted_at or new.former_owner_name is distinct from old.former_owner_name then
  raise exception 'اطلاعات حذف متولی قابل تغییر دستی نیست';
 end if;
 if new.status='ثبت شده' then
  new.owner_id=null;new.start_date=null;new.due_date=null;new.done_date=null;
 elsif new.status='در حال انجام' then
  if (new.owner_id is null and new.owner_deleted_at is null) or new.start_date is null or new.due_date is null then
   raise exception 'وظیفه در حال انجام باید متولی، تاریخ شروع و تاریخ پایان داشته باشد';end if;
  new.done_date=null;
 elsif new.status='منتظر پاسخ' then new.due_date=null;new.done_date=null;
 elsif new.status='انجام شده' and new.done_date is null then new.done_date=current_date;
 end if;
 if new.due_date is not null and new.start_date is not null and new.due_date<new.start_date then raise exception 'تاریخ پایان نمی‌تواند قبل از تاریخ شروع باشد';end if;
 if new.done_date is not null and new.status<>'انجام شده' then raise exception 'تاریخ انجام فقط برای وظیفه انجام‌شده مجاز است';end if;
 new.last_updated_at=now();if tg_op='UPDATE' then new.row_version=old.row_version+1;end if;
 return new;
end $$;
-- Append deletion annotations without changing the existing view columns.
do $$ declare v text;begin
 v:=regexp_replace(pg_get_viewdef('public.task_status_view'::regclass,true),';\s*$','');
 execute 'create or replace view public.task_status_view with (security_invoker=true) as select q.*, t.former_owner_name,t.owner_deleted_at from ('||v||') q join public.tasks t on t.id=q.id';
end $$;

-- Existing accounts keep their access. Tokens belonging to physically deleted
-- accounts cannot continue reading shared dictionaries, public chats or avatars.
create or replace function private.has_account()
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles where id=(select auth.uid()));
$$;
revoke all on function private.has_account() from public,anon;
grant execute on function private.has_account() to authenticated;
alter policy "message templates readable" on public.message_templates using((select private.has_account()));
alter policy "options readable" on public.task_field_options using((select private.has_account()));
alter policy dictionaries_read_status on public.task_statuses using((select private.has_account()));
alter policy dictionaries_read_priority on public.priorities using((select private.has_account()));
alter policy approval_chains_read on public.approval_chains using((select private.has_account()));
alter policy approval_members_read on public.approval_chain_members using((select private.has_account()));
alter policy approval_stages_read on public.approval_chain_stages using((select private.has_account()));
alter policy approval_approvers_read on public.approval_stage_approvers using((select private.has_account()));
create or replace function private.can_access_chat(p_thread_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select private.has_account() and (private.is_manager()
 or exists(select 1 from public.chat_threads t where t.id=p_thread_id and t.thread_type='public' and t.is_active)
 or exists(select 1 from public.chat_members m where m.thread_id=p_thread_id and m.user_id=auth.uid())
 or exists(select 1 from public.chat_threads t join public.tasks x on x.id=t.task_id where t.id=p_thread_id and t.thread_type='task' and x.owner_id=auth.uid()));
$$;
alter policy sticker_read_authenticated on storage.objects using(bucket_id='stickers' and (select private.has_account()));
alter policy avatar_read_own_or_manager on storage.objects using(bucket_id='avatars' and (select private.has_account()) and ((storage.foldername(name))[1]=auth.uid()::text or private.is_manager()));
alter policy avatar_insert_own on storage.objects with check(bucket_id='avatars' and (select private.has_account()) and (storage.foldername(name))[1]=auth.uid()::text);
alter policy avatar_update_own on storage.objects using(bucket_id='avatars' and (select private.has_account()) and (storage.foldername(name))[1]=auth.uid()::text) with check(bucket_id='avatars' and (select private.has_account()) and (storage.foldername(name))[1]=auth.uid()::text);

-- Only the verified server function can call this transaction. p_actor_id comes
-- from Auth getUser(), never from the browser's submitted body.
create or replace function public.delete_person_account(p_user_id uuid,p_actor_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r record;n int;photo_paths jsonb;affected_requests bigint[];
begin
 perform pg_advisory_xact_lock(hashtextextended('bamco-delete-person',0));
 if p_actor_id is null or not exists(select 1 from public.profiles where id=p_actor_id and role='manager' and active) then raise exception 'دسترسی مدیر لازم است.' using errcode='42501';end if;
 if p_user_id is null or p_user_id=p_actor_id then raise exception 'حساب در حال استفاده را نمی‌توان حذف کرد.';end if;
 perform 1 from auth.users where id=p_user_id for update;
 if not found then return jsonb_build_object('ok',true,'already_deleted',true,'tasks_retained',0,'avatar_paths','[]'::jsonb);end if;
 perform set_config('request.jwt.claim.sub',p_actor_id::text,true);
 perform set_config('bamco.deleting_person',p_user_id::text,true);
 select coalesce(jsonb_agg(name),'[]'::jsonb) into photo_paths from storage.objects where bucket_id='avatars' and split_part(name,'/',1)=p_user_id::text;
 update storage.objects set owner=p_actor_id,owner_id=p_actor_id::text where owner=p_user_id or owner_id=p_user_id::text;
 update public.tasks set owner_id=null where owner_id=p_user_id;get diagnostics n=row_count;
 update public.message_deliveries set status='cancelled',error_message='حساب گیرنده حذف شده است.' where recipient_id=p_user_id and status in ('ready','queued','failed');
 select coalesce(array_agg(distinct s.request_id),array[]::bigint[]) into affected_requests
 from public.request_approval_steps s join public.change_requests c on c.id=s.request_id
 where s.approver_id=p_user_id and s.decision='pending' and c.request_status in ('pending','in_review');
 update public.change_requests set request_status='needs_revision',manager_note='تأییدکننده حذف شده است؛ زنجیره را اصلاح و درخواست را دوباره ارسال کنید.' where id=any(affected_requests);
 update public.request_approval_steps set decision='needs_revision',note='حساب تأییدکننده حذف شده است.',decided_at=now() where approver_id=p_user_id and decision='pending';
 update public.change_requests set request_status='cancelled',manager_note='حساب درخواست‌دهنده حذف شده است.' where requested_by=p_user_id and request_status in ('draft','pending','in_review','needs_revision');
 delete from public.portal_message_recipients where recipient_id=p_user_id;
 -- Clear historical links; do not delete tasks, messages, stickers or audit rows.
 for r in select c.conrelid::regclass tab,a.attname col from pg_constraint c
 join pg_attribute a on a.attrelid=c.conrelid and a.attnum=c.conkey[1]
 where c.contype='f' and c.confrelid='public.profiles'::regclass and c.confdeltype<>'c'
 and c.conrelid<>'public.portal_message_recipients'::regclass
 loop execute format('update %s set %I=null where %I=$1',r.tab,r.col,r.col) using p_user_id;end loop;
 -- Auth deletion cascades native sessions/refresh tokens and the profile; profile
 -- deletion cascades app sessions, group/approval memberships and notifications.
 delete from auth.users where id=p_user_id;
 if exists(select 1 from auth.users where id=p_user_id) or exists(select 1 from public.profiles where id=p_user_id) then raise exception 'حذف حساب تأیید نشد.';end if;
 perform set_config('bamco.deleting_person','',true);
 return jsonb_build_object('ok',true,'tasks_retained',n,'avatar_paths',photo_paths);
end $$;
revoke all on function public.delete_person_account(uuid,uuid) from public,anon,authenticated;
grant execute on function public.delete_person_account(uuid,uuid) to service_role;
notify pgrst,'reload schema';
