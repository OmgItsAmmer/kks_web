-- =============================================================================
-- 005_payment_receipts_storage_rls.sql
-- KKS Online — Storage RLS for payment-receipts bucket
-- Requires: 001_rls_policies.sql, 002_storage_buckets.sql, 004_advance_payment_receipt.sql
-- Docs: ../RLS_storage_policies.md
--
-- Run in Supabase Dashboard → SQL Editor (direct postgres), NOT via pooler/Prisma.
-- =============================================================================

BEGIN;

DROP POLICY IF EXISTS kks_payment_receipts_select_own ON storage.objects;
DROP POLICY IF EXISTS kks_payment_receipts_insert_own ON storage.objects;
DROP POLICY IF EXISTS kks_payment_receipts_update_own ON storage.objects;
DROP POLICY IF EXISTS kks_payment_receipts_delete_own ON storage.objects;
DROP POLICY IF EXISTS kks_owner_payment_receipts_select ON storage.objects;
DROP POLICY IF EXISTS kks_owner_payment_receipts_insert ON storage.objects;
DROP POLICY IF EXISTS kks_owner_payment_receipts_update ON storage.objects;
DROP POLICY IF EXISTS kks_owner_payment_receipts_delete ON storage.objects;

-- Customer can access only their folder: {customer_id}/...
CREATE POLICY kks_payment_receipts_select_own
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'payment-receipts'
    AND (storage.foldername(name))[1] = public.auth_customer_id()::text
  );

CREATE POLICY kks_payment_receipts_insert_own
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'payment-receipts'
    AND (storage.foldername(name))[1] = public.auth_customer_id()::text
  );

CREATE POLICY kks_payment_receipts_update_own
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'payment-receipts'
    AND (storage.foldername(name))[1] = public.auth_customer_id()::text
  )
  WITH CHECK (
    bucket_id = 'payment-receipts'
    AND (storage.foldername(name))[1] = public.auth_customer_id()::text
  );

CREATE POLICY kks_payment_receipts_delete_own
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'payment-receipts'
    AND (storage.foldername(name))[1] = public.auth_customer_id()::text
  );

-- Shop owner can manage all payment receipts
CREATE POLICY kks_owner_payment_receipts_select
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'payment-receipts'
    AND public.is_shop_owner()
  );

CREATE POLICY kks_owner_payment_receipts_insert
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'payment-receipts'
    AND public.is_shop_owner()
  );

CREATE POLICY kks_owner_payment_receipts_update
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'payment-receipts'
    AND public.is_shop_owner()
  )
  WITH CHECK (
    bucket_id = 'payment-receipts'
    AND public.is_shop_owner()
  );

CREATE POLICY kks_owner_payment_receipts_delete
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'payment-receipts'
    AND public.is_shop_owner()
  );

COMMIT;

-- Verification:
-- SELECT policyname, roles, cmd
-- FROM pg_policies
-- WHERE schemaname = 'storage'
--   AND tablename = 'objects'
--   AND policyname LIKE 'kks_payment_receipts%' OR policyname LIKE 'kks_owner_payment_receipts%'
-- ORDER BY policyname;
