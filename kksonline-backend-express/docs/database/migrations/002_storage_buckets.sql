-- =============================================================================
-- 002_storage_buckets.sql
-- KKS Online — Supabase Storage bucket creation
-- Docs: ../RLS_storage_policies.md
-- Safe to re-run: skips buckets that already exist.
-- =============================================================================

BEGIN;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('brands', 'brands', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('categories', 'categories', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('collections', 'collections', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('customers', 'customers', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('guarantors', 'guarantors', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('products', 'products', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('salesman', 'salesman', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('shop', 'shop', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']),
  ('users', 'users', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('vendors', 'vendors', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

COMMIT;

-- Alternative if storage.buckets insert is restricted, use Supabase helper per bucket:
-- SELECT storage.create_bucket('brands', true);
-- SELECT storage.create_bucket('categories', true);
-- SELECT storage.create_bucket('collections', true);
-- SELECT storage.create_bucket('customers', false);
-- SELECT storage.create_bucket('guarantors', false);
-- SELECT storage.create_bucket('products', true);
-- SELECT storage.create_bucket('salesman', false);
-- SELECT storage.create_bucket('shop', true);
-- SELECT storage.create_bucket('users', false);
-- SELECT storage.create_bucket('vendors', false);
