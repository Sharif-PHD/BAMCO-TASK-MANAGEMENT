-- Dismiss only a recipient's inbox copy; keep chat and report history intact.
-- Existing own-row UPDATE policies apply to both new columns.
alter table public.notifications add column dismissed_at timestamptz;
alter table public.portal_message_recipients add column dismissed_at timestamptz;
