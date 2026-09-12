-- Root repair for approval authority, stage routing and current/history synchronization.

-- If the workspace has exactly one active current chain and no default chain,
-- make that chain the fallback for owners who are not explicit members.
do $$
declare
  v_active_count integer;
  v_default_count integer;
  v_chain_id bigint;
begin
  select count(*), min(id)
    into v_active_count, v_chain_id
  from public.approval_chains
  where active and superseded_by is null;

  select count(*)
    into v_default_count
  from public.approval_chains
  where active and superseded_by is null and is_default;

  if v_default_count = 0 and v_active_count = 1 then
    update public.approval_chains
       set is_default = true
     where id = v_chain_id;
  end if;
end $$;

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
  event_actor uuid;
begin
  select * into r
  from public.change_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'درخواست پیدا نشد';
  end if;

  -- First prefer an explicit chain membership for the requester.
  select c.id into chain
  from public.approval_chains c
  join public.approval_chain_members m on m.chain_id = c.id
  where c.active
    and c.superseded_by is null
    and m.user_id = r.requested_by
  order by c.id
  limit 1;

  -- Owners without explicit membership use the configured default chain.
  if chain is null then
    select c.id into chain
    from public.approval_chains c
    where c.active
      and c.superseded_by is null
      and c.is_default
    order by c.id
    limit 1;
  end if;

  -- Keep a manager fallback instead of creating an unreviewable request.
  if chain is null then
    update public.change_requests
       set approval_chain_id = null,
           request_status = 'pending',
           current_stage = 1
     where id = r.id;
    return;
  end if;

  select min(s.stage_no) into initial_stage
  from public.approval_chain_stages s
  where s.chain_id = chain
    and not (
      s.approval_rule = 'any'
      and exists (
        select 1
        from public.approval_stage_approvers a
        where a.stage_id = s.id
          and a.approver_id = r.requested_by
      )
    );

  if initial_stage is null then
    select min(s.stage_no) into initial_stage
    from public.approval_chain_stages s
    where s.chain_id = chain;
  end if;

  -- A malformed chain with no stages must never deadlock requests.
  if initial_stage is null then
    update public.change_requests
       set approval_chain_id = null,
           request_status = 'pending',
           current_stage = 1
     where id = r.id;
    return;
  end if;

  update public.change_requests
     set approval_chain_id = chain,
         request_status = 'in_review',
         current_stage = initial_stage
   where id = r.id;

  insert into public.request_approval_steps(request_id, stage_id, approver_id)
  select r.id, s.id, a.approver_id
  from public.approval_chain_stages s
  join public.approval_stage_approvers a on a.stage_id = s.id
  where s.chain_id = chain
  on conflict do nothing;

  update public.request_approval_steps rs
     set decision = 'approved',
         note = 'عبور خودکار؛ درخواست‌دهنده تأییدکننده این مرحله است',
         decided_at = now()
    from public.approval_chain_stages s
   where rs.request_id = r.id
     and rs.stage_id = s.id
     and s.chain_id = chain
     and s.stage_no < initial_stage
     and rs.approver_id = r.requested_by;

  event_actor := coalesce(auth.uid(), r.requested_by);
  insert into public.change_request_events(request_id, actor_id, event_type, note, snapshot)
  values(
    r.id,
    event_actor,
    'routed',
    'درخواست وارد زنجیره تأیید شد',
    jsonb_build_object('chain_id', chain, 'current_stage', initial_stage)
  );
end;
$$;

-- Review is authoritative at the current stage. Manager edits are persisted into
-- proposed_data immediately, so an edit at stage 1 is exactly what stage 2 sees.
create or replace function public.review_request_stage(
  p_request_id bigint,
  p_decision text,
  p_note text default null,
  p_final_data jsonb default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.change_requests%rowtype;
  step public.request_approval_steps%rowtype;
  stage public.approval_chain_stages%rowtype;
  satisfied boolean;
  next_stage smallint;
  payload jsonb;
  event_type text;
begin
  if p_decision not in ('approved', 'rejected', 'needs_revision') then
    raise exception 'تصمیم نامعتبر است';
  end if;

  select * into r
  from public.change_requests
  where id = p_request_id
    and request_status in ('pending', 'in_review')
  for update;

  if not found then
    raise exception 'درخواست باز پیدا نشد';
  end if;

  payload := coalesce(p_final_data, r.proposed_data);
  event_type := case
    when p_decision = 'approved' and p_final_data is not null then 'corrected_and_approved'
    else p_decision
  end;

  -- Safety fallback for legacy/misconfigured chainless requests.
  if r.approval_chain_id is null then
    if not (select private.is_manager()) then
      raise exception 'دسترسی بررسی ندارید';
    end if;

    if p_decision = 'approved' and p_final_data is not null then
      update public.change_requests
         set proposed_data = p_final_data,
             manager_note = coalesce(p_note, manager_note)
       where id = r.id;
    elsif p_note is not null then
      update public.change_requests
         set manager_note = p_note
       where id = r.id;
    end if;

    insert into public.change_request_events(request_id, actor_id, event_type, note, snapshot)
    values(r.id, auth.uid(), event_type, p_note, payload);

    if p_decision = 'approved' then
      perform private.apply_change_request(r.id, auth.uid(), payload);
    else
      update public.change_requests
         set request_status = p_decision,
             manager_note = p_note,
             reviewed_by = auth.uid(),
             reviewed_at = now(),
             completed_at = case when p_decision = 'rejected' then now() else null end
       where id = r.id;
    end if;
    return p_decision;
  end if;

  select rs.* into step
  from public.request_approval_steps rs
  join public.approval_chain_stages s on s.id = rs.stage_id
  where rs.request_id = r.id
    and s.stage_no = r.current_stage
    and rs.approver_id = auth.uid()
    and coalesce(rs.decision, 'pending') = 'pending'
  for update;

  if not found then
    raise exception 'این مرحله به شما تخصیص داده نشده است';
  end if;

  update public.request_approval_steps
     set decision = p_decision,
         note = p_note,
         decided_at = now()
   where id = step.id;

  if p_decision = 'approved' then
    update public.change_requests
       set proposed_data = payload,
           manager_note = coalesce(p_note, manager_note)
     where id = r.id;
  end if;

  insert into public.change_request_events(request_id, actor_id, event_type, note, snapshot)
  values(r.id, auth.uid(), event_type, p_note, payload);

  if p_decision = 'rejected' then
    update public.change_requests
       set request_status = 'rejected',
           manager_note = p_note,
           reviewed_by = auth.uid(),
           reviewed_at = now(),
           completed_at = now()
     where id = r.id;
    return 'rejected';
  end if;

  if p_decision = 'needs_revision' then
    update public.change_requests
       set request_status = 'needs_revision',
           manager_note = p_note,
           reviewed_by = auth.uid(),
           reviewed_at = now()
     where id = r.id;
    return 'needs_revision';
  end if;

  select * into stage
  from public.approval_chain_stages
  where id = step.stage_id;

  select case
    when stage.approval_rule = 'all' then bool_and(decision = 'approved')
    else bool_or(decision = 'approved')
  end into satisfied
  from public.request_approval_steps
  where request_id = r.id
    and stage_id = stage.id;

  if not satisfied then
    return 'waiting_stage';
  end if;

  select min(stage_no) into next_stage
  from public.approval_chain_stages
  where chain_id = r.approval_chain_id
    and stage_no > r.current_stage;

  if next_stage is not null then
    update public.change_requests
       set current_stage = next_stage
     where id = r.id;
    return 'next_stage';
  end if;

  perform private.apply_change_request(r.id, auth.uid(), payload);
  return 'approved';
end;
$$;

-- Routing status is now the user's actual work queue. Managers only receive
-- requests for their current stage (plus the chainless safety fallback).
create or replace function public.request_routing_status()
returns table(
  request_id bigint,
  stage_no smallint,
  stage_title text,
  approver_names text,
  actionable boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    r.id,
    s.stage_no,
    s.title,
    string_agg(distinct p.full_name, '، ' order by p.full_name),
    (
      (r.approval_chain_id is null and r.request_status = 'pending' and (select private.is_manager()))
      or coalesce(bool_or(
        a.approver_id = auth.uid()
        and coalesce(rs.decision, 'pending') = 'pending'
      ), false)
    ) as actionable
  from public.change_requests r
  left join public.approval_chain_stages s
    on s.chain_id = r.approval_chain_id
   and s.stage_no = r.current_stage
  left join public.approval_stage_approvers a on a.stage_id = s.id
  left join public.request_approval_steps rs
    on rs.request_id = r.id
   and rs.stage_id = s.id
   and rs.approver_id = a.approver_id
  left join public.profiles p on p.id = a.approver_id
  where auth.uid() is not null
    and r.request_status in ('pending', 'in_review', 'needs_revision')
    and (
      (
        not (select private.is_manager())
        and r.requested_by = auth.uid()
      )
      or (
        (select private.is_manager())
        and r.request_status in ('pending', 'in_review')
        and (
          r.approval_chain_id is null
          or exists (
            select 1
            from public.request_approval_steps mine
            join public.approval_chain_stages ms on ms.id = mine.stage_id
            where mine.request_id = r.id
              and ms.stage_no = r.current_stage
              and mine.approver_id = auth.uid()
              and coalesce(mine.decision, 'pending') = 'pending'
          )
        )
      )
    )
  group by r.id, s.stage_no, s.title, r.approval_chain_id, r.request_status
  order by r.id;
$$;

-- Current queue, terminal history and route metadata are returned from one
-- database snapshot, eliminating the race between separate frontend requests.
create or replace function public.request_workflow_snapshot()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_manager boolean;
  v_current jsonb;
  v_history jsonb;
  v_routes jsonb;
begin
  if v_uid is null then
    raise exception 'ورود به سامانه الزامی است';
  end if;

  v_manager := (select private.is_manager());

  select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at asc), '[]'::jsonb)
    into v_current
  from public.change_requests r
  where r.request_status in ('pending', 'in_review', 'needs_revision')
    and (
      (
        not v_manager
        and r.requested_by = v_uid
      )
      or (
        v_manager
        and r.request_status in ('pending', 'in_review')
        and (
          r.approval_chain_id is null
          or exists (
            select 1
            from public.request_approval_steps mine
            join public.approval_chain_stages ms on ms.id = mine.stage_id
            where mine.request_id = r.id
              and ms.stage_no = r.current_stage
              and mine.approver_id = v_uid
              and coalesce(mine.decision, 'pending') = 'pending'
          )
        )
      )
    );

  select coalesce(
    jsonb_agg(to_jsonb(r) order by coalesce(r.reviewed_at, r.completed_at, r.created_at) desc),
    '[]'::jsonb
  )
    into v_history
  from public.change_requests r
  where r.request_status in ('approved', 'rejected', 'cancelled')
    and (v_manager or r.requested_by = v_uid);

  select coalesce(jsonb_agg(to_jsonb(x) order by x.request_id), '[]'::jsonb)
    into v_routes
  from public.request_routing_status() x;

  return jsonb_build_object(
    'current_requests', v_current,
    'history_requests', v_history,
    'routes', v_routes
  );
end;
$$;

revoke all on function public.review_request_stage(bigint,text,text,jsonb) from public, anon;
grant execute on function public.review_request_stage(bigint,text,text,jsonb) to authenticated;
revoke all on function public.request_routing_status() from public, anon;
grant execute on function public.request_routing_status() to authenticated;
revoke all on function public.request_workflow_snapshot() from public, anon;
grant execute on function public.request_workflow_snapshot() to authenticated;

-- Repair already-open requests that were stranded because no default chain was
-- configured. New requests are routed correctly by the same function.
do $$
declare
  rec record;
begin
  for rec in
    select id
    from public.change_requests
    where request_status = 'pending'
      and approval_chain_id is null
    order by id
  loop
    perform private.route_change_request(rec.id);
  end loop;
end $$;
