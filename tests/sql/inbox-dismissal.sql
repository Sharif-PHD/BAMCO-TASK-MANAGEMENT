-- Real RLS checks with rollback: no test inbox items remain visible to users.
begin;
do $$
declare owner_id uuid; manager_id uuid; msg bigint; n1 bigint; n2 bigint; actor uuid; own_note bigint; other_note bigint; changed bigint;
begin
 select id into owner_id from public.profiles where active and role='owner' limit 1;
 select id into manager_id from public.profiles where active and role='manager' limit 1;
 if owner_id is null or manager_id is null then raise exception 'test requires two roles'; end if;
 insert into public.notifications(user_id,notification_type,title,body) values(owner_id,'system','آزمون بازگشت‌پذیر','متن آزمون') returning id into n1;
 insert into public.notifications(user_id,notification_type,title,body) values(manager_id,'system','آزمون بازگشت‌پذیر','متن آزمون') returning id into n2;
 insert into public.portal_messages(sender_id,subject,body) values(manager_id,'آزمون بازگشت‌پذیر','سابقه محفوظ') returning id into msg;
 insert into public.portal_message_recipients(message_id,recipient_id,reply_text) values(msg,owner_id,'پاسخ محفوظ'),(msg,manager_id,'پاسخ محفوظ');
 foreach actor in array array[owner_id,manager_id] loop
  own_note:=case when actor=owner_id then n1 else n2 end;other_note:=case when actor=owner_id then n2 else n1 end;
  perform set_config('request.jwt.claims',json_build_object('sub',actor,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  update public.notifications set dismissed_at=now(),read_at=now() where id=own_note;
  get diagnostics changed=row_count;if changed<>1 then raise exception 'own notice dismissal failed'; end if;
  update public.notifications set dismissed_at=now() where id=other_note;
  get diagnostics changed=row_count;if changed<>0 then raise exception 'other notice modified'; end if;
  update public.portal_message_recipients set dismissed_at=now(),read_at=now() where message_id=msg and recipient_id=actor;
  get diagnostics changed=row_count;if changed<>1 then raise exception 'own report dismissal failed'; end if;
  update public.portal_message_recipients set dismissed_at=now() where message_id=msg and recipient_id<>actor;
  get diagnostics changed=row_count;if changed<>0 then raise exception 'other report modified'; end if;
  if exists(select 1 from public.notifications where id=own_note and dismissed_at is null) then raise exception 'notice still visible'; end if;
  if not exists(select 1 from public.portal_message_recipients where message_id=msg and recipient_id=actor and reply_text='پاسخ محفوظ' and dismissed_at is not null) then raise exception 'report history lost'; end if;
  execute 'reset role';
 end loop;
end $$;
select 'PASS: manager and owner can dismiss only their own items; unread filtering and report history preserved' result;
rollback;
