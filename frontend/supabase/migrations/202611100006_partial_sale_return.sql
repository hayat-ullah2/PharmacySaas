-- =====================================================================
--  Partial, item-level sale returns.
--  record_sale_return now takes p_items = [{ medicineId, quantity }] — the
--  specific items and quantities being returned. It:
--   - validates each quantity against what's left to return on that line
--     (sold qty minus already-returned qty),
--   - restocks the EXACT medicine (by medicineId) for the returned quantity,
--   - refunds proportionally to the sale total (so discounts are respected),
--   - tracks returnedQty per line + returnedAmount on the sale,
--   - marks the sale 'refunded' only once every line is fully returned
--     (otherwise it stays returnable so more can be returned later).
--  Replaces the old full-sale record_sale_return(text, text).
--  Safe to run multiple times.
-- =====================================================================

drop function if exists public.record_sale_return(text, text);

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
  sold integer;
  already integer;
  req integer;
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

      select r.record_id, r.data into medicine_rec
      from public.pharmacy_records as r
      where r.pharmacy_id = pharmacy and r.entity = 'medicines' and r.record_id = mid
      for update;
      if not found then
        raise exception 'Cannot restock "%" — the medicine no longer exists. Return cancelled.', line ->> 'medicineName';
      end if;

      composed := concat_ws(' ', medicine_rec.data ->> 'name', medicine_rec.data ->> 'strength');
      new_stock := coalesce((medicine_rec.data ->> 'stock')::integer, 0) + req;
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
        'quantity', req,
        'remaining', req,
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
