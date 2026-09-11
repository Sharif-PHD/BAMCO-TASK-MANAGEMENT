-- Non-destructive production verification for the 2026-09-11 changeset.
-- Expected result: every boolean is true; template hashes match the canonical ZIP values.

select
  (select count(*)=6 from public.email_templates where template_key in ('state1','state2','state3','state4','state5','followup')) as six_templates,
  (select count(*)=0 from information_schema.triggers where trigger_name='delivery_system_conversation') as system_chat_trigger_removed,
  (select count(*)=0 from public.chat_threads where system_recipient_id is not null and is_active) as no_active_system_threads,
  (select count(*)=1 from information_schema.triggers where event_object_schema='public' and event_object_table='tasks' and trigger_name='task_portal_event' and event_manipulation='DELETE') as task_delete_notified,
  (select count(*)=1 from information_schema.triggers where event_object_schema='public' and event_object_table='change_requests' and trigger_name='change_request_result_portal_event') as request_result_notified;

select template_key,
       md5(subject_template) as subject_md5,
       md5(body_html) as body_md5,
       length(body_html) as body_length
from public.email_templates
where template_key in ('state1','state2','state3','state4','state5','followup')
order by template_key;

-- Canonical ZIP hashes expected:
-- followup subject c6b4dd55f9a4017dda8b264dc069d0c5 body 2764ee690c03a128343411d9bdfd5886 length 508
-- state1   subject aa34728753e31d147782267831b3c720 body d664a1dcab24047c21c47f633b48ba64 length 690
-- state2   subject 3cbde0bb23f2198fb2d8dedcd977bab3 body aeec0fe9d4fd1cb73630ef580c232f5c length 821
-- state3   subject 9ca682852e60604be84fda029ce0fd73 body 8175fb75195d3253813668449ee526c5 length 868
-- state4   subject d1066715d10ba6823d69cb264e098854 body 4218637f6679dc42a2a854483b30513f length 866
-- state5   subject daf9b428136b4865089c515cb3393dbd body 5f86b2e06bfa278b3175aea7461ae9ec length 881
