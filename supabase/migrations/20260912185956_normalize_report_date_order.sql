-- Canonical date order regardless of the sending browser's Intl locale ordering.
do $migration$
declare definition text; corrected text;
begin
 select pg_get_functiondef('public.prepare_workflow_messages(uuid[],jsonb,text,text,text,text)'::regprocedure) into definition;
 corrected:=replace(definition,$old$v_date:=coalesce(nullif(btrim(p_report_date),''),v_today::text);$old$,$new$v_date:=private.normalize_persian_report_date(coalesce(nullif(btrim(p_report_date),''),private.message_persian_date(v_today)));$new$);
 if corrected=definition then raise exception 'Expected report-date assignment not found';end if;
 execute corrected;
end $migration$;
notify pgrst,'reload schema';
