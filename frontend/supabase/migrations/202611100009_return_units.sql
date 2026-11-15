-- =====================================================================
--  Multi-unit returns — Phase 4.
--  Both return paths move stock in BASE units, matching how sales/purchases
--  record it:
--   * record_sale_return      — a sold line of "1 Box" (factor 100) restocks
--                               100 base units, not 1. Returned-qty tracking,
--                               refund (per-unit price) stay in sold units.
--   * record_purchase_return  — a received line of "5 Box" (factor 100)
--                               de-stocks 500 base units, reversing the receive.
--  Signatures unchanged. Lines without a factor behave as factor = 1 (legacy).
--  Safe to re-run.
-- =====================================================================

create or replace function public.record_sale_return(p_sale_id text, p_items jsonb, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  pharmacy uuid := public.current_pharmacy_id();
  caller_role text := public.current_profile_role();
  sale jsonb;
  sale_subtotal numeric;
  sale_total numeric;
  ratio numeric;
  line jsonb;
  mid text;
  factor integer;
  sold integer;
  already integer;
  req integer;
  base_req integer;
  new_returned integer;
  new_items jsonb := '[]'::jsonb;
  fully boolean := true;
  total_refund numeric := 0;
  total_req integer := 0;
  medicine_rec record;
  unit_price numeric;
  new_stock integer;
  med_expiry date;
  batch_id text;
  composed text;
  return_id text := gen_random_uuid()::text;
begin
  if pharmacy is null or caller_role not in ('admin', 'manager') then
    raise exception 'You are not allowed to process returns';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Select at least one item and quantity to return';
  end if;

  select data into sale
  from public.pharmacy_records
  where pharmacy_id = pharmacy and entity = 'sales' and record_id = p_sale_id
  for update;
  if not found then
    raise exception 'The sale was not found';
  end if;
  if sale ->> 'status' = 'refunded' then
    raise exception 'This sale has already been fully refunded';
  end if;

  sale_subtotal := coalesce((sale ->> 'subtotal')::numeric, 0);
  sale_total := coalesce((sale ->> 'total')::numeric, 0);
  ratio := case when sale_subtotal > 0 then sale_total / sale_subtotal else 1 end;

  for line in select value from jsonb_array_elements(coalesce(sale -> 'items', '[]'::jsonb))
  loop
    mid := line ->> 'medicineId';
    sold := coalesce((line ->> 'quantity')::integer, 0);
    already := coalesce((line ->> 'returnedQty')::integer, 0);
    unit_price := coalesce((line ->> 'price')::numeric, 0);
    factor := coalesce((line ->> 'factor')::integer, 1);
    if factor < 1 then factor := 1; end if;

    req := 0;
    if mid is not null then
      select coalesce(sum((it ->> 'quantity')::integer), 0) into req
      from jsonb_array_elements(p_items) as it
      where it ->> 'medicineId' = mid;
    end if;

    if req > 0 then
      if req > sold - already then
        raise exception 'Cannot return % of "%": only % left to return', req, line ->> 'medicineName', sold - already;
      end if;

      base_req := req * factor;

      select r.record_id, r.data into medicine_rec
      from public.pharmacy_records as r
      where r.pharmacy_id = pharmacy and r.entity = 'medicines' and r.record_id = mid
      for update;
      if not found then
        raise exception 'Cannot restock "%" — the medicine no longer exists. Return cancelled.', line ->> 'medicineName';
      end if;

      composed := concat_ws(' ', medicine_rec.data ->> 'name', medicine_rec.data ->> 'strength');
      new_stock := coalesce((medicine_rec.data ->> 'stock')::integer, 0) + base_req;
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
        'quantity', base_req,
        'remaining', base_req,
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

      total_refund := total_refund + round(unit_price * req * ratio, 2);
      total_req := total_req + req;
      new_returned := already + req;
    else
      new_returned := already;
    end if;

    if new_returned < sold then
      fully := false;
    end if;
    new_items := new_items || jsonb_build_array(jsonb_set(line, '{returnedQty}', to_jsonb(new_returned), true));
  end loop;

  if total_req = 0 then
    raise exception 'Select at least one item and quantity to return';
  end if;

  update public.pharmacy_records
  set data = jsonb_set(
        jsonb_set(
          jsonb_set(data, '{items}', new_items, true),
          '{returnedAmount}', to_jsonb(coalesce((data ->> 'returnedAmount')::numeric, 0) + total_refund), true
        ),
        '{status}',
        to_jsonb(case when fully then 'refunded' else data ->> 'status' end),
        true
      ),
      updated_at = now()
  where pharmacy_id = pharmacy and entity = 'sales' and record_id = p_sale_id;

  insert into public.pharmacy_records (pharmacy_id, entity, record_id, data)
  values (pharmacy, 'sales_returns', return_id, jsonb_build_object(
    'id', return_id,
    'invoice', sale ->> 'invoice',
    'customer', sale ->> 'customer',
    'reason', coalesce(nullif(p_reason, ''), 'Customer return'),
    'amount', total_refund,
    'itemCount', total_req,
    'status', 'approved',
    'date', current_date::text
  ));

  return jsonb_build_object('refund', total_refund, 'items', total_req, 'fully', fully);
end;
$$;

revoke all on function public.record_sale_return(text, jsonb, text) from public;
grant execute on function public.record_sale_return(text, jsonb, text) to authenticated;


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
  unit_name text;
  factor integer;
  qty integer;
  base_qty integer;
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
    unit_name := nullif(item ->> 'unit', '');
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

    -- Reverse the receive in BASE units.
    if unit_name is null or unit_name = medicine ->> 'unit' then
      factor := 1;
    else
      select (p ->> 'factor')::integer into factor
      from jsonb_array_elements(coalesce(medicine -> 'packUnits', '[]'::jsonb)) as p
      where p ->> 'name' = unit_name
      limit 1;
      factor := coalesce(factor, 1);
    end if;
    if factor < 1 then factor := 1; end if;

    base_qty := qty * factor;
    current_stock := coalesce((medicine ->> 'stock')::integer, 0);
    deduct := least(base_qty, current_stock);
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
