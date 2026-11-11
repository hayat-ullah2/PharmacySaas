-- =====================================================================
--  Stock operations (transactional, admin-only)
--  - add_batch:    restock a medicine by adding a batch; bumps medicine.stock
--  - adjust_stock: correct a medicine's stock; reconciles batches (FEFO down,
--                  adjustment batch up) and records the adjustment
--  Both keep medicine.stock == sum(batch.remaining) so complete_sale's FEFO
--  deduction stays consistent. Safe to run multiple times.
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
  qty integer := coalesce((p_batch ->> 'quantity')::integer, 0);
  expiry date := (p_batch ->> 'expiryDate')::date;
  batch_id text := coalesce(nullif(p_batch ->> 'id', ''), gen_random_uuid()::text);
  medicine jsonb;
  new_stock integer;
  med_expiry date;
  batch_status text;
begin
  if pharmacy is null or public.current_profile_role() <> 'admin' then
    raise exception 'Only an active pharmacy owner can add stock';
  end if;
  if medicine_id is null or qty <= 0 or expiry is null then
    raise exception 'A medicine, a positive quantity, and an expiry date are required';
  end if;

  select data into medicine
  from public.pharmacy_records
  where pharmacy_id = pharmacy and entity = 'medicines' and record_id = medicine_id
  for update;
  if not found then
    raise exception 'The selected medicine was not found';
  end if;

  new_stock := coalesce((medicine ->> 'stock')::integer, 0) + qty;
  med_expiry := nullif(medicine ->> 'expiry', '')::date;
  batch_status := case
    when expiry < current_date then 'expired'
    when expiry <= current_date + 90 then 'expiring'
    else 'healthy'
  end;

  insert into public.pharmacy_records (pharmacy_id, entity, record_id, data)
  values (pharmacy, 'batches', batch_id, jsonb_build_object(
    'id', batch_id,
    'medicineId', medicine_id,
    'medicineName', concat_ws(' ', medicine ->> 'name', medicine ->> 'strength'),
    'batchNumber', coalesce(nullif(p_batch ->> 'batchNumber', ''), 'BATCH-' || upper(right(replace(batch_id, '-', ''), 8))),
    'purchaseDate', coalesce(nullif(p_batch ->> 'purchaseDate', ''), current_date::text),
    'expiryDate', expiry::text,
    'purchasePrice', coalesce((p_batch ->> 'purchasePrice')::numeric, (medicine ->> 'purchasePrice')::numeric, 0),
    'sellingPrice', coalesce((p_batch ->> 'sellingPrice')::numeric, (medicine ->> 'sellingPrice')::numeric, 0),
    'quantity', qty,
    'remaining', qty,
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

create or replace function public.adjust_stock(p_medicine_id text, p_new_stock integer, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  pharmacy uuid := public.current_pharmacy_id();
  medicine jsonb;
  old_stock integer;
  delta integer;
  adj_id text := gen_random_uuid()::text;
  med_expiry date;
  batch_row record;
  reduce_left integer;
  take integer;
  batch_remaining integer;
begin
  if pharmacy is null or public.current_profile_role() <> 'admin' then
    raise exception 'Only an active pharmacy owner can adjust stock';
  end if;
  if p_new_stock < 0 then
    raise exception 'Stock cannot be negative';
  end if;

  select data into medicine
  from public.pharmacy_records
  where pharmacy_id = pharmacy and entity = 'medicines' and record_id = p_medicine_id
  for update;
  if not found then
    raise exception 'The selected medicine was not found';
  end if;

  old_stock := coalesce((medicine ->> 'stock')::integer, 0);
  delta := p_new_stock - old_stock;
  med_expiry := nullif(medicine ->> 'expiry', '')::date;

  if delta < 0 then
    -- Remove the shortfall from existing batches, earliest expiry first.
    reduce_left := -delta;
    for batch_row in
      select r.record_id, r.data
      from public.pharmacy_records as r
      where r.pharmacy_id = pharmacy and r.entity = 'batches'
        and r.data ->> 'medicineId' = p_medicine_id
        and coalesce((r.data ->> 'remaining')::integer, 0) > 0
      order by (r.data ->> 'expiryDate')::date, r.created_at
      for update
    loop
      batch_remaining := (batch_row.data ->> 'remaining')::integer;
      take := least(batch_remaining, reduce_left);
      update public.pharmacy_records
      set data = jsonb_set(data, '{remaining}', to_jsonb(batch_remaining - take), true), updated_at = now()
      where pharmacy_id = pharmacy and entity = 'batches' and record_id = batch_row.record_id;
      reduce_left := reduce_left - take;
      exit when reduce_left = 0;
    end loop;
  elsif delta > 0 then
    -- Add the surplus as an adjustment batch so FEFO stays balanced.
    insert into public.pharmacy_records (pharmacy_id, entity, record_id, data)
    values (pharmacy, 'batches', adj_id, jsonb_build_object(
      'id', adj_id,
      'medicineId', p_medicine_id,
      'medicineName', concat_ws(' ', medicine ->> 'name', medicine ->> 'strength'),
      'batchNumber', 'ADJ-' || upper(right(replace(adj_id, '-', ''), 8)),
      'purchaseDate', current_date::text,
      'expiryDate', coalesce(med_expiry, current_date + 365)::text,
      'purchasePrice', coalesce((medicine ->> 'purchasePrice')::numeric, 0),
      'sellingPrice', coalesce((medicine ->> 'sellingPrice')::numeric, 0),
      'quantity', delta,
      'remaining', delta,
      'status', case when coalesce(med_expiry, current_date + 365) <= current_date + 90 then 'expiring' else 'healthy' end
    ));
  end if;

  update public.pharmacy_records
  set data = jsonb_set(
        jsonb_set(data, '{stock}', to_jsonb(p_new_stock), true),
        '{status}',
        to_jsonb(case
          when med_expiry is not null and med_expiry < current_date then 'expired'
          when p_new_stock = 0 then 'out'
          when med_expiry is not null and med_expiry <= current_date + 90 then 'expiring'
          when p_new_stock <= coalesce((medicine ->> 'reorderLevel')::integer, 0) then 'low'
          else 'healthy'
        end),
        true
      ),
      updated_at = now()
  where pharmacy_id = pharmacy and entity = 'medicines' and record_id = p_medicine_id;

  insert into public.pharmacy_records (pharmacy_id, entity, record_id, data)
  values (pharmacy, 'adjustments', adj_id, jsonb_build_object(
    'id', adj_id,
    'medicineId', p_medicine_id,
    'medicineName', concat_ws(' ', medicine ->> 'name', medicine ->> 'strength'),
    'previousStock', old_stock,
    'newStock', p_new_stock,
    'delta', delta,
    'reason', coalesce(nullif(p_reason, ''), 'Manual adjustment'),
    'date', current_date::text
  ));
end;
$$;

revoke all on function public.adjust_stock(text, integer, text) from public;
grant execute on function public.adjust_stock(text, integer, text) to authenticated;
