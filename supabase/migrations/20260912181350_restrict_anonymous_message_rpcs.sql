-- These operations require an authenticated participant/manager.
revoke all on function public.cancel_message_deliveries(bigint[]) from public,anon;
revoke all on function public.chat_system_message_payload(bigint) from public,anon;
grant execute on function public.cancel_message_deliveries(bigint[]) to authenticated,service_role;
grant execute on function public.chat_system_message_payload(bigint) to authenticated,service_role;
