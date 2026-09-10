-- No fixture data survives this check.
begin;
do $$
declare mid uuid; uid uuid; gid uuid; denied boolean; n int;
begin
 select id into mid from public.profiles where active and role='manager' order by id limit 1;
 select id into uid from public.profiles where active and role='owner' order by id limit 1;
 if mid is null or uid is null then raise exception 'Active manager and owner required'; end if;
 perform set_config('request.jwt.claim.sub',mid::text,true);execute 'set local role authenticated';
 gid:=public.chat_create_group('__GROUP_PHOTO_QA__',array[mid]);
 execute 'reset role';
 insert into storage.objects(bucket_id,name) values('group-avatars',gid::text||'/qa.png');
 execute 'set local role authenticated';
 perform public.chat_set_group_avatar(gid,gid::text||'/qa.png');
 if not exists(select 1 from public.chat_threads where id=gid and avatar_path=gid::text||'/qa.png') then raise exception 'Photo save failed'; end if;
 denied:=false;begin perform public.chat_set_group_avatar(gid,gen_random_uuid()::text||'/qa.png');exception when raise_exception then denied:=true;end;
 if not denied then raise exception 'Cross-group path allowed';end if;
 execute 'reset role';perform set_config('request.jwt.claim.sub',uid::text,true);execute 'set local role authenticated';
 select count(*) into n from storage.objects where bucket_id='group-avatars' and name=gid::text||'/qa.png';
 if n<>0 then raise exception 'Nonmember photo read allowed';end if;
 denied:=false;begin perform public.chat_set_group_avatar(gid,null);exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Owner edited group photo';end if;
 execute 'reset role';perform set_config('request.jwt.claim.sub',mid::text,true);execute 'set local role authenticated';
 perform public.chat_manage_group(gid,'__GROUP_PHOTO_QA__',array[mid,uid],false);
 execute 'reset role';perform set_config('request.jwt.claim.sub',uid::text,true);execute 'set local role authenticated';
 select count(*) into n from storage.objects where bucket_id='group-avatars' and name=gid::text||'/qa.png';
 if n<>1 then raise exception 'Group member cannot see photo';end if;
 execute 'reset role';perform set_config('request.jwt.claim.sub',mid::text,true);execute 'set local role authenticated';
 perform public.chat_set_group_avatar(gid,null);
 if exists(select 1 from public.chat_threads where id=gid and avatar_path is not null) then raise exception 'Photo removal failed';end if;
 execute 'reset role';
end $$;
rollback;
select 'PASS: manager save/remove, invalid path rejected, nonmember denied, member read, owner edit denied; all fixtures rolled back' result;

