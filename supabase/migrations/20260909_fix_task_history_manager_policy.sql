-- Fix task history reads to use the supported private manager helper.
-- This keeps task history visible to managers and to the owner of the related task.
drop policy if exists history_read on public.task_history;

create policy history_read
on public.task_history
for select
to authenticated
using (
  (select private.is_manager())
  or exists (
    select 1
    from public.tasks t
    where t.id = task_history.task_id
      and t.owner_id = (select auth.uid())
  )
);
