create or replace function public.reorder_document_categories(p_ids bigint[])
returns void language plpgsql security definer set search_path='' as $$
begin
 if not (select private.is_manager()) then raise exception 'فقط مدیر مجاز است';end if;
 if coalesce(cardinality(p_ids),0)=0 then return;end if;
 if exists(select 1 from unnest(p_ids)x(id) where not exists(select 1 from public.document_categories c where c.id=x.id)) then raise exception 'دسته‌بندی نامعتبر است';end if;
 update public.document_categories c set sort_order=x.ord-1 from unnest(p_ids) with ordinality x(id,ord) where c.id=x.id;
end$$;
revoke all on function public.reorder_document_categories(bigint[]) from public,anon;
grant execute on function public.reorder_document_categories(bigint[]) to authenticated;

create or replace function public.set_site_assignments(p_site_id bigint,p_user_ids uuid[])
returns void language plpgsql security definer set search_path='' as $$
declare s public.site_definitions%rowtype;
begin
 if not (select private.is_manager()) then raise exception 'فقط مدیر مجاز است';end if;
 select * into s from public.site_definitions where id=p_site_id and kind='organization' for update;
 if not found then raise exception 'سایت سازمانی پیدا نشد';end if;
 if s.scope='all' then delete from public.site_assignments where site_id=s.id;return;end if;
 if exists(select 1 from unnest(coalesce(p_user_ids,'{}'::uuid[]))u where not exists(select 1 from public.profiles p where p.id=u and p.active)) then raise exception 'یکی از کاربران انتخاب‌شده معتبر نیست';end if;
 delete from public.site_assignments where site_id=s.id;
 insert into public.site_assignments(site_id,user_id) select s.id,u from(select distinct unnest(coalesce(p_user_ids,'{}'::uuid[]))u)x;
end$$;
revoke all on function public.set_site_assignments(bigint,uuid[]) from public,anon;
grant execute on function public.set_site_assignments(bigint,uuid[]) to authenticated;
