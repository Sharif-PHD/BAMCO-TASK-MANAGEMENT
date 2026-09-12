-- Welcome stickers are shared presentation assets for every active authenticated account.
-- Mutation remains manager-only via the existing ALL policies.
drop policy if exists sticker_sets_read_authenticated on public.sticker_sets;
create policy sticker_sets_read_authenticated
on public.sticker_sets
for select
to authenticated
using ((select private.has_account()) and active = true);

drop policy if exists stickers_read_authenticated on public.stickers;
create policy stickers_read_authenticated
on public.stickers
for select
to authenticated
using (
  (select private.has_account())
  and exists (
    select 1 from public.sticker_sets s
    where s.id = stickers.set_id and s.active = true
  )
);
