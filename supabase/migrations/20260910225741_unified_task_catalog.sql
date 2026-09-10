alter table public.task_statuses add column if not exists aliases text[] not null default '{}', add column if not exists kind text not null default 'active', add column if not exists owner_mode text not null default 'optional', add column if not exists start_mode text not null default 'optional', add column if not exists due_mode text not null default 'optional', add column if not exists tracks_deadline boolean not null default true;
alter table public.task_statuses add column if not exists merged_into text;
alter table public.priorities add column if not exists aliases text[] not null default '{}';
update public.task_statuses set aliases=array[label];
update public.priorities set aliases=array[label];
update public.task_statuses set kind=case key when 'registered' then 'registered' when 'waiting' then 'waiting' when 'done' then 'completed' when 'paused' then 'cancelled' when 'cancelled' then 'cancelled' else 'active' end, owner_mode=case key when 'registered' then 'none' when 'doing' then 'required' else 'optional' end,start_mode=case key when 'registered' then 'none' when 'doing' then 'required' else 'optional' end,due_mode=case key when 'registered' then 'none' when 'waiting' then 'none' when 'doing' then 'required' else 'optional' end,tracks_deadline=key='doing';
-- Merge the two cancellation names; old imports and requests remain resolvable.
update public.task_statuses set label='متوقف',aliases=array['متوقف','متوقف شده','لغو شده','کنسل شده'],active=true,archivable=true where key='cancelled';
-- Retain the legacy catalog row; resolve its old names to the canonical state.
update public.task_statuses set active=false,merged_into='cancelled' where key='paused';
alter table public.task_statuses drop constraint task_statuses_sort_order_key;
alter table public.priorities drop constraint priorities_sort_order_key;
with ordered as(select key,row_number() over(order by (merged_into is not null),sort_order,key) n from public.task_statuses) update public.task_statuses t set sort_order=o.n from ordered o where o.key=t.key;
with ordered as(select key,row_number() over(order by sort_order,key) n from public.priorities) update public.priorities t set sort_order=o.n from ordered o where o.key=t.key;
alter table public.task_statuses add constraint task_statuses_sort_order_key unique(sort_order) deferrable initially immediate;
alter table public.priorities add constraint priorities_sort_order_key unique(sort_order) deferrable initially immediate;
create or replace function private.option_normalize(v text) returns text language sql immutable set search_path='' as $$select btrim(regexp_replace(translate(coalesce(v,''),'يك‌','یک '),'\s+',' ','g'))$$;
create or replace function private.task_status_option(v text) returns public.task_statuses language sql stable set search_path='' as $$select resolved from public.task_statuses s join public.task_statuses resolved on resolved.key=coalesce(s.merged_into,s.key) where s.key=v or private.option_normalize(s.label)=private.option_normalize(v) or exists(select 1 from unnest(s.aliases) a where private.option_normalize(a)=private.option_normalize(v)) order by (s.label=v) desc limit 1$$;
create or replace function private.task_priority_option(v text) returns public.priorities language sql stable set search_path='' as $$select s from public.priorities s where s.key=v or private.option_normalize(s.label)=private.option_normalize(v) or exists(select 1 from unnest(s.aliases) a where private.option_normalize(a)=private.option_normalize(v)) order by (s.label=v) desc limit 1$$;
revoke all on function private.option_normalize(text),private.task_status_option(text),private.task_priority_option(text) from public,anon;
grant execute on function private.option_normalize(text),private.task_status_option(text),private.task_priority_option(text) to authenticated,service_role;

create or replace function private.guard_task_option() returns trigger language plpgsql set search_path='' as $$
declare other_key text;
begin
 if tg_op='DELETE' then raise exception 'برای حفظ سوابق، گزینه را غیرفعال کنید';end if;
 new.label=private.option_normalize(new.label);
 if new.label='' or length(new.label)>80 then raise exception 'عنوان باید بین ۱ تا ۸۰ حرف باشد';end if;
 if new.color !~ '^#[0-9A-Fa-f]{6}$' then raise exception 'رنگ معتبر انتخاب کنید';end if;
 if new.sort_order<1 then raise exception 'ترتیب باید حداقل ۱ باشد';end if;
 if tg_op='UPDATE' and new.key<>old.key then raise exception 'شناسه گزینه قابل تغییر نیست';end if;
 if tg_op='UPDATE' then new.aliases=old.aliases||array[old.label,new.label];else new.aliases=array[new.label];end if;
 select array_agg(distinct a) into new.aliases from unnest(new.aliases) a;
 if tg_table_name='task_statuses' then
  if tg_op='UPDATE' and old.merged_into is not null and (to_jsonb(new)-'sort_order')=(to_jsonb(old)-'sort_order') then return new;end if;
  if new.merged_into is not null or (tg_op='UPDATE' and old.merged_into is not null) then raise exception 'وضعیت ادغام‌شده فقط برای حفظ سوابق نگهداری می‌شود';end if;
  select s.key into other_key from public.task_statuses s where s.key<>new.key and s.merged_into is null and (private.option_normalize(s.label)=new.label or exists(select 1 from unnest(s.aliases) a where private.option_normalize(a)=new.label)) limit 1;
  if tg_op='UPDATE' and new.is_system<>old.is_system then raise exception 'نوع گزینه پایه قابل تغییر نیست';end if;
  if tg_op='INSERT' then new.is_system=false;end if;
  if new.kind not in ('registered','active','waiting','completed','cancelled') or new.owner_mode not in ('none','optional','required') or new.start_mode not in ('none','optional','required') or new.due_mode not in ('none','optional','required') then raise exception 'قواعد وضعیت معتبر نیست';end if;
  if tg_op='UPDATE' and new.kind<>old.kind and (old.is_system or exists(select 1 from public.tasks t where (private.task_status_option(t.status)).key=old.key)) then raise exception 'ماهیت وضعیت استفاده‌شده تغییر نمی‌کند؛ وضعیت تازه‌ای بسازید';end if;
  if new.kind='registered' then new.owner_mode='none';new.start_mode='none';new.due_mode='none';end if;
  if new.kind='waiting' then new.due_mode='none';end if;
  if new.kind in ('registered','waiting','completed','cancelled') or new.due_mode='none' then new.tracks_deadline=false;end if;
  if new.kind='completed' then new.archivable=true;end if;
  new.allows_start_date=new.start_mode<>'none';new.allows_due_date=new.due_mode<>'none';
  if not new.active and not exists(select 1 from public.task_statuses where key<>new.key and active) then raise exception 'حداقل یک وضعیت باید فعال بماند';end if;
 else
  select s.key into other_key from public.priorities s where s.key<>new.key and (private.option_normalize(s.label)=new.label or exists(select 1 from unnest(s.aliases) a where private.option_normalize(a)=new.label)) limit 1;
  if not new.active and not exists(select 1 from public.priorities where key<>new.key and active) then raise exception 'حداقل یک اولویت باید فعال بماند';end if;
 end if;
 if other_key is not null then raise exception 'این عنوان یا نام قبلی آن متعلق به گزینه دیگری است';end if;
 return new;
end $$;
create or replace function private.propagate_task_option_name() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.label=old.label then return new;end if;
 perform set_config('bamco.catalog_rename','1',true);
 if tg_table_name='task_statuses' then update public.tasks set status=new.label where status=any(old.aliases||array[old.label]);
 else update public.tasks set priority=new.label where priority=any(old.aliases||array[old.label]);end if;
 perform set_config('bamco.catalog_rename','',true);
 return new;
end $$;
revoke all on function private.guard_task_option(),private.propagate_task_option_name() from public,anon,authenticated;
create trigger guard_task_option before insert or update or delete on public.task_statuses for each row execute function private.guard_task_option();
create trigger guard_task_option before insert or update or delete on public.priorities for each row execute function private.guard_task_option();
create trigger propagate_task_option_name after update of label on public.task_statuses for each row execute function private.propagate_task_option_name();
create trigger propagate_task_option_name after update of label on public.priorities for each row execute function private.propagate_task_option_name();

create or replace function public.save_task_option(p_kind text,p_key text,p_data jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
declare tab text; oldrow jsonb; result jsonb; n integer; pos integer; oldpos integer; k text;
begin
 if auth.uid() is null or not private.is_manager() then raise exception 'فقط مدیر مجاز به تغییر گزینه‌هاست' using errcode='42501';end if;
 if p_kind not in ('status','priority') then raise exception 'نوع گزینه معتبر نیست';end if;
 tab=case p_kind when 'status' then 'task_statuses' else 'priorities' end;
 perform pg_advisory_xact_lock(hashtextextended('bamco.task.catalog',0));
 execute format('select to_jsonb(t) from public.%I t where key=$1 for update',tab) into oldrow using p_key;
 if p_key is not null and (oldrow is null or oldrow->>'merged_into' is not null) then raise exception 'گزینه پیدا نشد یا با وضعیت دیگری ادغام شده است';end if;
 execute format('select count(*) from public.%I t where to_jsonb(t)->>''merged_into'' is null',tab) into n;
 k=coalesce(p_key,'custom_'||replace(gen_random_uuid()::text,'-',''));
 pos=greatest(1,least(coalesce(nullif(p_data->>'sort_order','')::integer,(oldrow->>'sort_order')::integer,n+1),n+case when oldrow is null then 1 else 0 end));
 oldpos=(oldrow->>'sort_order')::integer;
 set constraints public.task_statuses_sort_order_key,public.priorities_sort_order_key deferred;
 if oldrow is null then execute format('update public.%I set sort_order=sort_order+1 where sort_order >= $1',tab) using pos;
 elsif pos<oldpos then execute format('update public.%I set sort_order=sort_order+1 where sort_order >= $1 and sort_order < $2',tab) using pos,oldpos;
 elsif pos>oldpos then execute format('update public.%I set sort_order=sort_order-1 where sort_order > $1 and sort_order <= $2',tab) using oldpos,pos;end if;
 if p_kind='status' then
  insert into public.task_statuses(key,label,color,sort_order,active,kind,owner_mode,start_mode,due_mode,tracks_deadline,archivable)
  values(k,coalesce(p_data->>'label',oldrow->>'label'),coalesce(p_data->>'color',oldrow->>'color','#328263'),pos,coalesce((p_data->>'active')::boolean,(oldrow->>'active')::boolean,true),coalesce(p_data->>'kind',oldrow->>'kind','active'),coalesce(p_data->>'owner_mode',oldrow->>'owner_mode','optional'),coalesce(p_data->>'start_mode',oldrow->>'start_mode','optional'),coalesce(p_data->>'due_mode',oldrow->>'due_mode','optional'),coalesce((p_data->>'tracks_deadline')::boolean,(oldrow->>'tracks_deadline')::boolean,true),coalesce((p_data->>'archivable')::boolean,(oldrow->>'archivable')::boolean,false))
  on conflict(key) do update set label=excluded.label,color=excluded.color,sort_order=excluded.sort_order,active=excluded.active,kind=excluded.kind,owner_mode=excluded.owner_mode,start_mode=excluded.start_mode,due_mode=excluded.due_mode,tracks_deadline=excluded.tracks_deadline,archivable=excluded.archivable returning to_jsonb(task_statuses.*) into result;
 else
  insert into public.priorities(key,label,color,sort_order,active) values(k,coalesce(p_data->>'label',oldrow->>'label'),coalesce(p_data->>'color',oldrow->>'color','#328263'),pos,coalesce((p_data->>'active')::boolean,(oldrow->>'active')::boolean,true)) on conflict(key) do update set label=excluded.label,color=excluded.color,sort_order=excluded.sort_order,active=excluded.active returning to_jsonb(priorities.*) into result;
 end if;
 set constraints public.task_statuses_sort_order_key,public.priorities_sort_order_key immediate;
 return result;
end $$;
revoke all on function public.save_task_option(text,text,jsonb) from public,anon;
grant execute on function public.save_task_option(text,text,jsonb) to authenticated,service_role;

CREATE OR REPLACE FUNCTION private.enforce_task_rules()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare st public.task_statuses; pr public.priorities; old_st public.task_statuses; old_pr public.priorities; changed boolean;
begin
 if tg_op='UPDATE' and current_user='postgres' and pg_trigger_depth()>1 and current_setting('bamco.catalog_rename',true)='1' and (to_jsonb(new)-array['status','priority'])=(to_jsonb(old)-array['status','priority']) then return new;end if;

 -- Account removal changes references only; historic dates/statuses must survive,
 -- including legacy records that predate the current task validation rules.
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
 -- A manager can resolve one orphaned active task without rewriting its history.
 if tg_op='UPDATE' and old.owner_id is null and old.owner_deleted_at is not null
 and not old.archived and (private.task_status_option(old.status)).kind not in ('completed','cancelled')
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
 st=private.task_status_option(new.status);pr=private.task_priority_option(new.priority);
 if st.key is null then raise exception 'وضعیت تعریف نشده است';end if;
 if pr.key is null then raise exception 'اولویت تعریف نشده است';end if;
 if tg_op='UPDATE' then old_st=private.task_status_option(old.status);old_pr=private.task_priority_option(old.priority);end if;
 if not st.active and (tg_op='INSERT' or st.key is distinct from old_st.key) then raise exception 'این وضعیت غیرفعال است';end if;
 if not pr.active and (tg_op='INSERT' or pr.key is distinct from old_pr.key) then raise exception 'این اولویت غیرفعال است';end if;
 new.status=st.label;new.priority=pr.label;
 changed=tg_op='INSERT';
 if tg_op='UPDATE' then changed=st.key is distinct from old_st.key or (new.owner_id,new.start_date,new.due_date,new.done_date,new.archived) is distinct from (old.owner_id,old.start_date,old.due_date,old.done_date,old.archived);end if;
 if changed then
  if st.owner_mode='none' then new.owner_id=null;elsif st.owner_mode='required' and new.owner_id is null and new.owner_deleted_at is null then raise exception 'این وضعیت به متولی نیاز دارد';end if;
  if st.start_mode='none' then new.start_date=null;elsif st.start_mode='required' and new.start_date is null then raise exception 'تاریخ شروع برای این وضعیت الزامی است';end if;
  if st.due_mode='none' then new.due_date=null;elsif st.due_mode='required' and new.due_date is null then raise exception 'تاریخ پایان برای این وضعیت الزامی است';end if;
  if not st.tracks_deadline then new.reminder_days=0;end if;
  if st.kind='completed' then new.done_date=coalesce(new.done_date,current_date);new.archived=true;new.archived_at=coalesce(new.archived_at,now());else new.done_date=null;end if;
  if new.archived and (tg_op='INSERT' or not old.archived) and not st.archivable then raise exception 'این وضعیت اجازه انتقال به آرشیو ندارد';end if;
  if new.due_date is not null and new.start_date is not null and new.due_date<new.start_date then raise exception 'تاریخ پایان نمی‌تواند قبل از تاریخ شروع باشد';end if;
 end if;
 new.last_updated_at=now();if tg_op='UPDATE' then new.row_version=old.row_version+1;end if;
 return new;
end $function$
;

create or replace view public.task_status_view with(security_invoker=true) as  SELECT q.id,
    q.title,
    q.description,
    q.owner_id,
    coalesce(s.label,q.status) as status,
    coalesce(p.label,q.priority) as priority,
    q.start_date,
    q.done_date,
    q.due_date,
    q.reminder_days,
    q.last_updated_at,
    q.manager_notes,
    q.archived,
    q.archived_at,
    q.created_by,
    q.created_at,
    q.legacy_id,
    q.row_version,
    q.source,
    q.source_row_hash,
    q.due_state,
    q.delay_days,
    q.advance_days,
    t.former_owner_name,
    t.owner_deleted_at, s.key as status_key, p.key as priority_key, s.kind as status_kind, s.color as status_color, p.color as priority_color
   FROM ( SELECT t_1.id,
            t_1.title,
            t_1.description,
            t_1.owner_id,
            t_1.status,
            t_1.priority,
            t_1.start_date,
            t_1.done_date,
            t_1.due_date,
            t_1.reminder_days,
            t_1.last_updated_at,
            t_1.manager_notes,
            t_1.archived,
            t_1.archived_at,
            t_1.created_by,
            t_1.created_at,
            t_1.legacy_id,
            t_1.row_version,
            t_1.source,
            t_1.source_row_hash,
                CASE
                    WHEN t_1.archived OR (private.task_status_option(t_1.status)).kind in ('completed','cancelled') THEN 'وظیفه به پایان رسیده است'::text
                    WHEN not coalesce((private.task_status_option(t_1.status)).tracks_deadline,false) THEN 'فاقد شرایط دیرکرد'::text
                    WHEN t_1.due_date < CURRENT_DATE THEN 'دیرکرد'::text
                    WHEN t_1.due_date IS NOT NULL AND CURRENT_DATE >= (t_1.due_date - t_1.reminder_days) THEN 'دوره هشدار'::text
                    ELSE 'فاقد شرایط دیرکرد'::text
                END AS due_state,
                CASE
                    WHEN t_1.archived AND t_1.done_date > t_1.due_date THEN t_1.done_date - t_1.due_date
                    ELSE 0
                END AS delay_days,
                CASE
                    WHEN t_1.archived AND t_1.done_date < t_1.due_date THEN t_1.due_date - t_1.done_date
                    ELSE 0
                END AS advance_days
           FROM public.tasks t_1) q
     JOIN public.tasks t ON t.id = q.id LEFT JOIN LATERAL private.task_status_option(q.status) s ON true LEFT JOIN LATERAL private.task_priority_option(q.priority) p ON true;

CREATE OR REPLACE FUNCTION public.prepare_workflow_messages(p_recipient_ids uuid[], p_channels jsonb, p_subject text, p_template_text text DEFAULT NULL::text, p_kind text DEFAULT 'daily'::text, p_report_date text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare bid uuid; rid uuid; p public.profiles%rowtype; active_n int; warning_n int; overdue_n int;
 v_sticker smallint; v_key text; v_body text; v_final text; v_subject text; v_title text; v_path text; v_date text;
 snap_id bigint; ch text; task_json jsonb; task_ids bigint[]; warning_ids bigint[]; overdue_ids bigint[];
 warning_text text; overdue_text text; last_sent text; v_pair record; v_today date:=(now() at time zone 'Asia/Tehran')::date;
begin
 if not (select private.is_manager()) or not exists(select 1 from public.profiles where id=auth.uid() and active) then raise exception 'فقط مدیر فعال مجاز به آماده‌سازی پیام است'; end if;
 if coalesce(cardinality(p_recipient_ids),0)=0 then raise exception 'گیرنده انتخاب نشده است'; end if;
 if p_kind not in ('daily','reminder','manual') then raise exception 'نوع پیام نامعتبر است'; end if;
 if length(coalesce(p_template_text,''))>30000 then raise exception 'متن پیام بیش از حد طولانی است'; end if;
 v_date:=coalesce(nullif(btrim(p_report_date),''),v_today::text);
 insert into public.message_batches(kind,subject,created_by,status) values(p_kind,coalesce(nullif(btrim(p_subject),''),'گزارش وضعیت امور'),auth.uid(),'draft') returning id into bid;
 for rid in select distinct unnest(p_recipient_ids) loop
  select * into p from public.profiles where id=rid and active;
  if not found then raise exception 'گیرنده غیرفعال یا نامعتبر است'; end if;
  ch:=coalesce(p_channels->>rid::text,p.default_message_channel,'portal');
  if ch not in ('portal','email','both') then raise exception 'کانال ارسال نامعتبر است'; end if;
  if ch in ('email','both') and nullif(btrim(p.email),'') is null then raise exception 'برای % ایمیل ثبت نشده است؛ ارسال داخل سامانه را انتخاب کنید',p.full_name; end if;
  select count(*),count(*) filter(where due_state='warning'),count(*) filter(where due_state='overdue'),
   coalesce(array_agg(id order by id),'{}'),coalesce(array_agg(id order by id) filter(where due_state='warning'),'{}'),coalesce(array_agg(id order by id) filter(where due_state='overdue'),'{}'),
   coalesce(jsonb_agg(jsonb_build_object('id',id,'legacy_id',legacy_id,'title',title,'description',description,'status',(private.task_status_option(status)).label,'priority',(private.task_priority_option(priority)).label,'start_date',start_date,'due_date',due_date,'due_state',due_state) order by id),'[]')
  into active_n,warning_n,overdue_n,task_ids,warning_ids,overdue_ids,task_json
  from (select t.*,case when not coalesce((private.task_status_option(t.status)).tracks_deadline,false) then 'none' when t.due_date<v_today then 'overdue' when t.due_date<=v_today+greatest(coalesce(t.reminder_days,0),0) then 'warning' else 'none' end due_state from public.tasks t where t.owner_id=rid and not t.archived and (private.task_status_option(t.status)).kind not in ('completed','cancelled','registered')) x;
  v_sticker:=case when overdue_n>=5 then 5 when overdue_n>=3 then 4 when overdue_n>=1 then 3 when warning_n>=1 then 2 else 1 end;
  v_key:=case when p_kind='reminder' then 'followup' else 'state'||v_sticker end;
  select e.body_html,e.subject_template into v_body,v_subject from public.email_templates e where e.template_key=v_key;
  v_body:=coalesce(nullif(btrim(p_template_text),''),nullif(v_body,''));
  if v_body is null then raise exception 'متن پیش‌فرض % تعریف نشده است',v_key; end if;
  if nullif(btrim(p_template_text),'') is null then
   v_body:=regexp_replace(regexp_replace(regexp_replace(v_body,'<br\s*/?>',E'\n','gi'),'</p>',E'\n\n','gi'),'<[^>]*>','','g');
   v_body:=replace(replace(replace(replace(replace(replace(v_body,'&nbsp;',' '),'&lt;','<'),'&gt;','>'),'&quot;','"'),'&#39;',''''),'&amp;','&');
  end if;
  v_subject:=coalesce(nullif(btrim(p_subject),''),nullif(v_subject,''),'گزارش وضعیت امور');
  v_title:=(case when p.gender='خانم' then 'سرکار خانم ' else 'جناب آقای ' end)||coalesce(nullif(p.display_name,''),p.full_name,p.email);
  select max(d.sent_at)::date::text into last_sent from public.message_deliveries d where d.recipient_id=rid and d.status in ('sent','delivered');
  for v_pair in select * from (values
   ('[عنوان و نام مخاطب]',v_title),('[عنوان مخاطب]',v_title),('[نام مخاطب]',coalesce(p.full_name,p.email)),('[نام]',coalesce(p.full_name,p.email)),
   ('[تعداد امور هشداری]',warning_n::text),('[تعداد هشدار]',warning_n::text),('[تعداد امور دیرکردی]',overdue_n::text),('[تعداد دیرکرد]',overdue_n::text),('[تعداد کار فعال]',active_n::text),
   ('[تاریخ کامل شمسی]',v_date),('[تاریخ گزارش]',v_date),('[تاریخ آخرین ارسال]',coalesce(last_sent,'—'))
  ) placeholders(k,v) loop v_body:=replace(v_body,v_pair.k,v_pair.v);v_subject:=replace(v_subject,v_pair.k,v_pair.v);end loop;
  select string_agg((t->>'id')||' | '||(t->>'title')||' | '||(t->>'status')||' | پایان: '||coalesce(t->>'due_date','—'),E'\n') filter(where t->>'due_state'='warning'),string_agg((t->>'id')||' | '||(t->>'title')||' | '||(t->>'status')||' | پایان: '||coalesce(t->>'due_date','—'),E'\n') filter(where t->>'due_state'='overdue') into warning_text,overdue_text from jsonb_array_elements(task_json) t;
  v_final:=replace(replace(replace(v_body,'[جدول امور هشداری]',E'امور هشداری:\n'||coalesce(warning_text,'موردی وجود ندارد.')),'[جدول امور دیرکردی]',E'امور دیرکردی:\n'||coalesce(overdue_text,'موردی وجود ندارد.')),'[استیکر]','');
  select s.storage_path into v_path from public.stickers s join public.sticker_sets ss on ss.id=s.set_id where ss.active and s.state_key='state'||v_sticker and s.gender=case when p.gender='خانم' then 'female' else 'male' end order by ss.id desc limit 1;
  insert into public.message_snapshots(batch_id,recipient_id,recipient_name,recipient_email,cc_emails,active_count,warning_count,overdue_count,sticker_state,template_key,subject,final_text,task_ids,warning_task_ids,overdue_task_ids,tasks,body_template,sticker_path)
  values(bid,rid,coalesce(p.full_name,p.email),p.email,p.cc_emails,active_n,warning_n,overdue_n,v_sticker,v_key,v_subject,v_final,task_ids,warning_ids,overdue_ids,task_json,v_body,v_path) returning id into snap_id;
  if ch in ('portal','both') then insert into public.message_deliveries(batch_id,snapshot_id,recipient_id,channel,idempotency_key,thread_key) values(bid,snap_id,rid,'portal',bid||':'||rid||':portal','BAMCO-'||replace(bid::text,'-','')||'-'||left(replace(rid::text,'-',''),8));end if;
  if ch in ('email','both') then insert into public.message_deliveries(batch_id,snapshot_id,recipient_id,channel,idempotency_key,thread_key) values(bid,snap_id,rid,'email',bid||':'||rid||':email','BAMCO-'||replace(bid::text,'-','')||'-'||left(replace(rid::text,'-',''),8)||'-E');end if;
 end loop;
 update public.message_batches set status='ready' where id=bid;return bid;
end $function$
;

CREATE OR REPLACE FUNCTION public.task_temporal_state(t tasks, at_date date DEFAULT CURRENT_DATE)
 RETURNS text
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
 select case
  when not coalesce((private.task_status_option(t.status)).tracks_deadline,false) or t.due_date is null then 'فاقد شرایط دیرکرد'
  when (private.task_status_option(t.status)).kind in ('completed','cancelled') then 'فاقد شرایط دیرکرد'
  when t.due_date < at_date then 'دیرکرد'
  when t.due_date <= at_date + greatest(t.reminder_days,0) then 'هشدار'
  else 'عادی' end
$function$
;

CREATE OR REPLACE FUNCTION public.delete_person_account(p_user_id uuid, p_actor_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare r record;n int;photo_paths jsonb;affected_requests bigint[];person_name text;active_ids bigint[];active_tasks jsonb;
begin
 perform pg_advisory_xact_lock(hashtextextended('bamco-delete-person',0));
 if p_actor_id is null or not exists(select 1 from public.profiles where id=p_actor_id and role='manager' and active) then raise exception 'دسترسی مدیر لازم است.' using errcode='42501';end if;
 if p_user_id is null or p_user_id=p_actor_id then raise exception 'حساب در حال استفاده را نمی‌توان حذف کرد.';end if;
 perform 1 from auth.users where id=p_user_id for update;
 if not found then return jsonb_build_object('ok',true,'already_deleted',true,'tasks_retained',0,'avatar_paths','[]'::jsonb);end if;
 perform set_config('request.jwt.claim.sub',p_actor_id::text,true);
 perform set_config('bamco.deleting_person',p_user_id::text,true);
 select full_name into person_name from public.profiles where id=p_user_id;
 update public.chat_messages set sender_name_snapshot=person_name where sender_id=p_user_id;
 update public.portal_messages set sender_name_snapshot=person_name where sender_id=p_user_id;
 update public.chat_threads t set is_active=false,deleted_participant_name=person_name,participant_deleted_at=now() where t.thread_type='direct' and exists(select 1 from public.chat_members m where m.thread_id=t.id and m.user_id=p_user_id);
 update public.change_requests set requester_name_snapshot=person_name where requested_by=p_user_id;
 update public.task_history set actor_name_snapshot=person_name where actor_id=p_user_id;
 update public.change_request_events set actor_name_snapshot=person_name where actor_id=p_user_id;
 select coalesce(jsonb_agg(name),'[]'::jsonb) into photo_paths from storage.objects where bucket_id='avatars' and split_part(name,'/',1)=p_user_id::text;
 update storage.objects set owner=p_actor_id,owner_id=p_actor_id::text where owner=p_user_id or owner_id=p_user_id::text;
 select coalesce(array_agg(id),array[]::bigint[]) into active_ids from public.tasks where owner_id=p_user_id and not archived and (private.task_status_option(status)).kind not in ('completed','cancelled');
 update public.tasks set owner_id=null where owner_id=p_user_id;get diagnostics n=row_count;
 update public.message_deliveries set status='cancelled',error_message='حساب گیرنده حذف شده است.' where recipient_id=p_user_id and status in ('ready','queued','failed');
 select coalesce(array_agg(distinct s.request_id),array[]::bigint[]) into affected_requests
 from public.request_approval_steps s join public.change_requests c on c.id=s.request_id
 where s.approver_id=p_user_id and s.decision='pending' and c.request_status in ('pending','in_review');
 update public.change_requests set request_status='needs_revision',manager_note='تأییدکننده حذف شده است؛ زنجیره را اصلاح و درخواست را دوباره ارسال کنید.' where id=any(affected_requests);
 update public.request_approval_steps set decision='needs_revision',note='حساب تأییدکننده حذف شده است.',decided_at=now() where approver_id=p_user_id and decision='pending';
 update public.change_requests set manager_note=concat_ws(E'\n',nullif(manager_note,''),'حساب درخواست‌دهنده حذف شده است؛ درخواست برای تصمیم‌گیری و تعیین متولی باقی مانده است.') where requested_by=p_user_id and request_status in ('draft','pending','in_review','needs_revision');
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
 select coalesce(jsonb_agg(to_jsonb(t) order by t.id),'[]'::jsonb) into active_tasks from public.task_status_view t where t.id=any(active_ids);
 return jsonb_build_object('ok',true,'tasks_retained',n,'avatar_paths',photo_paths,'active_tasks',active_tasks);
end $function$
;

CREATE OR REPLACE FUNCTION private.apply_change_request(p_request_id bigint, p_actor uuid, p_payload jsonb)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare r public.change_requests%rowtype; tid bigint;
begin
 select * into r from public.change_requests where id=p_request_id for update;
 perform set_config('app.request_id',r.id::text,true);perform set_config('app.source_path','approval_workflow',true);
 if r.request_type='create' then
  insert into public.tasks(title,description,owner_id,status,priority,start_date,due_date,done_date,reminder_days,manager_notes,created_by,change_reason)
  values(p_payload->>'title',coalesce(p_payload->>'description',''),coalesce(nullif(p_payload->>'owner_id','')::uuid,r.requested_by),coalesce(p_payload->>'status','ثبت شده'),coalesce(p_payload->>'priority','متوسط'),nullif(p_payload->>'start_date','')::date,nullif(p_payload->>'due_date','')::date,nullif(p_payload->>'done_date','')::date,coalesce(nullif(p_payload->>'reminder_days','')::int,0),coalesce(p_payload->>'manager_notes',''),p_actor,'درخواست شماره '||r.id) returning id into tid;
 else
  tid=r.task_id;
  if r.request_type='delete' then delete from public.tasks where id=tid;
  elsif r.request_type='complete' then update public.tasks set status='انجام شده',done_date=coalesce(nullif(p_payload->>'done_date','')::date,current_date),archived=true,archived_at=now(),change_reason='درخواست شماره '||r.id where id=tid;
  else update public.tasks set
   title=coalesce(p_payload->>'title',title),description=coalesce(p_payload->>'description',description),
   status=coalesce(p_payload->>'status',status),priority=coalesce(p_payload->>'priority',priority),
   owner_id=case when p_payload?'owner_id' then nullif(p_payload->>'owner_id','')::uuid else owner_id end,
   done_date=case when p_payload?'done_date' then nullif(p_payload->>'done_date','')::date else done_date end,
   archived=case when p_payload?'archived' then (p_payload->>'archived')::boolean else archived end,
   archived_at=case when p_payload->>'archived'='true' then now() else archived_at end,
   start_date=case when p_payload?'start_date' then nullif(p_payload->>'start_date','')::date else start_date end,
   due_date=case when p_payload?'due_date' then nullif(p_payload->>'due_date','')::date else due_date end,
   manager_notes=coalesce(p_payload->>'manager_notes',manager_notes),change_reason='درخواست شماره '||r.id where id=tid;
  end if;
 end if;
 update public.change_requests set task_id=coalesce(task_id,tid),applied_task_id=tid,request_status='approved',final_data=p_payload,completed_at=now(),reviewed_by=p_actor,reviewed_at=now() where id=r.id;
 insert into public.change_request_events(request_id,actor_id,event_type,note,snapshot) values(r.id,p_actor,'applied','تغییر روی وظیفه اعمال شد',jsonb_build_object('task_id',tid));
 return tid;
end $function$
;
