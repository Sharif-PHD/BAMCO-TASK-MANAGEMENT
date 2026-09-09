-- REVIEW PROPOSAL: not applied and not a Supabase migration history entry.
-- Verify against the connected project, then generate a migration with the CLI.
BEGIN;
CREATE TABLE IF NOT EXISTS public.bamco_workspace_settings (
 section text PRIMARY KEY CHECK (section IN ('alerts','email')),
 value jsonb NOT NULL CHECK (jsonb_typeof(value)='object'),
 version integer NOT NULL DEFAULT 1 CHECK(version > 0),
 updated_at timestamptz NOT NULL DEFAULT now(),
 updated_by uuid REFERENCES public.profiles(id)
);
ALTER TABLE public.bamco_workspace_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.bamco_workspace_settings FROM public,anon;
GRANT SELECT, UPDATE ON public.bamco_workspace_settings TO authenticated;
DROP POLICY IF EXISTS workspace_settings_read ON public.bamco_workspace_settings;
CREATE POLICY workspace_settings_read ON public.bamco_workspace_settings FOR SELECT TO authenticated USING ((SELECT private.is_manager()));
DROP POLICY IF EXISTS workspace_settings_edit ON public.bamco_workspace_settings;
CREATE POLICY workspace_settings_edit ON public.bamco_workspace_settings FOR UPDATE TO authenticated USING ((SELECT private.is_manager())) WITH CHECK ((SELECT private.is_manager()));
INSERT INTO public.bamco_workspace_settings(section,value) VALUES
('alerts','{"warning_days":3,"serious_overdue_count":3,"urgent_overdue_count":5,"reminder_interval_hours":48,"send_start":"08:00","send_end":"17:00","subject":"گزارش روزانه وضعیت امور","reminder_template":"[نام]، لطفاً پاسخ پیام قبلی را ثبت فرمایید.","default_channel":"portal","workdays":[6,0,1,2,3]}'),
('email','{"sender_name":"BAMCO TASK REMINDER","from_email":"","reply_to":"bamco.task.reminder@outlook.com","default_subject":"گزارش وضعیت امور"}')
ON CONFLICT(section) DO NOTHING;
CREATE OR REPLACE FUNCTION private.validate_workspace_settings() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF NEW.version <> OLD.version+1 THEN RAISE EXCEPTION 'نسخه تنظیمات معتبر نیست'; END IF;
 IF NEW.section <> OLD.section THEN RAISE EXCEPTION 'بخش تنظیمات قابل تغییر نیست'; END IF;
 IF NEW.section='alerts' THEN
  IF NOT (NEW.value ?& ARRAY['warning_days','serious_overdue_count','urgent_overdue_count','reminder_interval_hours','default_channel','workdays','send_start','send_end','subject','reminder_template']) THEN RAISE EXCEPTION 'فیلدهای تنظیمات کامل نیست'; END IF;
  IF (NEW.value->>'warning_days')::int NOT BETWEEN 0 AND 365
   OR (NEW.value->>'serious_overdue_count')::int < 1
   OR (NEW.value->>'urgent_overdue_count')::int < (NEW.value->>'serious_overdue_count')::int
   OR (NEW.value->>'reminder_interval_hours')::int NOT BETWEEN 1 AND 720
   OR NEW.value->>'default_channel' NOT IN ('portal','email','both')
   OR jsonb_array_length(NEW.value->'workdays')=0
   OR EXISTS (SELECT 1 FROM jsonb_array_elements_text(NEW.value->'workdays') d WHERE d::int NOT BETWEEN 0 AND 6)
   OR (NEW.value->>'send_start')::time >= (NEW.value->>'send_end')::time
  THEN RAISE EXCEPTION 'تنظیمات هشدار معتبر نیست'; END IF;
 END IF;
 NEW.updated_at=now(); NEW.updated_by=auth.uid(); RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS workspace_settings_validate ON public.bamco_workspace_settings;
CREATE TRIGGER workspace_settings_validate BEFORE UPDATE ON public.bamco_workspace_settings FOR EACH ROW EXECUTE FUNCTION private.validate_workspace_settings();
create or replace function public.bamco_prepare_message_batch_v2(
 p_recipient_ids uuid[],p_channels jsonb,p_subject text,p_template_text text,p_kind text default 'daily'
) returns uuid language plpgsql security definer set search_path='' as $$
declare bid uuid; rid uuid; p public.profiles%rowtype; active_n int; warning_n int; overdue_n int;
 sticker smallint; template_key text; selected_template text; final_text text; snap_id bigint; ch text; task_json jsonb;
 task_ids bigint[]; warning_ids bigint[]; overdue_ids bigint[];
begin
 if not (select private.is_manager()) then raise exception 'فقط مدیر مجاز به آماده‌سازی پیام است'; end if;
 if coalesce(array_length(p_recipient_ids,1),0)=0 then raise exception 'گیرنده انتخاب نشده است'; end if;
 if nullif(btrim(p_subject),'') is null then raise exception 'موضوع پیام الزامی است'; end if;
 insert into public.message_batches(kind,subject,created_by,status) values(p_kind,p_subject,auth.uid(),'draft') returning id into bid;
 foreach rid in array p_recipient_ids loop
  select * into p from public.profiles where id=rid and active;
  if not found then continue; end if;
  select count(*),count(*) filter(where due_state='warning'),count(*) filter(where due_state='overdue'),
   coalesce(array_agg(id order by id),'{}'),coalesce(array_agg(id order by id) filter(where due_state='warning'),'{}'),
   coalesce(array_agg(id order by id) filter(where due_state='overdue'),'{}'),
   coalesce(jsonb_agg(jsonb_build_object('id',id,'legacy_id',legacy_id,'title',title,'status',status,'priority',priority,'due_date',due_date,'due_state',due_state) order by id),'[]')
  into active_n,warning_n,overdue_n,task_ids,warning_ids,overdue_ids,task_json
  from (select t.*,case when t.status='منتظر پاسخ' then 'none' when t.due_date<current_date then 'overdue'
        when t.due_date<=current_date+greatest(coalesce(t.reminder_days,0),0) then 'warning' else 'none' end due_state
        from public.tasks t where t.owner_id=rid and not t.archived) x;
  sticker:=case when overdue_n>=5 then 5 when overdue_n>=3 then 4 when overdue_n>=1 then 3 when warning_n>=1 then 2 else 1 end;
  template_key:='state'||sticker;
  select mt.body_text into selected_template from public.message_templates mt where mt.template_key=('state'||sticker) limit 1;
  final_text:=replace(replace(replace(replace(coalesce(nullif(p_template_text,''),selected_template,''),'[نام]',coalesce(p.full_name,p.email)),'[تعداد کار فعال]',active_n::text),'[تعداد هشدار]',warning_n::text),'[تعداد دیرکرد]',overdue_n::text);
  insert into public.message_snapshots(batch_id,recipient_id,recipient_name,recipient_email,cc_emails,active_count,warning_count,overdue_count,sticker_state,template_key,subject,final_text,task_ids,warning_task_ids,overdue_task_ids,tasks)
  values(bid,rid,coalesce(p.full_name,p.email),p.email,p.cc_emails,active_n,warning_n,overdue_n,sticker,template_key,p_subject,final_text,task_ids,warning_ids,overdue_ids,task_json) returning id into snap_id;
  ch:=coalesce(p_channels->>rid::text,p.default_message_channel,'portal');
  if ch in ('portal','both') then
   insert into public.message_deliveries(batch_id,snapshot_id,recipient_id,channel,idempotency_key,thread_key)
   values(bid,snap_id,rid,'portal',bid||':'||rid||':portal','BAMCO-'||replace(bid::text,'-','')||'-'||left(replace(rid::text,'-',''),8));
  end if;
  if ch in ('email','both') then
   insert into public.message_deliveries(batch_id,snapshot_id,recipient_id,channel,idempotency_key,thread_key)
   values(bid,snap_id,rid,'email',bid||':'||rid||':email','BAMCO-'||replace(bid::text,'-','')||'-'||left(replace(rid::text,'-',''),8)||'-E');
  end if;
 end loop;
 update public.message_batches set status='ready' where id=bid;
 return bid;
end $$;


REVOKE ALL ON FUNCTION public.bamco_prepare_message_batch_v2(uuid[],jsonb,text,text,text) FROM public,anon;
GRANT EXECUTE ON FUNCTION public.bamco_prepare_message_batch_v2(uuid[],jsonb,text,text,text) TO authenticated;
COMMIT;
-- Follow-up before activation: wire the stored send window, working days and
-- reminder interval into queue acceptance and worker dispatch; inspect policies
-- and run authorized/non-authorized database tests. Saving policy is not evidence
-- that a scheduled worker or receiving-mail webhook is configured.
