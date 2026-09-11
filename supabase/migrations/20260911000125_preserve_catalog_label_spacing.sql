-- Preserve Persian half-spaces in catalog labels while keeping normalized aliases unique.
CREATE OR REPLACE FUNCTION private.guard_task_option()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare other_key text;
begin
 if tg_op='DELETE' then raise exception 'برای حفظ سوابق، گزینه را غیرفعال کنید';end if;
 -- Preserve the display spelling; normalization is only for identity comparisons.
 new.label=btrim(new.label);
 if private.option_normalize(new.label)='' or length(new.label)>80 then raise exception 'عنوان باید بین ۱ تا ۸۰ حرف باشد';end if;
 if new.color !~ '^#[0-9A-Fa-f]{6}$' then raise exception 'رنگ معتبر انتخاب کنید';end if;
 if new.sort_order<1 then raise exception 'ترتیب باید حداقل ۱ باشد';end if;
 if tg_op='UPDATE' and new.key<>old.key then raise exception 'شناسه گزینه قابل تغییر نیست';end if;
 if tg_op='UPDATE' then new.aliases=old.aliases||array[old.label,new.label];else new.aliases=array[new.label];end if;
 select array_agg(distinct a) into new.aliases from unnest(new.aliases) a;
 if tg_table_name='task_statuses' then
  if tg_op='UPDATE' and old.merged_into is not null and (to_jsonb(new)-'sort_order')=(to_jsonb(old)-'sort_order') then return new;end if;
  if new.merged_into is not null or (tg_op='UPDATE' and old.merged_into is not null) then raise exception 'وضعیت ادغام‌شده فقط برای حفظ سوابق نگهداری می‌شود';end if;
  select s.key into other_key from public.task_statuses s where s.key<>new.key and s.merged_into is null and (private.option_normalize(s.label)=private.option_normalize(new.label) or exists(select 1 from unnest(s.aliases) a where private.option_normalize(a)=private.option_normalize(new.label))) limit 1;
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
  select s.key into other_key from public.priorities s where s.key<>new.key and (private.option_normalize(s.label)=private.option_normalize(new.label) or exists(select 1 from unnest(s.aliases) a where private.option_normalize(a)=private.option_normalize(new.label))) limit 1;
  if not new.active and not exists(select 1 from public.priorities where key<>new.key and active) then raise exception 'حداقل یک اولویت باید فعال بماند';end if;
 end if;
 if other_key is not null then raise exception 'این عنوان یا نام قبلی آن متعلق به گزینه دیگری است';end if;
 return new;
end $function$;
-- Apply the spelling the manager requested.
update public.task_statuses set label='ثبت‌شده' where key='registered' and label='ثبت شده';
