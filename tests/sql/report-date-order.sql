-- Run inside BEGIN/ROLLBACK; prepare only, never send.
do $$
declare actor uuid; recipient uuid; batch uuid; s public.message_snapshots%rowtype;
begin
 select id into actor from public.profiles where active and role='manager' limit 1;
 select id into recipient from public.profiles where active and role='owner' limit 1;
 perform set_config('request.jwt.claim.sub',actor::text,true);
 batch:=public.prepare_workflow_messages(array[recipient],jsonb_build_object(recipient::text,'portal'),'','گزارش [تاریخ کامل شمسی]','daily','۱۴۰۵ شهریور ۲۱, شنبه');
 select * into s from public.message_snapshots where batch_id=batch;
 if position('شنبه، ۲۱ شهریور ۱۴۰۵' in s.subject)=0 or position('شنبه، ۲۱ شهریور ۱۴۰۵' in s.body_template)=0 then raise exception 'Date not normalized';end if;
end $$;
