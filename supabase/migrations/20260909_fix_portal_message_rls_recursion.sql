-- Break the portal_messages <-> portal_message_recipients RLS recursion.
-- Managers can inspect recipient rows directly; recipients can only inspect their own row.
drop policy if exists portal_recipients_read on public.portal_message_recipients;

create policy portal_recipients_read
on public.portal_message_recipients
for select
to authenticated
using (
  recipient_id = (select auth.uid())
  or (select private.is_manager())
);
