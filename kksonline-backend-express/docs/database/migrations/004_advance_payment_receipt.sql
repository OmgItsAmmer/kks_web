-- =============================================================================
-- 004_advance_payment_receipt.sql
-- KKS Online — Advance payment receipt feature (shop toggle + order receipt path)
-- Docs: ../schema.md, ../RLS_policies.md
-- Default: receipt upload is mandatory (true). TEMP off: see 006_disable_advance_payment_receipt_temp.sql + feature-flags.ts
-- Safe to re-run where noted.
-- =============================================================================

BEGIN;

ALTER TABLE shop
  ADD COLUMN IF NOT EXISTS is_advance_payment_receipt_mandatory BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_receipt_path TEXT;

COMMENT ON COLUMN shop.is_advance_payment_receipt_mandatory IS
  'When true, checkout requires a payment receipt image uploaded to Supabase storage.';

COMMENT ON COLUMN orders.payment_receipt_path IS
  'Supabase storage object path for advance payment receipt (payment-receipts bucket).';

-- Ensure existing shop row(s) use mandatory=true when column was just added
UPDATE shop
SET is_advance_payment_receipt_mandatory = true
WHERE is_advance_payment_receipt_mandatory IS DISTINCT FROM true;

-- Private bucket for customer payment receipts (backend uploads via service role)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-receipts',
  'payment-receipts',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

COMMIT;

-- Toggle feature off (admin / SQL):
-- UPDATE shop SET is_advance_payment_receipt_mandatory = false WHERE shop_id = 1;
--
-- Toggle feature on:
-- UPDATE shop SET is_advance_payment_receipt_mandatory = true WHERE shop_id = 1;
