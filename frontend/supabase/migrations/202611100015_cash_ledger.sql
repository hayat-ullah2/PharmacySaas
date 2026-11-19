-- =====================================================================
--  Cash Ledger / Khata — cashier cash accountability.
--  record_cash_deposit: a cashier (manager) records handing over / depositing
--  cash. The entry is stamped with the cashier (auth.uid) + name + pharmacy, so
--  it's visible to that cashier and the owner (same-pharmacy RLS) and tenant-
--  isolated. "Collected" is derived from the cashier's cash sales; this records
--  the "deposited" side for reconciliation. Admin reconciles collected vs
--  deposited per cashier. Safe to re-run.
-- =====================================================================

create or replace function public.record_cash_deposit(p_amount numeric, p_note text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  pharmacy uuid := public.current_pharmacy_id();
  entry_id text := gen_random_uuid()::text;
  cashier text := auth.uid()::text;
  cashier_name text;
begin
  if pharmacy is null or public.current_profile_role() <> 'manager' then
    raise exception 'Only a cashier (manager) can record a cash deposit';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Deposit amount must be greater than 0';
  end if;

  select name into cashier_name from public.profiles where id = auth.uid();

  insert into public.pharmacy_records (pharmacy_id, entity, record_id, data)
  values (pharmacy, 'cash_ledger', entry_id, jsonb_build_object(
    'id', entry_id,
    'cashierId', cashier,
    'cashierName', coalesce(cashier_name, 'Cashier'),
    'amount', round(p_amount, 2),
    'note', nullif(trim(coalesce(p_note, '')), ''),
    'type', 'deposit',
    'date', current_date::text,
    'createdAt', now()::text
  ));

  return jsonb_build_object('id', entry_id, 'amount', round(p_amount, 2));
end;
$$;

revoke all on function public.record_cash_deposit(numeric, text) from public;
grant execute on function public.record_cash_deposit(numeric, text) to authenticated;
