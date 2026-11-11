-- =====================================================================
--  receive_purchase: receiving a PO adds each line's quantity to stock and
--  creates a batch (by medicineId), then marks the PO 'received'. Admin-only,
--  atomic, and keeps medicine.stock == Σ batch.remaining. Safe to run again.
-- =====================================================================

create or replace function public.receive_purchase(p_purchase_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  pharmacy uuid := public.current_pharmacy_id();
  po jsonb;
  item jsonb;
  medicine_id text;
  medicine jsonb;
  qty integer;
  expiry date;
  new_stock integer;
  med_expiry date;
  batch_id text;
  batch_status text;
  batch_number text;
  purchase_price numeric;
begin
  if pharmacy is null or public.current_profile_role() <> 'admin' then
    raise exception 'Only an active pharmacy owner can receive purchase orders';
  end if;

  select data into po
  from public.pharmacy_records
  where pharmacy_id = pharmacy and entity = 'purchases' and record_id = p_purchase_id
  for update;
  if not found then
    raise exception 'The purchase order was not found';
  end if;
  if po ->> 'status' = 'received' then
    raise exception 'This purchase order has already been received';
  end if;
  if po ->> 'status' = 'cancelled' then
    raise exception 'A cancelled purchase order cannot be received';
  end if;

  for item in select value from jsonb_array_elements(coalesce(po -> 'items', '[]'::jsonb))
  loop
    medicine_id := item ->> 'medicineId';
    qty := coalesce((item ->> 'quantity')::integer, 0);
    if medicine_id is null or qty <= 0 then
      continue;
    end if;

    select data into medicine
    from public.pharmacy_records
    where pharmacy_id = pharmacy and entity = 'medicines' and record_id = medicine_id
    for update;
    if not found then
      continue;
    end if;

    expiry := coalesce(nullif(item ->> 'expiryDate', '')::date, nullif(medicine ->> 'expiry', '')::date, current_date + 365);
    new_stock := coalesce((medicine ->> 'stock')::integer, 0) + qty;
    med_expiry := nullif(medicine ->> 'expiry', '')::date;
    batch_id := gen_random_uuid()::text;
    batch_number := coalesce(nullif(item ->> 'batch', ''), 'PO-' || upper(right(replace(batch_id, '-', ''), 8)));
    purchase_price := coalesce((item ->> 'purchasePrice')::numeric, (medicine ->> 'purchasePrice')::numeric, 0);
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
      'batchNumber', batch_number,
      'purchaseDate', current_date::text,
      'expiryDate', expiry::text,
      'purchasePrice', purchase_price,
      'sellingPrice', coalesce((medicine ->> 'sellingPrice')::numeric, 0),
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
  end loop;

  update public.pharmacy_records
  set data = jsonb_set(data, '{status}', '"received"'::jsonb, true), updated_at = now()
  where pharmacy_id = pharmacy and entity = 'purchases' and record_id = p_purchase_id;
end;
$$;

revoke all on function public.receive_purchase(text) from public;
grant execute on function public.receive_purchase(text) to authenticated;
