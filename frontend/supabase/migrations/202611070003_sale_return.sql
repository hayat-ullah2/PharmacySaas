-- =====================================================================
--  record_sale_return: restock every item from a sale back into inventory
--  (as a return batch), mark the sale 'refunded', and record the return.
--  Allowed for admins and managers (a POS customer-return function).
--  Sale items store medicineName as "name strength", which matches a medicine
--  exactly. Safe to run multiple times.
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
    composed := item ->> 'medicineName';
    qty := coalesce((item ->> 'quantity')::integer, 0);
    if qty <= 0 then
      continue;
    end if;

    select r.record_id, r.data into medicine_rec
    from public.pharmacy_records as r
    where r.pharmacy_id = pharmacy and r.entity = 'medicines'
      and concat_ws(' ', r.data ->> 'name', r.data ->> 'strength') = composed
    limit 1
    for update;
    if not found then
      continue;
    end if;

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
