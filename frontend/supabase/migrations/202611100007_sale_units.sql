-- =====================================================================
--  Multi-unit selling — Phase 2.
--  Each sale item may carry a "unit" (Box / Strip / Tablet…). The server
--  resolves that unit's factor (base units per pack) and its configured price
--  from the medicine, deducts quantity*factor BASE units via FEFO, and charges
--  the unit's price. No signature change — items without "unit" fall back to
--  the base unit, so existing behaviour is preserved. The C-1 totals guarantee
--  (shown == stored, can't tamper) still holds.  Safe to run multiple times.
-- =====================================================================

create or replace function public.complete_sale(
  p_customer_id text,
  p_items jsonb,
  p_payment text,
  p_discount numeric,
  p_tax numeric,
  p_subtotal numeric,
  p_total numeric,
  p_amount_paid numeric,
  p_prescription_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  pharmacy uuid := public.current_pharmacy_id();
  sale_id uuid := gen_random_uuid();
  invoice_number text;
  customer_name text := 'Walk-in Customer';
  customer_record jsonb;
  prescription_record jsonb;
  manager_name text;
  item jsonb;
  medicine jsonb;
  medicine_id text;
  medicine_name text;
  unit_name text;
  factor integer;
  base_qty integer;
  quantity integer;
  stock_count integer;
  batch_row record;
  remaining_to_deduct integer;
  deduct_chunk integer;
  batch_remaining integer;
  unit_price numeric;
  subtotal numeric := 0;
  discount numeric;
  tax numeric;
  sale_total numeric;
  paid numeric;
  outstanding numeric;
  sale_status text;
  sale_items jsonb := '[]'::jsonb;
  item_count integer := 0;
  item_subtotal numeric;
begin
  if pharmacy is null or public.current_profile_role() <> 'manager' then
    raise exception 'An active manager account is required to complete a sale';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'A sale must include at least one product';
  end if;
  if p_payment not in ('cash', 'card', 'bank', 'other') then
    raise exception 'Unsupported payment method';
  end if;

  if p_customer_id is not null then
    select r.data into customer_record
    from public.pharmacy_records as r
    where r.pharmacy_id = pharmacy and r.entity = 'customers' and r.record_id = p_customer_id
    for update;
    if not found then
      raise exception 'The selected customer does not belong to this pharmacy';
    end if;
    customer_name := customer_record ->> 'name';
  end if;

  if p_prescription_id is not null then
    select r.data into prescription_record
    from public.pharmacy_records as r
    where r.pharmacy_id = pharmacy and r.entity = 'prescriptions' and r.record_id = p_prescription_id
    for update;
    if not found or prescription_record ->> 'status' <> 'approved' then
      raise exception 'The selected prescription is not approved for dispensing';
    end if;
    if p_customer_id is not null and prescription_record ->> 'patient' <> customer_name then
      raise exception 'The prescription patient does not match the selected customer';
    end if;
  end if;

  for item in select value from jsonb_array_elements(p_items)
  loop
    medicine_id := item ->> 'medicine_id';
    unit_name := nullif(item ->> 'unit', '');
    quantity := (item ->> 'quantity')::integer;  -- number of the chosen unit
    if medicine_id is null or quantity is null or quantity < 1 then
      raise exception 'Each sale item needs a product and a positive quantity';
    end if;

    select r.data into medicine
    from public.pharmacy_records as r
    where r.pharmacy_id = pharmacy and r.entity = 'medicines' and r.record_id = medicine_id
    for update;
    if not found then
      raise exception 'A selected product is no longer available';
    end if;

    -- Resolve the chosen unit → factor (base units per pack) + price.
    if unit_name is null or unit_name = medicine ->> 'unit' then
      if unit_name = medicine ->> 'unit' and coalesce((medicine ->> 'allowLoose')::boolean, true) = false then
        raise exception 'Loose "%" selling is not allowed for %', unit_name, medicine ->> 'name';
      end if;
      factor := 1;
      unit_price := coalesce((medicine ->> 'sellingPrice')::numeric, 0);
      unit_name := medicine ->> 'unit';
    else
      select (p ->> 'factor')::integer, (p ->> 'price')::numeric
        into factor, unit_price
      from jsonb_array_elements(coalesce(medicine -> 'packUnits', '[]'::jsonb)) as p
      where p ->> 'name' = unit_name
      limit 1;
      if factor is null then
        raise exception 'Unit "%" is not configured for %', unit_name, medicine ->> 'name';
      end if;
    end if;
    if factor < 1 then
      raise exception 'Invalid packaging for %', medicine ->> 'name';
    end if;

    base_qty := quantity * factor;
    stock_count := coalesce((medicine ->> 'stock')::integer, 0);
    if stock_count < base_qty then
      raise exception 'Insufficient stock for % (need % %, have %)', medicine ->> 'name', quantity, unit_name, stock_count;
    end if;
    if unit_price <= 0 then
      raise exception 'A selected product has an invalid selling price';
    end if;
    if coalesce((medicine ->> 'prescriptionRequired')::boolean, false) and prescription_record is null then
      raise exception 'An approved prescription is required for %', medicine ->> 'name';
    end if;
    if nullif(medicine ->> 'expiry', '') is not null and (medicine ->> 'expiry')::date < current_date then
      raise exception 'Expired products cannot be sold: %', medicine ->> 'name';
    end if;

    medicine_name := concat_ws(' ', medicine ->> 'name', medicine ->> 'strength');
    item_subtotal := unit_price * quantity;
    subtotal := subtotal + item_subtotal;
    item_count := item_count + quantity;
    sale_items := sale_items || jsonb_build_array(jsonb_build_object(
      'medicineId', medicine_id,
      'medicineName', medicine_name,
      'unit', unit_name,
      'factor', factor,
      'quantity', quantity,
      'baseQuantity', base_qty,
      'price', unit_price,
      'subtotal', item_subtotal
    ));

    -- FEFO: deduct base_qty across unexpired batches, earliest expiry first.
    remaining_to_deduct := base_qty;
    for batch_row in
      select r.record_id, r.data
      from public.pharmacy_records as r
      where r.pharmacy_id = pharmacy
        and r.entity = 'batches'
        and r.data ->> 'medicineId' = medicine_id
        and coalesce((r.data ->> 'remaining')::integer, 0) > 0
        and (r.data ->> 'expiryDate')::date >= current_date
      order by (r.data ->> 'expiryDate')::date, r.created_at
      for update
    loop
      batch_remaining := (batch_row.data ->> 'remaining')::integer;
      deduct_chunk := least(batch_remaining, remaining_to_deduct);
      update public.pharmacy_records
      set data = jsonb_set(data, '{remaining}', to_jsonb(batch_remaining - deduct_chunk), true),
          updated_at = now()
      where pharmacy_id = pharmacy and entity = 'batches' and record_id = batch_row.record_id;
      remaining_to_deduct := remaining_to_deduct - deduct_chunk;
      exit when remaining_to_deduct = 0;
    end loop;
    if remaining_to_deduct > 0 then
      raise exception 'Insufficient unexpired batch stock for %', medicine ->> 'name';
    end if;

    stock_count := stock_count - base_qty;
    update public.pharmacy_records
    set data = jsonb_set(
      jsonb_set(data, '{stock}', to_jsonb(stock_count), true),
      '{status}',
      to_jsonb(case
        when stock_count = 0 then 'out'
        when nullif(medicine ->> 'expiry', '') is not null and (medicine ->> 'expiry')::date <= current_date + 90 then 'expiring'
        when stock_count <= coalesce((medicine ->> 'reorderLevel')::integer, 0) then 'low'
        else 'healthy'
      end),
      true
    ), updated_at = now()
    where pharmacy_id = pharmacy and entity = 'medicines' and record_id = medicine_id;
  end loop;

  -- Totals (C-1): discount/tax from the UI, verified against server prices.
  discount := round(coalesce(p_discount, 0), 2);
  tax := round(coalesce(p_tax, 0), 2);
  if discount < 0 or tax < 0 then
    raise exception 'Discount and tax cannot be negative';
  end if;
  if discount > subtotal then
    raise exception 'Discount (%) cannot exceed the subtotal (%)', discount, subtotal;
  end if;
  if abs(coalesce(p_subtotal, subtotal) - subtotal) > 0.5 then
    raise exception 'Sale subtotal (%) does not match current item prices (%). Refresh the cart and try again.', coalesce(p_subtotal, 0), subtotal;
  end if;
  sale_total := subtotal - discount + tax;
  if abs(coalesce(p_total, sale_total) - sale_total) > 0.5 then
    raise exception 'Sale total (%) does not add up from the line items (%).', coalesce(p_total, 0), sale_total;
  end if;

  -- Payment (M-2).
  paid := round(coalesce(p_amount_paid, sale_total), 2);
  if paid < 0 then raise exception 'Amount paid cannot be negative'; end if;
  if paid > sale_total then paid := sale_total; end if;
  outstanding := sale_total - paid;
  if outstanding > 0 and p_customer_id is null then
    raise exception 'Select a customer for a credit or partial sale — a walk-in must pay in full';
  end if;
  sale_status := case when outstanding <= 0 then 'paid' when paid <= 0 then 'pending' else 'partial' end;

  if prescription_record is not null then
    update public.pharmacy_records
    set data = jsonb_set(data, '{status}', '"dispensed"'::jsonb, true), updated_at = now()
    where pharmacy_id = pharmacy and entity = 'prescriptions' and record_id = p_prescription_id;
  end if;

  select p.name into manager_name from public.profiles as p where p.id = auth.uid();
  invoice_number := 'INV-' || upper(right(replace(sale_id::text, '-', ''), 8));

  insert into public.pharmacy_records (pharmacy_id, entity, record_id, data)
  values (
    pharmacy, 'sales', sale_id::text,
    jsonb_build_object(
      'id', sale_id::text, 'invoice', invoice_number, 'customer', customer_name,
      'items', sale_items, 'itemCount', item_count,
      'subtotal', subtotal, 'discount', discount, 'tax', tax, 'total', sale_total,
      'amountPaid', paid, 'outstanding', outstanding,
      'payment', p_payment, 'status', sale_status, 'date', current_date::text
    )
  );

  if p_customer_id is not null then
    update public.pharmacy_records
    set data = jsonb_set(
          jsonb_set(
            jsonb_set(data, '{totalPurchases}', to_jsonb(coalesce((data ->> 'totalPurchases')::numeric, 0) + sale_total), true),
            '{outstanding}', to_jsonb(coalesce((data ->> 'outstanding')::numeric, 0) + outstanding), true
          ),
          '{lastPurchase}', to_jsonb(current_date::text), true
        ),
        updated_at = now()
    where pharmacy_id = pharmacy and entity = 'customers' and record_id = p_customer_id;
  end if;

  if paid > 0 then
    insert into public.pharmacy_records (pharmacy_id, entity, record_id, data)
    values (
      pharmacy, 'payments', sale_id::text,
      jsonb_build_object(
        'id', sale_id::text,
        'reference', 'PMT-' || upper(right(replace(sale_id::text, '-', ''), 8)),
        'party', customer_name, 'type', 'incoming', 'amount', paid,
        'method', p_payment, 'date', current_date::text,
        'status', case when outstanding <= 0 then 'completed' else 'partial' end
      )
    );
  end if;

  insert into public.pharmacy_records (pharmacy_id, entity, record_id, data)
  values (
    pharmacy, 'audit_logs', sale_id::text,
    jsonb_build_object(
      'id', sale_id::text, 'user', coalesce(manager_name, 'Manager'),
      'action', 'Created', 'entity', 'Sale',
      'detail', 'Completed sale ' || invoice_number || ' (' || sale_status || ', paid ' || paid::text || ' of ' || sale_total::text || ')',
      'timestamp', now()::text, 'ip', '—'
    )
  );

  return jsonb_build_object('id', sale_id::text, 'invoice', invoice_number, 'status', sale_status, 'outstanding', outstanding);
end;
$$;

revoke all on function public.complete_sale(text, jsonb, text, numeric, numeric, numeric, numeric, numeric, text) from public;
grant execute on function public.complete_sale(text, jsonb, text, numeric, numeric, numeric, numeric, numeric, text) to authenticated;
