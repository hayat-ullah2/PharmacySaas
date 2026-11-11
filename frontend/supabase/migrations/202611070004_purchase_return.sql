-- =====================================================================
--  record_purchase_return: return a received PO's goods to the supplier —
--  de-stock each line (FEFO, capped at available), mark the PO 'returned',
--  and record the return. Admin-only, atomic. Safe to run multiple times.
-- =====================================================================

create or replace function public.record_purchase_return(p_purchase_id text, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  pharmacy uuid := public.current_pharmacy_id();
  po jsonb;
  item jsonb;
  medicine jsonb;
  medicine_id text;
  qty integer;
  current_stock integer;
  deduct integer;
  new_stock integer;
  med_expiry date;
  batch_row record;
  reduce_left integer;
  take integer;
  batch_remaining integer;
  return_id text := gen_random_uuid()::text;
begin
  if pharmacy is null or public.current_profile_role() <> 'admin' then
    raise exception 'Only an active pharmacy owner can return stock to suppliers';
  end if;

  select data into po
  from public.pharmacy_records
  where pharmacy_id = pharmacy and entity = 'purchases' and record_id = p_purchase_id
  for update;
  if not found then
    raise exception 'The purchase order was not found';
  end if;
  if po ->> 'status' <> 'received' then
    raise exception 'Only a received purchase order can be returned';
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

    current_stock := coalesce((medicine ->> 'stock')::integer, 0);
    deduct := least(qty, current_stock);
    new_stock := current_stock - deduct;
    med_expiry := nullif(medicine ->> 'expiry', '')::date;

    reduce_left := deduct;
    for batch_row in
      select r.record_id, r.data
      from public.pharmacy_records as r
      where r.pharmacy_id = pharmacy and r.entity = 'batches'
        and r.data ->> 'medicineId' = medicine_id
        and coalesce((r.data ->> 'remaining')::integer, 0) > 0
      order by (r.data ->> 'expiryDate')::date, r.created_at
      for update
    loop
      exit when reduce_left = 0;
      batch_remaining := (batch_row.data ->> 'remaining')::integer;
      take := least(batch_remaining, reduce_left);
      update public.pharmacy_records
      set data = jsonb_set(data, '{remaining}', to_jsonb(batch_remaining - take), true), updated_at = now()
      where pharmacy_id = pharmacy and entity = 'batches' and record_id = batch_row.record_id;
      reduce_left := reduce_left - take;
    end loop;

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
  set data = jsonb_set(data, '{status}', '"returned"'::jsonb, true), updated_at = now()
  where pharmacy_id = pharmacy and entity = 'purchases' and record_id = p_purchase_id;

  insert into public.pharmacy_records (pharmacy_id, entity, record_id, data)
  values (pharmacy, 'purchase_returns', return_id, jsonb_build_object(
    'id', return_id,
    'poNumber', po ->> 'poNumber',
    'supplier', po ->> 'supplier',
    'reason', coalesce(nullif(p_reason, ''), 'Returned to supplier'),
    'amount', coalesce((po ->> 'total')::numeric, 0),
    'status', 'approved',
    'date', current_date::text
  ));
end;
$$;

revoke all on function public.record_purchase_return(text, text) from public;
grant execute on function public.record_purchase_return(text, text) to authenticated;
