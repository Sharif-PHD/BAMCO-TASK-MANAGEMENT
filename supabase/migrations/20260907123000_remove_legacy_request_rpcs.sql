-- Remove superseded request endpoints and prevent direct trigger-function calls.
drop function if exists public.review_change_request_v2(bigint,text,text,jsonb);
drop function if exists public.resubmit_change_request(bigint,jsonb,text);
do $$ begin
  if to_regprocedure('public.log_change_request_submission()') is not null then
    execute 'revoke all on function public.log_change_request_submission() from public,anon,authenticated';
  end if;
end $$;
