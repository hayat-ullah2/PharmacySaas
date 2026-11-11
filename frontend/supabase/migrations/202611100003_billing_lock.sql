-- =====================================================================
--  C-2: Billing lock
--  Only the super admin may change a pharmacy's status or subscription.
--  RLS still lets an owner update their own pharmacy's profile fields
--  (name, address, phone, license, tax id, currency, timezone, language,
--  logo). But status / subscription_price / subscription_expiry are
--  protected by a BEFORE UPDATE trigger that rejects the change for any
--  ordinary app user (authenticated/anon) who is not the super admin.
--
--  Allowed to change these columns:
--    - the super admin (is_super_admin() — their console suspend/edit flows)
--    - the server's service role (register / future admin API routes)
--    - database superuser roles (migrations)
--  Blocked: pharmacy owners and managers, even via a direct REST call.
--  Safe to run multiple times.
-- =====================================================================

create or replace function public.lock_pharmacy_billing()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if (
       new.status is distinct from old.status
       or new.subscription_price is distinct from old.subscription_price
       or new.subscription_expiry is distinct from old.subscription_expiry
     )
     and current_user in ('authenticated', 'anon')
     and not public.is_super_admin()
  then
    raise exception 'Only the super admin can change a pharmacy''s subscription or account status'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

drop trigger if exists lock_pharmacy_billing on public.pharmacies;
create trigger lock_pharmacy_billing
  before update on public.pharmacies
  for each row execute function public.lock_pharmacy_billing();
