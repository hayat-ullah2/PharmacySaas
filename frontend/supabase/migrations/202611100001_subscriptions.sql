-- =====================================================================
--  Subscriptions
--  - Each pharmacy gets a custom price (set manually by the super admin),
--    a start date, and an optional expiry.
--  - The super admin sets these when registering a pharmacy (and may edit
--    them later). Only the super admin can change them — the existing
--    "Super admin manages pharmacies" update policy + service role cover it.
--  - An EXPIRED subscription cuts off tenant access automatically at the
--    RLS layer, using the exact same mechanism as suspension — no cron job.
--    (expiry < today  =>  current_pharmacy_id() returns null  =>  every
--    tenant-scoped RLS check fails for that pharmacy's owner and managers.)
--  Safe to run multiple times.
-- =====================================================================

-- A custom per-pharmacy price replaces the earlier fixed-plan tier.
alter table public.pharmacies
  drop column if exists subscription_plan;

alter table public.pharmacies
  add column if not exists subscription_price numeric(12, 2) not null default 0
    check (subscription_price >= 0);
alter table public.pharmacies
  add column if not exists subscription_start date not null default current_date;
alter table public.pharmacies
  add column if not exists subscription_expiry date;

-- Tenant scope: a member only resolves to their pharmacy while the profile
-- is active, the pharmacy is active (not suspended), AND the subscription is
-- unexpired. A null expiry means "no expiry / unlimited".
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
    and (ph.subscription_expiry is null or ph.subscription_expiry >= current_date)
$$;
