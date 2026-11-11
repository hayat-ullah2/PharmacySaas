create extension if not exists pgcrypto;

create table if not exists public.pharmacies (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users(id) on delete restrict,
  name text not null check (length(trim(name)) between 2 and 120),
  address text not null default '',
  phone text not null default '',
  license_number text not null default '',
  tax_id text not null default '',
  currency text not null default 'PKR',
  timezone text not null default 'Asia/Karachi',
  language text not null default 'en',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  pharmacy_id uuid not null references public.pharmacies(id) on delete restrict,
  name text not null,
  email text not null,
  phone text not null default '',
  email_notifications boolean not null default true,
  low_stock_alerts boolean not null default true,
  role text not null check (role in ('admin', 'manager', 'pharmacist', 'cashier', 'inventory')),
  status text not null default 'active' check (status in ('active', 'inactive')),
  last_login timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists profiles_pharmacy_id_idx on public.profiles(pharmacy_id);

create table if not exists public.pharmacy_records (
  pharmacy_id uuid not null references public.pharmacies(id) on delete cascade,
  entity text not null check (length(entity) between 1 and 64),
  record_id text not null check (length(record_id) between 1 and 128),
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (pharmacy_id, entity, record_id)
);

create index if not exists pharmacy_records_entity_idx
  on public.pharmacy_records(pharmacy_id, entity, record_id);

create or replace function public.current_pharmacy_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.pharmacy_id
  from public.profiles as p
  where p.id = auth.uid() and p.status = 'active'
$$;

create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select p.role
  from public.profiles as p
  where p.id = auth.uid() and p.status = 'active'
$$;

revoke all on function public.current_pharmacy_id() from public;
revoke all on function public.current_profile_role() from public;
grant execute on function public.current_pharmacy_id() to authenticated;
grant execute on function public.current_profile_role() to authenticated;

create or replace function public.create_owner_pharmacy()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_pharmacy_id uuid;
  owner_name text;
  pharmacy_name text;
begin
  if coalesce(new.raw_user_meta_data ->> 'account_type', '') <> 'owner' then
    return new;
  end if;

  owner_name := nullif(trim(new.raw_user_meta_data ->> 'name'), '');
  pharmacy_name := nullif(trim(new.raw_user_meta_data ->> 'pharmacy_name'), '');
  if owner_name is null or pharmacy_name is null then
    raise exception 'Owner name and pharmacy name are required';
  end if;

  insert into public.pharmacies (owner_id, name)
  values (new.id, pharmacy_name)
  returning id into new_pharmacy_id;

  insert into public.profiles (id, pharmacy_id, name, email, role)
  values (new.id, new_pharmacy_id, owner_name, lower(new.email), 'admin');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_pharmacy on auth.users;
create trigger on_auth_user_created_pharmacy
  after insert on auth.users
  for each row execute function public.create_owner_pharmacy();

alter table public.pharmacies enable row level security;
alter table public.profiles enable row level security;
alter table public.pharmacy_records enable row level security;

drop policy if exists "Members can read their pharmacy" on public.pharmacies;
create policy "Members can read their pharmacy"
  on public.pharmacies for select to authenticated
  using (id = public.current_pharmacy_id());

drop policy if exists "Owners can update their pharmacy" on public.pharmacies;
create policy "Owners can update their pharmacy"
  on public.pharmacies for update to authenticated
  using (id = public.current_pharmacy_id() and public.current_profile_role() = 'admin')
  with check (id = public.current_pharmacy_id() and public.current_profile_role() = 'admin');

drop policy if exists "Members can read permitted profiles" on public.profiles;
create policy "Members can read permitted profiles"
  on public.profiles for select to authenticated
  using (
    id = auth.uid()
    or (
      pharmacy_id = public.current_pharmacy_id()
      and public.current_profile_role() = 'admin'
    )
  );

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using (id = auth.uid() and pharmacy_id = public.current_pharmacy_id())
  with check (
    id = auth.uid()
    and pharmacy_id = public.current_pharmacy_id()
    and role = public.current_profile_role()
    and status = 'active'
  );

drop policy if exists "Members can read pharmacy records" on public.pharmacy_records;
create policy "Members can read pharmacy records"
  on public.pharmacy_records for select to authenticated
  using (pharmacy_id = public.current_pharmacy_id());

drop policy if exists "Members can insert pharmacy records" on public.pharmacy_records;
drop policy if exists "Owners can insert pharmacy records" on public.pharmacy_records;
create policy "Owners can insert pharmacy records"
  on public.pharmacy_records for insert to authenticated
  with check (
    pharmacy_id = public.current_pharmacy_id()
    and public.current_profile_role() = 'admin'
  );
create policy "Managers can add customers"
  on public.pharmacy_records for insert to authenticated
  with check (
    pharmacy_id = public.current_pharmacy_id()
    and public.current_profile_role() = 'manager'
    and entity = 'customers'
  );

drop policy if exists "Members can update pharmacy records" on public.pharmacy_records;
drop policy if exists "Owners can update pharmacy records" on public.pharmacy_records;
create policy "Owners can update pharmacy records"
  on public.pharmacy_records for update to authenticated
  using (pharmacy_id = public.current_pharmacy_id() and public.current_profile_role() = 'admin')
  with check (pharmacy_id = public.current_pharmacy_id() and public.current_profile_role() = 'admin');

drop policy if exists "Members can delete pharmacy records" on public.pharmacy_records;
drop policy if exists "Owners can delete pharmacy records" on public.pharmacy_records;
create policy "Owners can delete pharmacy records"
  on public.pharmacy_records for delete to authenticated
  using (pharmacy_id = public.current_pharmacy_id() and public.current_profile_role() = 'admin');

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

create or replace function public.complete_sale(
  p_customer_id text,
  p_items jsonb,
  p_payment text,
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
  quantity integer;
  stock_count integer;
  batch_row record;
  remaining_to_deduct integer;
  batch_remaining integer;
  unit_price numeric;
  subtotal numeric := 0;
  discount numeric;
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
    where r.pharmacy_id = pharmacy
      and r.entity = 'customers'
      and r.record_id = p_customer_id
    for update;
    if not found then
      raise exception 'The selected customer does not belong to this pharmacy';
    end if;
    customer_name := customer_record ->> 'name';
  end if;

  if p_prescription_id is not null then
    select r.data into prescription_record
    from public.pharmacy_records as r
    where r.pharmacy_id = pharmacy
      and r.entity = 'prescriptions'
      and r.record_id = p_prescription_id
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
    quantity := (item ->> 'quantity')::integer;
    if medicine_id is null or quantity is null or quantity < 1 then
      raise exception 'Each sale item needs a product and a positive quantity';
    end if;

    select r.data into medicine
    from public.pharmacy_records as r
    where r.pharmacy_id = pharmacy
      and r.entity = 'medicines'
      and r.record_id = medicine_id
    for update;
    if not found then
      raise exception 'A selected product is no longer available';
    end if;

    stock_count := coalesce((medicine ->> 'stock')::integer, 0);
    unit_price := coalesce((medicine ->> 'sellingPrice')::numeric, 0);
    if stock_count < quantity then
      raise exception 'Insufficient stock for %', medicine ->> 'name';
    end if;
    if unit_price <= 0 then
      raise exception 'A selected product has an invalid selling price';
    end if;
    if coalesce((medicine ->> 'prescriptionRequired')::boolean, false)
      and prescription_record is null then
      raise exception 'An approved prescription is required for %', medicine ->> 'name';
    end if;
    if nullif(medicine ->> 'expiry', '') is not null
      and (medicine ->> 'expiry')::date < current_date then
      raise exception 'Expired products cannot be sold: %', medicine ->> 'name';
    end if;

    medicine_name := concat_ws(' ', medicine ->> 'name', medicine ->> 'strength');
    item_subtotal := unit_price * quantity;
    subtotal := subtotal + item_subtotal;
    item_count := item_count + quantity;
    sale_items := sale_items || jsonb_build_array(jsonb_build_object(
      'medicineName', medicine_name,
      'quantity', quantity,
      'price', unit_price,
      'subtotal', item_subtotal
    ));

    remaining_to_deduct := quantity;
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
      quantity := least(batch_remaining, remaining_to_deduct);
      batch_remaining := batch_remaining - quantity;
      remaining_to_deduct := remaining_to_deduct - quantity;
      update public.pharmacy_records
      set data = jsonb_set(data, '{remaining}', to_jsonb(batch_remaining), true),
          updated_at = now()
      where pharmacy_id = pharmacy and entity = 'batches' and record_id = batch_row.record_id;
      exit when remaining_to_deduct = 0;
    end loop;
    if remaining_to_deduct > 0 then
      raise exception 'Insufficient unexpired batch stock for %', medicine ->> 'name';
    end if;

    quantity := (item ->> 'quantity')::integer;
    stock_count := stock_count - quantity;
    update public.pharmacy_records
    set data = jsonb_set(
      jsonb_set(data, '{stock}', to_jsonb(stock_count), true),
      '{status}',
      to_jsonb(case
        when stock_count = 0 then 'out'
        when nullif(medicine ->> 'expiry', '') is not null
          and (medicine ->> 'expiry')::date <= current_date + 90 then 'expiring'
        when stock_count <= coalesce((medicine ->> 'reorderLevel')::integer, 0) then 'low'
        else 'healthy'
      end),
      true
    ),
    updated_at = now()
    where pharmacy_id = pharmacy and entity = 'medicines' and record_id = medicine_id;
  end loop;

  if prescription_record is not null then
    update public.pharmacy_records
    set data = jsonb_set(data, '{status}', '"dispensed"'::jsonb, true),
        updated_at = now()
    where pharmacy_id = pharmacy
      and entity = 'prescriptions'
      and record_id = p_prescription_id;
  end if;

  select p.name into manager_name
  from public.profiles as p
  where p.id = auth.uid();

  discount := round(subtotal * 0.05);
  invoice_number := 'INV-' || upper(right(replace(sale_id::text, '-', ''), 8));

  insert into public.pharmacy_records (pharmacy_id, entity, record_id, data)
  values (
    pharmacy,
    'sales',
    sale_id::text,
    jsonb_build_object(
      'id', sale_id::text,
      'invoice', invoice_number,
      'customer', customer_name,
      'items', sale_items,
      'itemCount', item_count,
      'subtotal', subtotal,
      'discount', discount,
      'tax', 0,
      'total', subtotal - discount,
      'payment', p_payment,
      'status', 'paid',
      'date', current_date::text
    )
  );

  if p_customer_id is not null then
    update public.pharmacy_records
    set data = jsonb_set(
          jsonb_set(data, '{totalPurchases}', to_jsonb(coalesce((data ->> 'totalPurchases')::numeric, 0) + subtotal), true),
          '{lastPurchase}',
          to_jsonb(current_date::text),
          true
        ),
        updated_at = now()
    where pharmacy_id = pharmacy and entity = 'customers' and record_id = p_customer_id;
  end if;

  insert into public.pharmacy_records (pharmacy_id, entity, record_id, data)
  values (
    pharmacy,
    'payments',
    sale_id::text,
    jsonb_build_object(
      'id', sale_id::text,
      'reference', 'PMT-' || upper(right(replace(sale_id::text, '-', ''), 8)),
      'party', customer_name,
      'type', 'incoming',
      'amount', subtotal - discount,
      'method', p_payment,
      'date', current_date::text,
      'status', 'completed'
    )
  );

  insert into public.pharmacy_records (pharmacy_id, entity, record_id, data)
  values (
    pharmacy,
    'audit_logs',
    sale_id::text,
    jsonb_build_object(
      'id', sale_id::text,
      'user', coalesce(manager_name, 'Manager'),
      'action', 'Created',
      'entity', 'Sale',
      'detail', 'Completed sale ' || invoice_number || ' (' || (subtotal - discount)::text || ')',
      'timestamp', now()::text,
      'ip', '—'
    )
  );

  return jsonb_build_object('id', sale_id::text, 'invoice', invoice_number);
end;
$$;

revoke all on function public.complete_sale(text, jsonb, text, text) from public;
grant execute on function public.complete_sale(text, jsonb, text, text) to authenticated;
