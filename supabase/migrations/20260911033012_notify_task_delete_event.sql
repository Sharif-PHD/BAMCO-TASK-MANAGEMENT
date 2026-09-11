-- Ensure delete is covered by the same task lifecycle notification trigger.
-- Full final function is kept in the preceding migration; this migration records the trigger expansion.

drop trigger if exists task_portal_event on public.tasks;
create trigger task_portal_event after insert or update or delete on public.tasks for each row execute function private.notify_task_event();
