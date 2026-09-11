-- Automatic portal messages for task lifecycle changes and request outcomes.

create or replace function private.create_portal_event(p_user uuid,p_title text,p_body text,p_type text,p_entity_type text,p_entity_id text)
returns void language plpgsql security definer set search_path to '' as $function$
declare mid bigint;
begin
  if p_user is null or not exists(select 1 from public.profiles where id=p_user and active) then return; end if;
  insert into public.portal_messages(sender_id,subject,body,importance,allow_reply,require_ack,template_key,sender_name_snapshot)
  values(null,left(coalesce(p_title,'پیام سامانه'),240),coalesce(p_body,''),'normal',false,false,'system_event','سامانه') returning id into mid;
  insert into public.portal_message_recipients(message_id,recipient_id) values(mid,p_user) on conflict do nothing;
end;
$function$;

create or replace function private.notify_task_event()
returns trigger language plpgsql security definer set search_path to '' as $function$
declare v_actor text; v_id text; v_changes text; v_body text;
begin
  select coalesce(display_name,full_name,email,'سامانه') into v_actor from public.profiles where id=auth.uid();
  v_actor:=coalesce(v_actor,'سامانه');
  if tg_op='DELETE' then
    v_id:=coalesce(old.legacy_id,old.id)::text;
    if old.owner_id is not null then perform private.create_portal_event(old.owner_id,'حذف وظیفه','وظیفه '||v_id||' «'||coalesce(old.title,'')||'» حذف شد. انجام‌دهنده تغییر: '||v_actor||'.','task_deleted','task',old.id::text); end if;
    return old;
  end if;
  v_id:=coalesce(new.legacy_id,new.id)::text;
  if tg_op='INSERT' then
    if new.owner_id is not null then perform private.create_portal_event(new.owner_id,'وظیفه جدید برای شما','وظیفه '||v_id||' «'||coalesce(new.title,'')||'» برای شما تعریف شد. ثبت‌کننده: '||v_actor||'.','task_created','task',new.id::text); end if;
    return new;
  end if;
  if row(new.title,new.description,new.owner_id,new.status,new.priority,new.start_date,new.done_date,new.due_date,new.reminder_days,new.manager_notes,new.archived)
     is not distinct from row(old.title,old.description,old.owner_id,old.status,old.priority,old.start_date,old.done_date,old.due_date,old.reminder_days,old.manager_notes,old.archived) then return new; end if;
  v_changes:=concat_ws('، ',case when new.title is distinct from old.title then 'عنوان' end,case when new.description is distinct from old.description then 'توضیحات' end,case when new.status is distinct from old.status then 'وضعیت' end,case when new.priority is distinct from old.priority then 'اولویت' end,case when new.start_date is distinct from old.start_date then 'تاریخ شروع' end,case when new.done_date is distinct from old.done_date then 'تاریخ انجام' end,case when new.due_date is distinct from old.due_date then 'تاریخ پایان' end,case when new.reminder_days is distinct from old.reminder_days then 'یادآور' end,case when new.manager_notes is distinct from old.manager_notes then 'توضیحات مدیر' end,case when new.archived is distinct from old.archived then 'آرشیو' end,case when new.owner_id is distinct from old.owner_id then 'متولی' end);
  if new.owner_id is distinct from old.owner_id then
    if old.owner_id is not null then perform private.create_portal_event(old.owner_id,'انتقال وظیفه','وظیفه '||v_id||' «'||coalesce(new.title,'')||'» از شما منتقل شد. انجام‌دهنده تغییر: '||v_actor||'.','task_transferred','task',new.id::text); end if;
    if new.owner_id is not null then v_body:='وظیفه '||v_id||' «'||coalesce(new.title,'')||'» به شما منتقل شد. انجام‌دهنده تغییر: '||v_actor||'.'; if nullif(v_changes,'') is not null then v_body:=v_body||' موارد تغییر: '||v_changes||'.'; end if; perform private.create_portal_event(new.owner_id,'وظیفه به شما منتقل شد',v_body,'task_transferred','task',new.id::text); end if;
  elsif new.owner_id is not null then
    v_body:='وظیفه '||v_id||' «'||coalesce(new.title,'')||'» به‌روزرسانی شد. انجام‌دهنده تغییر: '||v_actor||'.'; if nullif(v_changes,'') is not null then v_body:=v_body||' موارد تغییر: '||v_changes||'.'; end if; perform private.create_portal_event(new.owner_id,'به‌روزرسانی وظیفه',v_body,'task_updated','task',new.id::text);
  end if;
  return new;
end;
$function$;

create or replace function private.notify_request_result()
returns trigger language plpgsql security definer set search_path to '' as $function$
declare v_result text; v_type text; v_title text; v_body text;
begin
  if new.request_status is not distinct from old.request_status then return new; end if;
  if new.request_status not in ('approved','rejected','needs_revision','cancelled') then return new; end if;
  v_result:=case new.request_status when 'approved' then 'تأیید شد' when 'rejected' then 'رد شد' when 'needs_revision' then 'برای اصلاح برگشت داده شد' else 'لغو شد' end;
  v_type:=case new.request_type when 'create' then 'تعریف وظیفه' when 'delete' then 'حذف وظیفه' when 'complete' then 'اعلام انجام' when 'priority' then 'تغییر اولویت' when 'status' then 'تغییر وضعیت' when 'description' then 'تغییر توضیحات' when 'due_date' then 'تغییر تاریخ پایان' else 'ویرایش وظیفه' end;
  select title into v_title from public.tasks where id=coalesce(new.applied_task_id,new.task_id);
  v_title:=coalesce(v_title,new.proposed_data->>'title','—');
  v_body:='نتیجه درخواست شماره '||new.id||' ('||v_type||') برای «'||v_title||'»: '||v_result||'.';
  if nullif(btrim(coalesce(new.manager_note,'')),'') is not null then v_body:=v_body||' توضیح مدیر: '||new.manager_note; end if;
  perform private.create_portal_event(new.requested_by,'نتیجه درخواست شما',v_body,'request_result','change_request',new.id::text);
  return new;
end;
$function$;

drop trigger if exists task_portal_event on public.tasks;
create trigger task_portal_event after insert or update or delete on public.tasks for each row execute function private.notify_task_event();
drop trigger if exists change_request_result_portal_event on public.change_requests;
create trigger change_request_result_portal_event after update on public.change_requests for each row execute function private.notify_request_result();
