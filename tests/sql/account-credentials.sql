-- Isolated synthetic identity; rollback prevents any real notification/account change.
begin;
do $$
declare uid uuid:=gen_random_uuid(); manager_id uuid; original_email text; login text; count_before bigint;
begin
  original_email:='credential-test-'||uid||'@example.invalid';
  insert into auth.users(id,email,encrypted_password,raw_user_meta_data) values(uid,original_email,'fixture-hash-before','{"full_name":"آزمون اطلاعات ورود"}');
  if not exists(select 1 from public.profiles where id=uid and login_name=original_email and password_changed_at is null) then raise exception 'new account sync failed'; end if;
  if exists(select 1 from public.notifications where entity_type='profile' and entity_id=uid::text) then raise exception 'creation sent change notification'; end if;
  login:='changed-'||uid;
  update auth.users set email=login||'@no-email.invalid',encrypted_password='fixture-hash-after' where id=uid;
  if not exists(select 1 from public.profiles where id=uid and email=original_email and login_name=login and password_changed_at is not null) then raise exception 'corporate email / login / password timestamp mismatch'; end if;
  if exists(select 1 from public.profiles p where p.active and p.role='manager' and not exists(select 1 from public.notifications n where n.user_id=p.id and n.entity_id=uid::text and n.notification_type='credentials_changed' and n.body like '%'||login||'%')) then raise exception 'manager alert missing'; end if;
  if exists(select 1 from public.notifications where entity_id=uid::text and body like '%fixture-hash%') then raise exception 'secret leaked'; end if;
  select count(*) into count_before from public.notifications where entity_id=uid::text;
  update auth.users set encrypted_password=encrypted_password,raw_user_meta_data='{"full_name":"metadata-only"}' where id=uid;
  if (select count(*) from public.notifications where entity_id=uid::text)<>count_before then raise exception 'duplicate metadata-only alert'; end if;
  select id into manager_id from public.profiles where active and role='manager' limit 1;
  perform set_config('request.jwt.claims',json_build_object('sub',manager_id,'role','authenticated')::text,true);
  begin
    update public.profiles set login_name='forged' where id=uid;
    raise exception 'forged login accepted';
  exception when insufficient_privilege then null; end;
  perform set_config('request.jwt.claims',json_build_object('sub',uid,'role','authenticated')::text,true);
  begin
    update public.profiles set password_changed_at=null where id=uid;
    raise exception 'forged password audit accepted';
  exception when insufficient_privilege then null; end;
  update auth.users set encrypted_password='fixture-self-change' where id=uid;
  if (select count(*) from public.notifications where entity_id=uid::text)<=count_before then raise exception 'self password update not tracked'; end if;
end $$;
select 'PASS: creation, independent login, password metadata, manager alerts, no secrets, idempotency, guarded metadata, self password update' result;
rollback;
