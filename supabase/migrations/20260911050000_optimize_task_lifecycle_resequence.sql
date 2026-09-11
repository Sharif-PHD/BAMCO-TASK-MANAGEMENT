-- Delete/restore a task set in one transaction and renumber the visible ids once.
-- The primary key stays immutable; legacy_id is the contiguous number shown in UI.

create or replace function private.resequence_task_display_ids()
returns void
language plpgsql
security definer
set search_path to ''
as $function$
begin
  perform pg_advisory_xact_lock(hashtextextended('bamco-task-display-id-resequence',0));
  perform set_config('bamco.resequencing','1',true);

  -- Move all values out of the positive unique-key range in one statement, then
  -- assign 1..N in one statement. This replaces the former two row-by-row loops.
  with ordered as (
    select id,row_number() over(order by coalesce(legacy_id,id),id)::bigint as seq
    from public.tasks
  )
  update public.tasks t set legacy_id=-ordered.seq
  from ordered where t.id=ordered.id;

  with ordered as (
    select id,row_number() over(order by -legacy_id,id)::bigint as seq
    from public.tasks
  )
  update public.tasks t set legacy_id=ordered.seq
  from ordered where t.id=ordered.id;

  perform set_config('bamco.resequencing','',true);
end;
$function$;

-- Renumbering is a presentational maintenance operation, not a user edit. Avoid
-- producing two history records and two row-version bumps for every task.
create or replace function private.audit_task_change()
returns trigger language plpgsql security definer set search_path='' as $$
declare k text;old_j jsonb;new_j jsonb;actor uuid;req bigint;
begin
  if tg_op='UPDATE' and current_setting('bamco.resequencing',true)='1' then return new;end if;
  actor=auth.uid();
  req=nullif(current_setting('app.request_id',true),'')::bigint;
  if tg_op='INSERT' then
    insert into public.task_history(task_id,action,new_data,actor_id,request_id,source_path,reason)
    values(new.id,'created',to_jsonb(new),actor,req,coalesce(nullif(current_setting('app.source_path',true),''),'direct'),new.change_reason);
    return new;
  elsif tg_op='DELETE' then
    insert into public.task_history(task_id,action,old_data,actor_id,request_id,source_path,reason)
    values(old.id,'deleted',to_jsonb(old),actor,req,coalesce(nullif(current_setting('app.source_path',true),''),'direct'),old.change_reason);
    return old;
  end if;
  old_j=to_jsonb(old);new_j=to_jsonb(new);
  for k in select jsonb_object_keys(new_j) loop
    if old_j->k is distinct from new_j->k and k not in ('last_updated_at','row_version','change_reason') then
      insert into public.task_history(task_id,action,field_name,old_value,new_value,old_data,new_data,actor_id,request_id,source_path,reason)
      values(new.id,'updated',k,old_j->k,new_j->k,old_j,new_j,actor,req,coalesce(nullif(current_setting('app.source_path',true),''),'direct'),new.change_reason);
    end if;
  end loop;
  return new;
end $$;

create or replace function private.enforce_task_rules()
returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op='UPDATE' and current_setting('bamco.resequencing',true)='1' then return new;end if;
 -- Account removal changes references only; historic dates/statuses must survive.
 if tg_op='UPDATE' and current_user='postgres'
 and nullif(current_setting('bamco.deleting_person',true),'') is not null then
  if (to_jsonb(new)-array['owner_id','created_by']) is distinct from (to_jsonb(old)-array['owner_id','created_by'])
  or (new.owner_id is distinct from old.owner_id and not(new.owner_id is null and old.owner_id::text=current_setting('bamco.deleting_person',true)))
  or (new.created_by is distinct from old.created_by and not(new.created_by is null and old.created_by::text=current_setting('bamco.deleting_person',true))) then
   raise exception 'حذف حساب فقط مجاز به حذف ارتباط فرد با وظیفه است';
  end if;
  if old.owner_id is not null and new.owner_id is null then
   select full_name into new.former_owner_name from public.profiles where id=old.owner_id;
   new.owner_deleted_at=now();
  end if;
  new.last_updated_at=now();new.row_version=old.row_version+1;return new;
 end if;
 if tg_op='UPDATE' and old.owner_id is null and old.owner_deleted_at is not null
 and not old.archived and old.status not in ('انجام شده','متوقف')
 and new.owner_id is not null
 and (to_jsonb(new)-array['owner_id'])=(to_jsonb(old)-array['owner_id']) then
  if not private.is_manager() or not exists(select 1 from public.profiles where id=new.owner_id and active) then
   raise exception 'متولی فعال و دسترسی مدیر لازم است' using errcode='42501';
  end if;
  new.former_owner_name=null;new.owner_deleted_at=null;
  new.last_updated_at=now();new.row_version=old.row_version+1;return new;
 end if;
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

create or replace function public.delete_tasks_and_resequence(p_task_ids bigint[])
returns integer
language plpgsql
set search_path to ''
as $function$
declare v_count integer;
begin
  if not (select private.is_manager()) then raise exception 'دسترسی مدیر لازم است' using errcode='42501';end if;
  if coalesce(cardinality(p_task_ids),0)=0 then raise exception 'هیچ وظیفه‌ای انتخاب نشده است';end if;
  perform pg_advisory_xact_lock(hashtextextended('bamco-task-display-id-resequence',0));
  lock table public.tasks in share row exclusive mode;
  delete from public.tasks where id=any(p_task_ids);
  get diagnostics v_count=row_count;
  if v_count=0 then raise exception 'وظیفه پیدا نشد';end if;
  perform private.resequence_task_display_ids();
  return v_count;
end;
$function$;

create or replace function public.delete_task_and_resequence(p_task_id bigint)
returns void
language plpgsql
set search_path to ''
as $function$
begin
  perform public.delete_tasks_and_resequence(array[p_task_id]);
end;
$function$;

create or replace function public.restore_tasks_to_kanban_and_resequence(p_task_ids bigint[])
returns integer
language plpgsql
set search_path to ''
as $function$
declare v_requested integer;v_count integer;
begin
  if not (select private.is_manager()) then raise exception 'دسترسی مدیر لازم است' using errcode='42501';end if;
  select count(distinct selected.id) into v_requested from unnest(coalesce(p_task_ids,array[]::bigint[])) as selected(id);
  if v_requested=0 then raise exception 'هیچ وظیفه‌ای انتخاب نشده است';end if;
  perform pg_advisory_xact_lock(hashtextextended('bamco-task-display-id-resequence',0));
  lock table public.tasks in share row exclusive mode;
  if (select count(*) from public.tasks where id=any(p_task_ids) and archived)<>v_requested then
    raise exception 'یک یا چند وظیفه آرشیوی پیدا نشد';
  end if;
  if exists(select 1 from public.tasks where id=any(p_task_ids) and archived and (owner_id is null or start_date is null or due_date is null)) then
    raise exception 'برای بازگشت به کانبان، متولی و تاریخ شروع و پایان باید کامل باشد';
  end if;
  update public.tasks
  set archived=false,archived_at=null,status='در حال انجام',done_date=null
  where id=any(p_task_ids) and archived;
  get diagnostics v_count=row_count;
  perform private.resequence_task_display_ids();
  return v_count;
end;
$function$;

revoke all on function public.delete_tasks_and_resequence(bigint[]) from public,anon;
revoke all on function public.restore_tasks_to_kanban_and_resequence(bigint[]) from public,anon;
grant execute on function public.delete_tasks_and_resequence(bigint[]) to authenticated;
grant execute on function public.restore_tasks_to_kanban_and_resequence(bigint[]) to authenticated;

notify pgrst,'reload schema';
