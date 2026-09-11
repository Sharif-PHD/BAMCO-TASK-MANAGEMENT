-- Keep the optimized trigger compatible with databases that predate account-history fields.
alter table public.tasks
  add column if not exists former_owner_name text,
  add column if not exists owner_deleted_at timestamptz;

notify pgrst,'reload schema';
