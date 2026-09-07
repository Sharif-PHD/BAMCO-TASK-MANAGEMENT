-- Cover foreign keys reported by the Supabase performance advisor.
create index if not exists change_request_events_actor_id_idx
  on public.change_request_events (actor_id);

create index if not exists change_request_events_request_id_idx
  on public.change_request_events (request_id);

create index if not exists task_field_options_created_by_idx
  on public.task_field_options (created_by);
