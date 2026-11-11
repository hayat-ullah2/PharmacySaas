-- =====================================================================
--  C-3: Sale returns restock by medicineId + block duplicate medicines
--  1) record_sale_return matches each sold item by its medicineId (exact),
--     falling back to the stored name ONLY for legacy sales that predate the
--     id being recorded. If an item cannot be matched, the whole return is
--     ABORTED (raise) — the customer is never marked refunded without the
--     stock being restored.
--  2) create_medicine rejects a second medicine with the same name+strength
--     (case-insensitive) in the same pharmacy.
--  Both are create-or-replace; no data is changed. Safe to run multiple times.
-- =====================================================================

create or replace function public.record_sale_return(p_sale_id text, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  pharmacy uuid := public.current_pharmacy_id();
  caller_role text := public.current_profile_role();
  sale jsonb;
  item jsonb;
  medicine_rec record;
  qty integer;
  new_stock integer;
  med_expiry date;
  batch_id text;
  return_id text := gen_random_uuid()::text;
  item_medicine_id text;
  composed text;
begin
  if pharmacy is null or caller_role not in ('admin', 'manager') then
    raise exception 'You are not allowed to process returns';
  end if;

  select data into sale
  from public.pharmacy_records
  where pharmacy_id = pharmacy and entity = 'sales' and record_id = p_sale_id
  for update;
  if not found then
    raise exception 'The sale was not found';
  end if;
  if sale ->> 'status' = 'refunded' then
    raise exception 'This sale has already been refunded';
  end if;

  for item in select value from jsonb_array_elements(coalesce(sale -> 'items', '[]'::jsonb))
  loop
    qty := coalesce((item ->> 'quantity')::integer, 0);
    if qty <= 0 then
      continue;  -- a zero-quantity line has nothing to restock
    end if;

    item_medicine_id := nullif(item ->> 'medicineId', '');

    if item_medicine_id is not null then
      -- Preferred path: restock the EXACT medicine that was sold.
      select r.record_id, r.data into medicine_rec
      from public.pharmacy_records as r
      where r.pharmacy_id = pharmacy and r.entity = 'medicines'
        and r.record_id = item_medicine_id
      for update;
    else
      -- Legacy sale (recorded before medicineId was stored): match by name.
      select r.record_id, r.data into medicine_rec
      from public.pharmacy_records as r
      where r.pharmacy_id = pharmacy and r.entity = 'medicines'
        and concat_ws(' ', r.data ->> 'name', r.data ->> 'strength') = (item ->> 'medicineName')
      limit 1
      for update;
    end if;

    if not found then
      -- Fail loudly: aborting rolls back everything, so no refund is recorded
      -- and no stock is left out of sync.
      raise exception 'Cannot restock "%" — the medicine no longer exists. Return cancelled; no refund was recorded.',
        coalesce(item_medicine_id, item ->> 'medicineName', 'unknown item');
    end if;

    composed := concat_ws(' ', medicine_rec.data ->> 'name', medicine_rec.data ->> 'strength');
    new_stock := coalesce((medicine_rec.data ->> 'stock')::integer, 0) + qty;
    med_expiry := nullif(medicine_rec.data ->> 'expiry', '')::date;
    batch_id := gen_random_uuid()::text;

    insert into public.pharmacy_records (pharmacy_id, entity, record_id, data)
    values (pharmacy, 'batches', batch_id, jsonb_build_object(
      'id', batch_id,
      'medicineId', medicine_rec.record_id,
      'medicineName', composed,
      'batchNumber', 'RET-' || upper(right(replace(batch_id, '-', ''), 8)),
      'purchaseDate', current_date::text,
      'expiryDate', coalesce(med_expiry, current_date + 365)::text,
      'purchasePrice', coalesce((medicine_rec.data ->> 'purchasePrice')::numeric, 0),
      'sellingPrice', coalesce((medicine_rec.data ->> 'sellingPrice')::numeric, 0),
      'quantity', qty,
      'remaining', qty,
      'status', case when coalesce(med_expiry, current_date + 365) <= current_date + 90 then 'expiring' else 'healthy' end
    ));

    update public.pharmacy_records
    set data = jsonb_set(
          jsonb_set(data, '{stock}', to_jsonb(new_stock), true),
          '{status}',
          to_jsonb(case
            when med_expiry is not null and med_expiry < current_date then 'expired'
            when med_expiry is not null and med_expiry <= current_date + 90 then 'expiring'
            when new_stock <= coalesce((medicine_rec.data ->> 'reorderLevel')::integer, 0) then 'low'
            else 'healthy'
          end),
          true
        ),
        updated_at = now()
    where pharmacy_id = pharmacy and entity = 'medicines' and record_id = medicine_rec.record_id;
  end loop;

  update public.pharmacy_records
  set data = jsonb_set(data, '{status}', '"refunded"'::jsonb, true), updated_at = now()
  where pharmacy_id = pharmacy and entity = 'sales' and record_id = p_sale_id;

  insert into public.pharmacy_records (pharmacy_id, entity, record_id, data)
  values (pharmacy, 'sales_returns', return_id, jsonb_build_object(
    'id', return_id,
    'invoice', sale ->> 'invoice',
    'customer', sale ->> 'customer',
    'reason', coalesce(nullif(p_reason, ''), 'Customer return'),
    'amount', coalesce((sale ->> 'total')::numeric, 0),
    'status', 'approved',
    'date', current_date::text
  ));
end;
$$;

revoke all on function public.record_sale_return(text, text) from public;
grant execute on function public.record_sale_return(text, text) to authenticated;

-- ---------------------------------------------------------------------
--  create_medicine: same as before + a duplicate (name+strength) guard.
-- ---------------------------------------------------------------------
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
    jsonb_set(p_medicine, '{status}', to_jsonb(medicine_status), true)
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
        'batchNumber', 'OPENING-' || upper(right(replace(medicine_id, '-', ''), 8)),
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
