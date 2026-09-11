-- Consolidate message formatting/thread ordering and make task lifecycle resequencing proportional to the affected suffix.

create or replace function private.normalize_persian_report_date(p_value text)
returns text
language sql
immutable
set search_path to ''
as $$
  select case
    when p_value is null then null
    when btrim(p_value) ~ '^[۰-۹0-9]{4}[[:space:]]+[^[:space:]]+[[:space:]]+[۰-۹0-9]{1,2}[[:space:]]*[,،][[:space:]]*[^[:space:]]+$'
      then regexp_replace(btrim(p_value),'^([۰-۹0-9]{4})[[:space:]]+([^[:space:]]+)[[:space:]]+([۰-۹0-9]{1,2})[[:space:]]*[,،][[:space:]]*([^[:space:]]+)$',E'\\4، \\3 \\2 \\1')
    else btrim(p_value)
  end
$$;

do $migration$
declare v_oid oid;v_def text;v_next text;
begin
 select p.oid into v_oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='prepare_workflow_messages' order by p.oid desc limit 1;
 if v_oid is null then raise exception 'prepare_workflow_messages not found';end if;
 v_def:=pg_get_functiondef(v_oid);
 v_next:=replace(v_def,'v_date:=coalesce(nullif(btrim(p_report_date),''''),v_today::text);','v_date:=private.normalize_persian_report_date(coalesce(nullif(btrim(p_report_date),''''),v_today::text));');
 if v_next=v_def then raise exception 'workflow report-date source fragment not found';end if;v_def:=v_next;
 v_next:=replace(v_def,'v_title:=trim(coalesce(nullif(p.salutation,''''),case when p.gender=''خانم'' then ''سرکار خانم'' else ''جناب آقای'' end))||'' ''||coalesce(nullif(p.display_name,''''),nullif(p.full_name,''''),p.email::text,'''');','v_title:=coalesce(nullif(btrim(p.salutation),''''),trim((case when p.gender=''خانم'' then ''سرکار خانم'' else ''جناب آقای'' end)||'' ''||coalesce(nullif(p.display_name,''''),nullif(p.full_name,''''),p.email::text,'''')));');
 if v_next=v_def then raise exception 'workflow salutation source fragment not found';end if;execute v_next;
end
$migration$;

do $migration$
declare v_oid oid;v_def text;v_next text;
begin
 select p.oid into v_oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='chat_conversation_list' order by p.oid desc limit 1;
 if v_oid is null then raise exception 'chat_conversation_list not found';end if;
 v_def:=pg_get_functiondef(v_oid);v_next:=replace(v_def,'order by x.updated_at desc','order by (x.system_recipient_id is not null) desc,x.updated_at desc');
 if v_next=v_def then raise exception 'chat conversation ordering fragment not found';end if;execute v_next;
end
$migration$;

create or replace function private.resequence_task_display_ids_from(p_start bigint)
returns void language plpgsql security definer set search_path to '' as $function$
declare v_start bigint:=greatest(coalesce(p_start,1),1);
begin
 perform pg_advisory_xact_lock(hashtextextended('bamco-task-display-id-resequence',0));perform set_config('bamco.resequencing','1',true);
 if not exists(select 1 from public.tasks where legacy_id>=v_start) then perform set_config('bamco.resequencing','',true);return;end if;
 update public.tasks set legacy_id=-legacy_id where legacy_id>=v_start;
 with ordered as (select id,row_number() over(order by -legacy_id,id)::bigint+v_start-1 as seq from public.tasks where legacy_id<0)
 update public.tasks t set legacy_id=ordered.seq from ordered where t.id=ordered.id;
 perform set_config('bamco.resequencing','',true);
end;$function$;

create or replace function private.ensure_task_display_ids_contiguous()
returns void language plpgsql security definer set search_path to '' as $function$
declare v_count bigint;v_min bigint;v_max bigint;v_distinct bigint;
begin
 select count(*),min(legacy_id),max(legacy_id),count(distinct legacy_id) into v_count,v_min,v_max,v_distinct from public.tasks;
 if v_count=0 then return;end if;
 if v_min is distinct from 1 or v_max is distinct from v_count or v_distinct is distinct from v_count then perform private.resequence_task_display_ids();end if;
end;$function$;

create or replace function public.delete_tasks_and_resequence(p_task_ids bigint[])
returns integer language plpgsql set search_path to '' as $function$
declare v_count integer;v_start bigint;
begin
 if not (select private.is_manager()) then raise exception 'دسترسی مدیر لازم است' using errcode='42501';end if;
 if coalesce(cardinality(p_task_ids),0)=0 then raise exception 'هیچ وظیفه‌ای انتخاب نشده است';end if;
 perform pg_advisory_xact_lock(hashtextextended('bamco-task-display-id-resequence',0));lock table public.tasks in share row exclusive mode;perform private.ensure_task_display_ids_contiguous();
 select min(legacy_id) into v_start from public.tasks where id=any(p_task_ids);delete from public.tasks where id=any(p_task_ids);get diagnostics v_count=row_count;
 if v_count=0 then raise exception 'وظیفه پیدا نشد';end if;if v_start is not null then perform private.resequence_task_display_ids_from(v_start);end if;return v_count;
end;$function$;

create or replace function public.restore_tasks_to_kanban_and_resequence(p_task_ids bigint[])
returns integer language plpgsql set search_path to '' as $function$
declare v_requested integer;v_count integer;
begin
 if not (select private.is_manager()) then raise exception 'دسترسی مدیر لازم است' using errcode='42501';end if;
 select count(distinct selected.id) into v_requested from unnest(coalesce(p_task_ids,array[]::bigint[])) as selected(id);if v_requested=0 then raise exception 'هیچ وظیفه‌ای انتخاب نشده است';end if;
 perform pg_advisory_xact_lock(hashtextextended('bamco-task-display-id-resequence',0));lock table public.tasks in share row exclusive mode;
 if (select count(*) from public.tasks where id=any(p_task_ids) and archived)<>v_requested then raise exception 'یک یا چند وظیفه آرشیوی پیدا نشد';end if;
 if exists(select 1 from public.tasks where id=any(p_task_ids) and archived and (owner_id is null or start_date is null or due_date is null)) then raise exception 'برای بازگشت به کانبان، متولی و تاریخ شروع و پایان باید کامل باشد';end if;
 update public.tasks set archived=false,archived_at=null,status='در حال انجام',done_date=null where id=any(p_task_ids) and archived;get diagnostics v_count=row_count;perform private.ensure_task_display_ids_contiguous();return v_count;
end;$function$;

revoke all on function private.normalize_persian_report_date(text) from public,anon,authenticated;
revoke all on function private.resequence_task_display_ids_from(bigint) from public,anon,authenticated;
revoke all on function private.ensure_task_display_ids_contiguous() from public,anon,authenticated;
revoke all on function public.delete_tasks_and_resequence(bigint[]) from public,anon;
revoke all on function public.restore_tasks_to_kanban_and_resequence(bigint[]) from public,anon;
grant execute on function public.delete_tasks_and_resequence(bigint[]) to authenticated;
grant execute on function public.restore_tasks_to_kanban_and_resequence(bigint[]) to authenticated;
notify pgrst,'reload schema';
