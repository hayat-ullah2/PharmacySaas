-- =====================================================================
--  delete_medicine: remove a medicine together with its stock footprint so no
--  orphaned batches/adjustments linger in Batch Management or Inventory.
--  Deletes, atomically: the medicine's batches, its stock adjustments, and the
--  medicine record itself. Historical transactions (sales / purchases) are
--  intentionally kept — they store their own medicineName and must survive for
--  reporting. Admin-only. Safe to re-run.
-- =====================================================================

create or replace function public.delete_medicine(p_medicine_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  pharmacy uuid := public.current_pharmacy_id();
begin
  if pharmacy is null or public.current_profile_role() <> 'admin' then
    raise exception 'Only an active pharmacy owner can delete medicines';
  end if;

  delete from public.pharmacy_records
  where pharmacy_id = pharmacy and entity = 'batches' and data ->> 'medicineId' = p_medicine_id;

  delete from public.pharmacy_records
  where pharmacy_id = pharmacy and entity = 'adjustments' and data ->> 'medicineId' = p_medicine_id;

  delete from public.pharmacy_records
  where pharmacy_id = pharmacy and entity = 'medicines' and record_id = p_medicine_id;
end;
$$;

revoke all on function public.delete_medicine(text) from public;
grant execute on function public.delete_medicine(text) to authenticated;
