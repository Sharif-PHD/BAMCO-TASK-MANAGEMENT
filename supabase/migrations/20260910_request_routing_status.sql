insert into public.approval_chain_members(chain_id,user_id)
select 1,'cdd02bf1-6d6a-46ba-a1f9-e104ac52587f'::uuid
where exists(select 1 from public.approval_chains where id=1 and active)
on conflict do nothing;

create or replace function private.route_change_request(p_request_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.change_requests%rowtype;
  chain bigint;
  initial_stage smallint;
begin
  select * into r from public.change_requests where id=p_request_id for update;
  if not found then raise exception 'درخواست پیدا نشد'; end if;

  select c.id into chain
  from public.approval_chains c
  join public.approval_chain_members m on m.chain_id=c.id
  where c.active and m.user_id=r.requested_by
  order by c.id limit 1;

  if chain is null then
    select id into chain from public.approval_chains
    where active and is_default order by id limit 1;
  end if;
  if chain is null then
    update public.change_requests set request_status='pending',current_stage=1 where id=r.id;
    return;
  end if;

  select min(s.stage_no) into initial_stage
  from public.approval_chain_stages s
  where s.chain_id=chain
    and not (
      s.approval_rule='any'
      and exists(
        select 1 from public.approval_stage_approvers a
        where a.stage_id=s.id and a.approver_id=r.requested_by
      )
    );
  if initial_stage is null then
    select min(stage_no) into initial_stage
    from public.approval_chain_stages where chain_id=chain;
  end if;

  update public.change_requests
  set approval_chain_id=chain,request_status='in_review',current_stage=initial_stage
  where id=r.id;

  insert into public.request_approval_steps(request_id,stage_id,approver_id)
  select r.id,s.id,a.approver_id
  from public.approval_chain_stages s
  join public.approval_stage_approvers a on a.stage_id=s.id
  where s.chain_id=chain
  on conflict do nothing;

  update public.request_approval_steps rs
  set decision='approved',note='عبور خودکار؛ درخواست‌دهنده تأییدکننده این مرحله است',decided_at=now()
  from public.approval_chain_stages s
  where rs.request_id=r.id and rs.stage_id=s.id and s.chain_id=chain
    and s.stage_no<initial_stage and rs.approver_id=r.requested_by;

  insert into public.change_request_events(request_id,actor_id,event_type,note,snapshot)
  values(r.id,auth.uid(),'routed','درخواست وارد زنجیره تأیید شد',jsonb_build_object('chain_id',chain,'current_stage',initial_stage));
end;
$$;

create or replace function public.request_routing_status()
returns table(request_id bigint,stage_no smallint,stage_title text,approver_names text,actionable boolean)
language sql stable security definer set search_path=''
as $$
  select r.id,s.stage_no,s.title,
    string_agg(distinct p.full_name,'، ' order by p.full_name),
    coalesce(bool_or(a.approver_id=auth.uid() and coalesce(rs.decision,'pending')='pending'),false)
  from public.change_requests r
  left join public.approval_chain_stages s on s.chain_id=r.approval_chain_id and s.stage_no=r.current_stage
  left join public.approval_stage_approvers a on a.stage_id=s.id
  left join public.request_approval_steps rs on rs.request_id=r.id and rs.stage_id=s.id and rs.approver_id=a.approver_id
  left join public.profiles p on p.id=a.approver_id
  where auth.uid() is not null
    and r.request_status in ('pending','in_review','needs_revision')
    and (r.requested_by=auth.uid() or exists(select 1 from public.profiles me where me.id=auth.uid() and me.active and me.role='manager'))
  group by r.id,s.stage_no,s.title
  order by r.id;
$$;

revoke all on function public.request_routing_status() from public,anon;
grant execute on function public.request_routing_status() to authenticated;
