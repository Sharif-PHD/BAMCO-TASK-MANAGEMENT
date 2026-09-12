create index if not exists document_categories_created_by_idx on public.document_categories(created_by);
create index if not exists documents_created_by_idx on public.documents(created_by);
create index if not exists site_definitions_created_by_idx on public.site_definitions(created_by);
create index if not exists user_site_credentials_site_id_idx on public.user_site_credentials(site_id);

drop policy if exists credentials_direct_select_deny on public.user_site_credentials;
create policy credentials_direct_select_deny on public.user_site_credentials for select to authenticated using (false);
drop policy if exists credentials_direct_insert_deny on public.user_site_credentials;
create policy credentials_direct_insert_deny on public.user_site_credentials for insert to authenticated with check (false);
drop policy if exists credentials_direct_update_deny on public.user_site_credentials;
create policy credentials_direct_update_deny on public.user_site_credentials for update to authenticated using (false) with check (false);
drop policy if exists credentials_direct_delete_deny on public.user_site_credentials;
create policy credentials_direct_delete_deny on public.user_site_credentials for delete to authenticated using (false);