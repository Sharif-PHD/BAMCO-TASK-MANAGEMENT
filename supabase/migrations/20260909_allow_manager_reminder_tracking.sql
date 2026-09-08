-- The manager-only UPDATE policy remains the authorization boundary.
-- Limit the table grant to the two fields used by mark_message_reminders.
grant update (reminder_count, last_reminded_at)
on public.message_deliveries
to authenticated;
