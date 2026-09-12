begin;
do $$
declare manager_id uuid; sid bigint; target bigint; incomplete bigint; expected text; actual text; denied boolean;
begin
 select id into manager_id from public.profiles where active and role='manager' limit 1;
 perform set_config('request.jwt.claim.sub',manager_id::text,true);
 select id into sid from public.message_snapshots where template_key like 'state%' limit 1;
 select id into target from public.sticker_sets where not active order by id desc limit 1;
 if sid is null or target is null then raise exception 'Sticker fixture missing'; end if;
 execute 'set local role authenticated';
 perform public.activate_sticker_set(target);
 actual:=public.resolve_message_sticker(sid);
 execute 'reset role';
 select st.storage_path into expected from public.stickers st join public.message_snapshots s on s.id=sid join public.profiles p on p.id=s.recipient_id where st.set_id=target and st.state_key='state'||s.sticker_state and st.gender=case when p.gender='خانم' then 'female' else 'male' end;
 if actual is distinct from expected or actual is null then raise exception 'Active sticker not reflected'; end if;
 if (select count(*) from public.sticker_sets where active)<>1 then raise exception 'Multiple active packs'; end if;
 insert into public.sticker_sets(name,active,created_by) values('__QA_INCOMPLETE__',false,manager_id) returning id into incomplete;
 execute 'set local role authenticated';
 denied:=false;begin perform public.activate_sticker_set(incomplete);exception when raise_exception then denied:=true;end;
 if not denied or not exists(select 1 from public.sticker_sets where id=target and active) then raise exception 'Failed activation lost previous pack'; end if;
end $$;
rollback;
select 'PASS: active pack resolution, atomic failure and single active pack; rolled back' result;
