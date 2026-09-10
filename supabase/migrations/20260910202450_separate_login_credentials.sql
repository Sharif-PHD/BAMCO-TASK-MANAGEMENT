-- Auth remains the sole source of login identity and password-change metadata.
-- Never copy plaintext passwords or password hashes into the application schema.
alter table public.profiles add column login_name text;
alter table public.profiles add column password_changed_at timestamptz;
update public.profiles p set login_name=regexp_replace(lower(u.email),'@no-email[.]invalid$','')
from auth.users u where u.id=p.id;
create unique index profiles_login_name_unique on public.profiles(lower(login_name)) where login_name is not null;

create function private.guard_credential_metadata() returns trigger
language plpgsql set search_path='' as $$
begin
  if (new.login_name is distinct from old.login_name or new.password_changed_at is distinct from old.password_changed_at)
     and pg_trigger_depth()<2 then
    raise exception 'اطلاعات ورود فقط از سرویس حساب کاربری قابل تغییر است' using errcode='42501';
  end if;
  return new;
end $$;
revoke all on function private.guard_credential_metadata() from public,anon,authenticated;
create trigger profiles_guard_credentials before update on public.profiles
for each row execute function private.guard_credential_metadata();

create function private.sync_auth_credentials() returns trigger
language plpgsql security definer set search_path='' as $$
declare
  login_changed boolean:=false;
  password_changed boolean:=false;
  person_name text;
  login text:=regexp_replace(lower(new.email),'@no-email[.]invalid$','');
  changed_fields text;
begin
  if tg_op='UPDATE' then
    login_changed:=new.email is distinct from old.email;
    password_changed:=new.encrypted_password is distinct from old.encrypted_password;
    if not login_changed and not password_changed then return new; end if;
  end if;
  update public.profiles set login_name=login,
    password_changed_at=case when password_changed then now() else password_changed_at end
  where id=new.id returning full_name into person_name;
  if tg_op='UPDATE' and found then
    changed_fields:=case when login_changed and password_changed then 'نام کاربری و رمز عبور'
      when login_changed then 'نام کاربری' else 'رمز عبور' end;
    insert into public.notifications(user_id,notification_type,title,body,entity_type,entity_id)
    select p.id,'credentials_changed','تغییر اطلاعات ورود',
      changed_fields||' «'||coalesce(nullif(person_name,''),'کاربر')||'» تغییر کرد.'||
      case when login_changed then ' نام کاربری جدید: '||coalesce(login,'—') else '' end,
      'profile',new.id::text
    from public.profiles p where p.active and (p.role='manager' or p.id=new.id);
  end if;
  return new;
end $$;
revoke all on function private.sync_auth_credentials() from public,anon,authenticated;
-- Alphabetical trigger order: profile creation must precede credential syncing.
create trigger zz_auth_credentials_sync after insert or update of email,encrypted_password on auth.users
for each row execute function private.sync_auth_credentials();
