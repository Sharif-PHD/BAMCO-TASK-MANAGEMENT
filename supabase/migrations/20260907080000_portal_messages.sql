create table if not exists public.portal_messages (
  id bigint generated always as identity primary key,
  sender_id uuid not null references public.profiles(id),
  subject text not null check (btrim(subject) <> ''),
  body text not null check (btrim(body) <> ''),
  importance text not null default 'normal' check (importance in ('normal','important','urgent')),
  allow_reply boolean not null default true,
  require_ack boolean not null default false,
  created_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists public.portal_message_recipients (
  message_id bigint not null references public.portal_messages(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id),
  read_at timestamptz,
  acknowledged_at timestamptz,
  reply_text text,
  replied_at timestamptz,
  primary key (message_id, recipient_id)
);

create index if not exists portal_messages_sender_idx on public.portal_messages(sender_id, created_at desc);
create index if not exists portal_message_recipients_recipient_idx on public.portal_message_recipients(recipient_id, read_at, message_id desc);

alter table public.portal_messages enable row level security;
alter table public.portal_message_recipients enable row level security;

create policy portal_messages_read on public.portal_messages for select to authenticated
using (sender_id=(select auth.uid()) or exists(select 1 from public.portal_message_recipients r where r.message_id=id and r.recipient_id=(select auth.uid())));
create policy portal_messages_manager_insert on public.portal_messages for insert to authenticated
with check (sender_id=(select auth.uid()) and (select private.is_manager()));
create policy portal_messages_manager_update on public.portal_messages for update to authenticated
using (sender_id=(select auth.uid()) and (select private.is_manager()))
with check (sender_id=(select auth.uid()) and (select private.is_manager()));

create policy portal_recipients_read on public.portal_message_recipients for select to authenticated
using (recipient_id=(select auth.uid()) or exists(select 1 from public.portal_messages m where m.id=message_id and m.sender_id=(select auth.uid())));
create policy portal_recipients_manager_insert on public.portal_message_recipients for insert to authenticated
with check ((select private.is_manager()) and exists(select 1 from public.portal_messages m where m.id=message_id and m.sender_id=(select auth.uid())));
create policy portal_recipients_own_update on public.portal_message_recipients for update to authenticated
using (recipient_id=(select auth.uid())) with check (recipient_id=(select auth.uid()));

grant select,insert,update on public.portal_messages to authenticated;
grant select,insert,update on public.portal_message_recipients to authenticated;
grant usage,select on sequence public.portal_messages_id_seq to authenticated;

alter publication supabase_realtime add table public.portal_message_recipients;
