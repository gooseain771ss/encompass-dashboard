-- ============================================================
-- Encompass Aviation Dashboard - Receipt Queue Migration
-- 002_receipt_queue.sql
-- ============================================================

-- Add receipt ingestion columns to transactions
alter table transactions
  add column if not exists needs_review    boolean       default false,
  add column if not exists confidence_score numeric(4,2) default null,
  add column if not exists source          text          default 'manual'
    check (source in ('manual', 'whatsapp', 'email')),
  add column if not exists raw_extracted_text text       default null;

-- Index for efficient queue queries
create index if not exists idx_transactions_needs_review
  on transactions(needs_review)
  where needs_review = true;

-- ============================================================
-- Receipt Queue View
-- Shows all transactions awaiting human review
-- ============================================================

create or replace view receipt_queue as
  select
    t.id,
    t.transaction_date,
    t.description,
    t.category,
    t.amount,
    t.is_income,
    t.payment_method,
    t.receipt_url,
    t.receipt_storage_path,
    t.needs_review,
    t.confidence_score,
    t.source,
    t.raw_extracted_text,
    t.aircraft_id,
    t.quote_id,
    t.notes,
    t.created_at,
    -- Join receipt metadata
    r.id          as receipt_id,
    r.filename    as receipt_filename,
    r.vendor      as receipt_vendor,
    r.amount      as receipt_amount,
    r.receipt_date,
    r.parsed_data as receipt_parsed_data,
    -- Join aircraft name
    a.name        as aircraft_name,
    a.registration as aircraft_registration
  from transactions t
  left join receipts r  on r.transaction_id = t.id
  left join aircraft a  on a.id = t.aircraft_id
  where t.needs_review = true
  order by t.created_at desc;

-- Grant access to authenticated users (matches existing RLS pattern)
-- Note: views inherit RLS from underlying tables when accessed via service role
