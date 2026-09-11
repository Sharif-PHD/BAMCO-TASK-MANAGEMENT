-- Direct manager task deletion must be able to call the private resequencing helpers.
-- The public RPC remains callable only by authenticated users and performs an
-- explicit manager check before running with definer privileges.

create or replace function public.delete_tasks_and_resequence(p_task_ids bigint[])
returns integer
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_count integer;
  v_start bigint;
begin
  if not (select private.is_manager()) then
    raise exception 'دسترسی مدیر لازم است' using errcode='42501';
  end if;
  if coalesce(cardinality(p_task_ids),0)=0 then
    raise exception 'هیچ وظیفه‌ای انتخاب نشده است';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('bamco-task-display-id-resequence',0));
  lock table public.tasks in share row exclusive mode;
  perform private.ensure_task_display_ids_contiguous();

  select min(legacy_id) into v_start
  from public.tasks
  where id=any(p_task_ids);

  delete from public.tasks
  where id=any(p_task_ids);
  get diagnostics v_count=row_count;
  if v_count=0 then
    raise exception 'وظیفه پیدا نشد';
  end if;

  if v_start is not null then
    perform private.resequence_task_display_ids_from(v_start);
  end if;
  return v_count;
end;
$function$;

create or replace function public.restore_tasks_to_kanban_and_resequence(p_task_ids bigint[])
returns integer
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_requested integer;
  v_count integer;
begin
  if not (select private.is_manager()) then
    raise exception 'دسترسی مدیر لازم است' using errcode='42501';
  end if;
  select count(distinct selected.id) into v_requested
  from unnest(coalesce(p_task_ids,array[]::bigint[])) as selected(id);
  if v_requested=0 then
    raise exception 'هیچ وظیفه‌ای انتخاب نشده است';
  end if;

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
  perform private.ensure_task_display_ids_contiguous();
  return v_count;
end;
$function$;

revoke all on function public.delete_tasks_and_resequence(bigint[]) from public,anon;
revoke all on function public.restore_tasks_to_kanban_and_resequence(bigint[]) from public,anon;
grant execute on function public.delete_tasks_and_resequence(bigint[]) to authenticated,service_role;
grant execute on function public.restore_tasks_to_kanban_and_resequence(bigint[]) to authenticated,service_role;

notify pgrst,'reload schema';
