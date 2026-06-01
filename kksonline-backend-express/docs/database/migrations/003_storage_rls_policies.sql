-- =============================================================================
-- 003_storage_rls_policies.sql
-- KKS Online — Supabase Storage object RLS
-- Requires: 001_rls_policies.sql (helper functions), 002_storage_buckets.sql
-- Docs: ../RLS_storage_policies.md
--
-- IMPORTANT — where to run this:
--   Supabase Dashboard → SQL Editor (direct postgres connection)
--   Do NOT run via session pooler (port 6543), Prisma, or DATABASE_URL from .env
--   if that URL uses the pooler — you will get "must be owner of table objects".
--
-- NOTE: Do not ALTER storage.objects. RLS is already enabled by Supabase.
-- =============================================================================

BEGIN;

-- Drop existing KKS storage policies (idempotent)
DROP POLICY IF EXISTS kks_public_catalog_select ON storage.objects;
DROP POLICY IF EXISTS kks_owner_catalog_insert ON storage.objects;
DROP POLICY IF EXISTS kks_owner_catalog_update ON storage.objects;
DROP POLICY IF EXISTS kks_owner_catalog_delete ON storage.objects;
DROP POLICY IF EXISTS kks_customers_select_own ON storage.objects;
DROP POLICY IF EXISTS kks_customers_insert_own ON storage.objects;
DROP POLICY IF EXISTS kks_customers_update_own ON storage.objects;
DROP POLICY IF EXISTS kks_customers_delete_own ON storage.objects;
DROP POLICY IF EXISTS kks_owner_customers_all ON storage.objects;
DROP POLICY IF EXISTS kks_owner_staff_select ON storage.objects;
DROP POLICY IF EXISTS kks_owner_staff_insert ON storage.objects;
DROP POLICY IF EXISTS kks_owner_staff_update ON storage.objects;
DROP POLICY IF EXISTS kks_owner_staff_delete ON storage.objects;

-- -----------------------------------------------------------------------------
-- Public catalog buckets — world-readable
-- buckets: products, categories, brands, collections, shop
-- -----------------------------------------------------------------------------

CREATE POLICY kks_public_catalog_select
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id IN ('products', 'categories', 'brands', 'collections', 'shop'));

CREATE POLICY kks_owner_catalog_insert
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id IN ('products', 'categories', 'brands', 'collections', 'shop')
    AND public.is_shop_owner()
  );

CREATE POLICY kks_owner_catalog_update
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id IN ('products', 'categories', 'brands', 'collections', 'shop')
    AND public.is_shop_owner()
  )
  WITH CHECK (
    bucket_id IN ('products', 'categories', 'brands', 'collections', 'shop')
    AND public.is_shop_owner()
  );

CREATE POLICY kks_owner_catalog_delete
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id IN ('products', 'categories', 'brands', 'collections', 'shop')
    AND public.is_shop_owner()
  );

-- -----------------------------------------------------------------------------
-- Customer profile bucket — own folder only
-- Path: {customer_id}/{filename}
-- -----------------------------------------------------------------------------

CREATE POLICY kks_customers_select_own
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'customers'
    AND (storage.foldername(name))[1] = public.auth_customer_id()::text
  );

CREATE POLICY kks_customers_insert_own
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'customers'
    AND (storage.foldername(name))[1] = public.auth_customer_id()::text
  );

CREATE POLICY kks_customers_update_own
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'customers'
    AND (storage.foldername(name))[1] = public.auth_customer_id()::text
  )
  WITH CHECK (
    bucket_id = 'customers'
    AND (storage.foldername(name))[1] = public.auth_customer_id()::text
  );

CREATE POLICY kks_customers_delete_own
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'customers'
    AND (storage.foldername(name))[1] = public.auth_customer_id()::text
  );

CREATE POLICY kks_owner_customers_all
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'customers' AND public.is_shop_owner())
  WITH CHECK (bucket_id = 'customers' AND public.is_shop_owner());

-- -----------------------------------------------------------------------------
-- Staff / internal buckets — shop owner only
-- buckets: users, vendors, salesman, guarantors
-- -----------------------------------------------------------------------------

CREATE POLICY kks_owner_staff_select
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id IN ('users', 'vendors', 'salesman', 'guarantors')
    AND public.is_shop_owner()
  );

CREATE POLICY kks_owner_staff_insert
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id IN ('users', 'vendors', 'salesman', 'guarantors')
    AND public.is_shop_owner()
  );

CREATE POLICY kks_owner_staff_update
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id IN ('users', 'vendors', 'salesman', 'guarantors')
    AND public.is_shop_owner()
  )
  WITH CHECK (
    bucket_id IN ('users', 'vendors', 'salesman', 'guarantors')
    AND public.is_shop_owner()
  );

CREATE POLICY kks_owner_staff_delete
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id IN ('users', 'vendors', 'salesman', 'guarantors')
    AND public.is_shop_owner()
  );

COMMIT;
