-- =====================================================================
--  Super Admin flow
--  - Pharmacies gain a status (active/suspended) and a logo URL.
--  - A super admin is identified by app_metadata.role = 'super_admin'
--    (set only via the service role; users cannot change their own app_metadata).
--  - Tenant scope now also requires the pharmacy to be active, so suspending
--    a pharmacy immediately cuts off its owner/managers at the RLS layer.
--  Safe to run multiple times.
-- =====================================================================

alter table public.pharmacies
  add column if not exists status text not null default 'active'
    check (status in ('active', 'suspended'));
alter table public.pharmacies
  add column if not exists logo_url text not null default '';

create or replace function public.is_super_admin()
returns boolean
language sql
stable
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin', false)
$$;

revoke all on function public.is_super_admin() from public;
grant execute on function public.is_super_admin() to authenticated;

-- Tenant scope: a member only resolves to their pharmacy while BOTH the profile
-- and the pharmacy are active. Suspended pharmacy => current_pharmacy_id() is null
-- => every tenant-scoped RLS check fails for that pharmacy's users.
create or replace function public.current_pharmacy_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.pharmacy_id
  from public.profiles as p
  join public.pharmacies as ph on ph.id = p.pharmacy_id
  where p.id = auth.uid()
    and p.status = 'active'
    and ph.status = 'active'
$$;

-- Pharmacies: members read their own; the super admin reads all.
drop policy if exists "Members can read their pharmacy" on public.pharmacies;
create policy "Members can read their pharmacy"
  on public.pharmacies for select to authenticated
  using (id = public.current_pharmacy_id() or public.is_super_admin());

-- Pharmacies: the super admin can update any row (suspend / reactivate / logo).
drop policy if exists "Super admin manages pharmacies" on public.pharmacies;
create policy "Super admin manages pharmacies"
  on public.pharmacies for update to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- Profiles: the super admin can read all profiles (to list each pharmacy's owner).
drop policy if exists "Members can read permitted profiles" on public.profiles;
create policy "Members can read permitted profiles"
  on public.profiles for select to authenticated
  using (
    id = auth.uid()
    or (
      pharmacy_id = public.current_pharmacy_id()
      and public.current_profile_role() = 'admin'
    )
    or public.is_super_admin()
  );
