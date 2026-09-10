-- Enforce the manager's status definitions. Existing business records are not rewritten.
begin;
alter table public.tasks alter column owner_id drop not null;

create or replace function private.enforce_task_rules()
returns trigger language plpgsql set search_path='' as $$
begin
  if new.status='ثبت شده' then
    new.owner_id=null; new.start_date=null; new.due_date=null; new.done_date=null;
  elsif new.status='در حال انجام' then
    if new.owner_id is null or new.start_date is null or new.due_date is null then
      raise exception 'وظیفه در حال انجام باید متولی، تاریخ شروع و تاریخ پایان داشته باشد';
    end if;
    new.done_date=null;
  elsif new.status='منتظر پاسخ' then
    new.due_date=null; new.done_date=null;
  elsif new.status='انجام شده' and new.done_date is null then
    new.done_date=current_date;
  end if;
  if new.due_date is not null and new.start_date is not null and new.due_date < new.start_date then
    raise exception 'تاریخ پایان نمی‌تواند قبل از تاریخ شروع باشد';
  end if;
  if new.done_date is not null and new.status <> 'انجام شده' then
    raise exception 'تاریخ انجام فقط برای وظیفه انجام‌شده مجاز است';
  end if;
  new.last_updated_at=now();
  if tg_op='UPDATE' then new.row_version=old.row_version+1; end if;
  return new;
end $$;

-- NULL owners must not turn an authorization predicate into an unknown value.
create or replace function public.chat_ensure_task_direct(p_task_id bigint, p_other_user uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_uid uuid := (select auth.uid()); v_owner uuid; v_title text; v_key text; v_id uuid;
begin
  if v_uid is null or p_other_user is null or p_other_user=v_uid then raise exception 'invalid_recipient'; end if;
  select owner_id,title into v_owner,v_title from public.tasks where id=p_task_id;
  if not found then raise exception 'task_not_found'; end if;
  if not coalesce((select private.is_manager()) or v_owner=v_uid,false) then raise exception 'forbidden'; end if;
  if not exists(select 1 from public.profiles where id=p_other_user and active) then raise exception 'invalid_recipient'; end if;
  v_key := 'task:'||p_task_id::text||':'||case when v_uid::text < p_other_user::text then v_uid::text||':'||p_other_user::text else p_other_user::text||':'||v_uid::text end;
  select id into v_id from public.chat_threads where direct_key=v_key limit 1;
  if v_id is null then
    begin
      insert into public.chat_threads(thread_type,title,task_id,direct_key,created_by)
      values('direct','وظیفه '||p_task_id::text||' — '||left(coalesce(v_title,''),90),p_task_id,v_key,v_uid) returning id into v_id;
    exception when unique_violation then
      select id into v_id from public.chat_threads where direct_key=v_key limit 1;
    end;
  end if;
  insert into public.chat_members(thread_id,user_id) values(v_id,v_uid),(v_id,p_other_user) on conflict do nothing;
  return v_id;
end $$;
commit;
