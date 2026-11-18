-- =====================================================================
--  create_medicine: carry MRP + default Supplier, and let the owner set the
--  opening stock's Batch Number (instead of only the auto 'OPENING-xxxx').
--   - `openingBatchNumber` (optional) → the opening batch's batchNumber; it is
--     stripped from the stored medicine blob (batch-only field).
--   - `supplier` (optional) is kept on the medicine AND stamped on the opening
--     batch for stock-origin traceability.
--   - `mrp` (optional) must be >= 0.
--  All prior guards unchanged (name/strength, non-negative, selling>0, expiry,
--  duplicate name+strength, admin-only, tenant). Safe to re-run.
-- =====================================================================

create or replace function public.create_medicine(p_medicine jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  pharmacy uuid := public.current_pharmacy_id();
  medicine_id text := p_medicine ->> 'id';
  stock_count integer := coalesce((p_medicine ->> 'stock')::integer, 0);
  reorder_count integer := coalesce((p_medicine ->> 'reorderLevel')::integer, 0);
  expiry_date date := (p_medicine ->> 'expiry')::date;
  opening_batch text := nullif(trim(p_medicine ->> 'openingBatchNumber'), '');
  supplier_name text := nullif(trim(p_medicine ->> 'supplier'), '');
  medicine_data jsonb := p_medicine - 'openingBatchNumber'; -- batch-only field, don't persist on the medicine
  batch_status text;
  batch_id uuid := gen_random_uuid();
  medicine_status text;
begin
  if pharmacy is null or public.current_profile_role() <> 'admin' then
    raise exception 'Only an active pharmacy owner can create medicines';
  end if;
  if medicine_id is null
    or nullif(trim(p_medicine ->> 'name'), '') is null
    or nullif(trim(p_medicine ->> 'genericName'), '') is null
    or stock_count < 0
    or reorder_count < 0
    or coalesce((p_medicine ->> 'sellingPrice')::numeric, 0) <= 0
    or coalesce((p_medicine ->> 'purchasePrice')::numeric, 0) < 0
    or coalesce((p_medicine ->> 'mrp')::numeric, 0) < 0
    or expiry_date is null then
    raise exception 'Medicine details are incomplete or invalid';
  end if;

  -- C-3: no two medicines with the same name + strength in one pharmacy.
  if exists (
    select 1 from public.pharmacy_records as r
    where r.pharmacy_id = pharmacy and r.entity = 'medicines'
      and lower(trim(r.data ->> 'name')) = lower(trim(p_medicine ->> 'name'))
      and lower(trim(coalesce(r.data ->> 'strength', ''))) = lower(trim(coalesce(p_medicine ->> 'strength', '')))
  ) then
    raise exception 'A medicine named "%" already exists in this pharmacy',
      trim(concat_ws(' ', p_medicine ->> 'name', p_medicine ->> 'strength'))
      using errcode = 'unique_violation';
  end if;

  medicine_status := case
    when expiry_date < current_date then 'expired'
    when stock_count = 0 then 'out'
    when expiry_date <= current_date + 90 then 'expiring'
    when stock_count <= reorder_count then 'low'
    else 'healthy'
  end;
  insert into public.pharmacy_records (pharmacy_id, entity, record_id, data)
  values (
    pharmacy,
    'medicines',
    medicine_id,
    jsonb_set(medicine_data, '{status}', to_jsonb(medicine_status), true)
  );

  if stock_count > 0 then
    batch_status := case
      when expiry_date < current_date then 'expired'
      when expiry_date <= current_date + 90 then 'expiring'
      else 'healthy'
    end;
    insert into public.pharmacy_records (pharmacy_id, entity, record_id, data)
    values (
      pharmacy,
      'batches',
      batch_id::text,
      jsonb_build_object(
        'id', batch_id::text,
        'medicineId', medicine_id,
        'medicineName', concat_ws(' ', p_medicine ->> 'name', p_medicine ->> 'strength'),
        'batchNumber', coalesce(opening_batch, 'OPENING-' || upper(right(replace(medicine_id, '-', ''), 8))),
        'supplier', supplier_name,
        'purchaseDate', current_date::text,
        'expiryDate', expiry_date::text,
        'purchasePrice', (p_medicine ->> 'purchasePrice')::numeric,
        'sellingPrice', (p_medicine ->> 'sellingPrice')::numeric,
        'quantity', stock_count,
        'remaining', stock_count,
        'status', batch_status
      )
    );
  end if;
end;
$$;

revoke all on function public.create_medicine(jsonb) from public;
grant execute on function public.create_medicine(jsonb) to authenticated;
