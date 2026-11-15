-- =====================================================================
--  Multi-unit Add Batch — connects Batch Management to packaging.
--  add_batch now accepts a purchase "unit" (Box/Strip/base) + quantity in that
--  unit and converts to BASE units using the medicine's packaging:
--      base_qty = quantity * factor           (factor from packUnits; base = 1)
--  Stock and the batch are stored in base units (so medicine.stock stays equal
--  to Σ batch.remaining and FEFO/POS keep working). The purchase price is taken
--  per purchase unit and stored per-base (price / factor). Also records
--  supplier + the original purchase unit/qty on the batch, and BLOCKS adding an
--  already-expired batch. Signature unchanged (jsonb). Safe to re-run.
-- =====================================================================

create or replace function public.add_batch(p_batch jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  pharmacy uuid := public.current_pharmacy_id();
  medicine_id text := p_batch ->> 'medicineId';
  unit_name text := nullif(p_batch ->> 'unit', '');
  qty integer := coalesce((p_batch ->> 'quantity')::integer, 0);
  factor integer;
  base_qty integer;
  expiry date := (p_batch ->> 'expiryDate')::date;
  batch_id text := coalesce(nullif(p_batch ->> 'id', ''), gen_random_uuid()::text);
  medicine jsonb;
  new_stock integer;
  med_expiry date;
  batch_status text;
  purchase_price numeric;
  selling_price numeric;
begin
  if pharmacy is null or public.current_profile_role() <> 'admin' then
    raise exception 'Only an active pharmacy owner can add stock';
  end if;
  if medicine_id is null or qty <= 0 or expiry is null then
    raise exception 'A medicine, a positive quantity, and an expiry date are required';
  end if;
  if expiry < current_date then
    raise exception 'Cannot add a batch that is already expired (expiry %)', expiry;
  end if;

  select data into medicine
  from public.pharmacy_records
  where pharmacy_id = pharmacy and entity = 'medicines' and record_id = medicine_id
  for update;
  if not found then
    raise exception 'The selected medicine was not found';
  end if;

  -- Resolve the purchase unit -> base-units-per-pack.
  if unit_name is null or unit_name = medicine ->> 'unit' then
    factor := 1;
  else
    select (p ->> 'factor')::integer into factor
    from jsonb_array_elements(coalesce(medicine -> 'packUnits', '[]'::jsonb)) as p
    where p ->> 'name' = unit_name
    limit 1;
    if factor is null then
      raise exception 'Unit "%" is not configured for %', unit_name, medicine ->> 'name';
    end if;
  end if;
  if factor < 1 then factor := 1; end if;

  base_qty := qty * factor;
  new_stock := coalesce((medicine ->> 'stock')::integer, 0) + base_qty;
  med_expiry := nullif(medicine ->> 'expiry', '')::date;
  batch_status := case
    when expiry < current_date then 'expired'
    when expiry <= current_date + 90 then 'expiring'
    else 'healthy'
  end;

  -- Purchase price entered per purchase unit -> store per base unit.
  if nullif(p_batch ->> 'purchasePrice', '') is not null then
    purchase_price := round((p_batch ->> 'purchasePrice')::numeric / factor, 4);
  else
    purchase_price := coalesce((medicine ->> 'purchasePrice')::numeric, 0);
  end if;
  selling_price := coalesce((p_batch ->> 'sellingPrice')::numeric, (medicine ->> 'sellingPrice')::numeric, 0);

  insert into public.pharmacy_records (pharmacy_id, entity, record_id, data)
  values (pharmacy, 'batches', batch_id, jsonb_build_object(
    'id', batch_id,
    'medicineId', medicine_id,
    'medicineName', concat_ws(' ', medicine ->> 'name', medicine ->> 'strength'),
    'batchNumber', coalesce(nullif(p_batch ->> 'batchNumber', ''), 'BATCH-' || upper(right(replace(batch_id, '-', ''), 8))),
    'supplier', nullif(p_batch ->> 'supplier', ''),
    'purchaseUnit', coalesce(unit_name, medicine ->> 'unit'),
    'purchaseQty', qty,
    'purchaseDate', coalesce(nullif(p_batch ->> 'purchaseDate', ''), current_date::text),
    'expiryDate', expiry::text,
    'purchasePrice', purchase_price,
    'sellingPrice', selling_price,
    'quantity', base_qty,
    'remaining', base_qty,
    'status', batch_status
  ));

  update public.pharmacy_records
  set data = jsonb_set(
        jsonb_set(data, '{stock}', to_jsonb(new_stock), true),
        '{status}',
        to_jsonb(case
          when med_expiry is not null and med_expiry < current_date then 'expired'
          when new_stock = 0 then 'out'
          when med_expiry is not null and med_expiry <= current_date + 90 then 'expiring'
          when new_stock <= coalesce((medicine ->> 'reorderLevel')::integer, 0) then 'low'
          else 'healthy'
        end),
        true
      ),
      updated_at = now()
  where pharmacy_id = pharmacy and entity = 'medicines' and record_id = medicine_id;
end;
$$;

revoke all on function public.add_batch(jsonb) from public;
grant execute on function public.add_batch(jsonb) to authenticated;
