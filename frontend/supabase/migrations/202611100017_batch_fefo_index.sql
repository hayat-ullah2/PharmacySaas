-- =====================================================================
--  H4 — speed up FEFO / batch-by-medicine lookups.
--  complete_sale, receive_purchase, record_sale_return, record_purchase_return,
--  adjust_stock and the medicine detail page all look up a medicine's batches
--  with: where pharmacy_id = X and entity = 'batches' and data->>'medicineId' = Y
--  (then order by expiry). With only the (pharmacy_id, entity, record_id) PK,
--  that scans ALL of the pharmacy's batch rows and filters medicineId in memory.
--
--  This partial expression index lets Postgres jump straight to one medicine's
--  batches, so FEFO stays fast as batch history grows. `data->>'medicineId'` is
--  IMMUTABLE so it's index-safe; the expiry sort then runs over just that
--  medicine's (few) batches. Additive only — no data or logic change. Safe to
--  re-run.
-- =====================================================================

create index if not exists pharmacy_records_batch_medicine_idx
  on public.pharmacy_records (pharmacy_id, (data ->> 'medicineId'))
  where entity = 'batches';
