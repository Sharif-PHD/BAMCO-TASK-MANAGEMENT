create or replace function private.resolve_approval_chain(p_user_id uuid)
returns bigint language sql stable security definer set search_path='' as $$
  select coalesce(
    (select c.id from public.approval_chains c join public.approval_chain_members m on m.chain_id=c.id
     where c.active and c.superseded_by is null and m.user_id=p_user_id
     order by c.is_default asc,c.id asc limit 1),
    (select c.id from public.approval_chains c where c.active and c.superseded_by is null and c.is_default order by c.id asc limit 1)
  );
$$;

create or replace function private.route_change_request(p_request_id bigint)
returns void language plpgsql security definer set search_path='' as $$
declare r public.change_requests%rowtype; chain bigint; initial_stage smallint; event_actor uuid;
begin
 select * into r from public.change_requests where id=p_request_id for update;
 if not found then raise exception 'درخواست پیدا نشد'; end if;
 chain:=private.resolve_approval_chain(r.requested_by);
 if chain is null then update public.change_requests set approval_chain_id=null,request_status='pending',current_stage=1 where id=r.id; return; end if;
 select min(s.stage_no) into initial_stage from public.approval_chain_stages s
 where s.chain_id=chain and not (s.approval_rule='any' and exists(select 1 from public.approval_stage_approvers a where a.stage_id=s.id and a.approver_id=r.requested_by));
 if initial_stage is null then select min(s.stage_no) into initial_stage from public.approval_chain_stages s where s.chain_id=chain; end if;
 if initial_stage is null then update public.change_requests set approval_chain_id=null,request_status='pending',current_stage=1 where id=r.id; return; end if;
 update public.change_requests set approval_chain_id=chain,request_status='in_review',current_stage=initial_stage where id=r.id;
 insert into public.request_approval_steps(request_id,stage_id,approver_id)
 select r.id,s.id,a.approver_id from public.approval_chain_stages s join public.approval_stage_approvers a on a.stage_id=s.id where s.chain_id=chain on conflict do nothing;
 update public.request_approval_steps rs set decision='approved',note='عبور خودکار؛ درخواست‌دهنده تأییدکننده این مرحله است',decided_at=now()
 from public.approval_chain_stages s where rs.request_id=r.id and rs.stage_id=s.id and s.chain_id=chain and s.stage_no<initial_stage and rs.approver_id=r.requested_by;
 event_actor:=coalesce(auth.uid(),r.requested_by);
 insert into public.change_request_events(request_id,actor_id,event_type,note,snapshot)
 values(r.id,event_actor,'routed','درخواست بر اساس عضویت کاربر در زنجیره تأیید مسیریابی شد',jsonb_build_object('chain_id',chain,'current_stage',initial_stage));
end;$$;

do $$
declare v_supervisor_chain bigint;v_direct_chain bigint;v_stage bigint;v_jor uuid;v_naz uuid;v_shahab uuid;v_count int;
begin
 select id into v_jor from public.profiles where full_name='امیرحسین زارع‌جرجندی' and active limit 1;
 select id into v_naz from public.profiles where full_name='نازنین قائمی' and active limit 1;
 select id into v_shahab from public.profiles where full_name='شهاب‌الدین تنهائیان' and active limit 1;
 if v_jor is null or v_naz is null or v_shahab is null then raise exception 'مدیران زنجیره پیدا نشدند'; end if;
 select id into v_supervisor_chain from public.approval_chains where name='زنجیره تأیید واحد مهندسی' and superseded_by is null limit 1;
 if v_supervisor_chain is null then raise exception 'زنجیره سرپرست پیدا نشد'; end if;
 update public.approval_chains set active=true,is_default=false where id=v_supervisor_chain;
 delete from public.approval_chain_members where chain_id=v_supervisor_chain;
 insert into public.approval_chain_members(chain_id,user_id)
 select v_supervisor_chain,id from public.profiles where active and full_name in ('پریسا مشکی','رضا احمدی','محمد دهقان','دانیال حسین‌نژاد');
 get diagnostics v_count=row_count; if v_count<>4 then raise exception 'اعضای زنجیره جرجندی: % به جای ۴',v_count; end if;
 update public.approval_chain_stages set title='بررسی سرپرست',approval_rule='any' where chain_id=v_supervisor_chain and stage_no=1 returning id into v_stage;
 if v_stage is null then raise exception 'مرحله اول زنجیره جرجندی وجود ندارد'; end if;
 delete from public.approval_stage_approvers where stage_id=v_stage; insert into public.approval_stage_approvers values(v_stage,v_jor);
 update public.approval_chain_stages set title='تأیید مدیریت',approval_rule='any' where chain_id=v_supervisor_chain and stage_no=2 returning id into v_stage;
 if v_stage is null then raise exception 'مرحله دوم زنجیره جرجندی وجود ندارد'; end if;
 delete from public.approval_stage_approvers where stage_id=v_stage; insert into public.approval_stage_approvers values(v_stage,v_naz),(v_stage,v_shahab);
 select id into v_direct_chain from public.approval_chains where name='زنجیره مستقیم مدیریت' and superseded_by is null limit 1;
 if v_direct_chain is null then insert into public.approval_chains(name,active,is_default,created_by) values('زنجیره مستقیم مدیریت',true,true,v_naz) returning id into v_direct_chain;
 else update public.approval_chains set active=true,is_default=true where id=v_direct_chain; end if;
 update public.approval_chains set is_default=false where id<>v_direct_chain and is_default; update public.approval_chains set is_default=true where id=v_direct_chain;
 delete from public.approval_chain_members where chain_id=v_direct_chain;
 insert into public.approval_chain_members(chain_id,user_id)
 select v_direct_chain,p.id from public.profiles p where p.active and p.role='owner' and p.full_name not in ('پریسا مشکی','رضا احمدی','محمد دهقان','دانیال حسین‌نژاد');
 select id into v_stage from public.approval_chain_stages where chain_id=v_direct_chain and stage_no=1;
 if v_stage is null then insert into public.approval_chain_stages(chain_id,stage_no,title,approval_rule) values(v_direct_chain,1,'تأیید مدیریت','any') returning id into v_stage;
 else update public.approval_chain_stages set title='تأیید مدیریت',approval_rule='any' where id=v_stage; end if;
 delete from public.approval_stage_approvers where stage_id=v_stage; insert into public.approval_stage_approvers values(v_stage,v_naz),(v_stage,v_shahab);
end;$$;

do $$ declare r record;desired bigint; begin
 for r in select id,requested_by,approval_chain_id from public.change_requests where request_status in ('pending','in_review') loop
  desired:=private.resolve_approval_chain(r.requested_by);
  if r.approval_chain_id is distinct from desired then
   delete from public.request_approval_steps where request_id=r.id;
   update public.change_requests set approval_chain_id=null,request_status='pending',current_stage=1 where id=r.id;
   perform private.route_change_request(r.id);
  end if;
 end loop;
end;$$;