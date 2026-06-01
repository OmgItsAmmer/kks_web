-- =============================================================================
-- 001_rls_policies.sql
-- KKS Online — PostgreSQL table Row Level Security
-- Run in Supabase SQL Editor after schema exists.
-- Docs: ../RLS_policies.md
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- Helper functions
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.auth_customer_id()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.customer_id
  FROM public.customers c
  WHERE c.auth_uid = auth.uid()::text
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_shop_owner()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.shop s
    WHERE s.owner_auth_uid = auth.uid()::text
  );
$$;

CREATE OR REPLACE FUNCTION public.owns_order(p_order_id integer)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.order_id = p_order_id
      AND o.customer_id = public.auth_customer_id()
  );
$$;

REVOKE ALL ON FUNCTION public.auth_customer_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_shop_owner() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.owns_order(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auth_customer_id() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_shop_owner() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.owns_order(integer) TO authenticated;

-- -----------------------------------------------------------------------------
-- Enable RLS on all application tables
-- -----------------------------------------------------------------------------

ALTER TABLE public.account_book ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_cart ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guarantors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.image_entity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installment_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kiosk_cart ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salesman ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- Drop existing policies (idempotent re-run)
-- -----------------------------------------------------------------------------

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- PUBLIC CATALOG — products & variants
-- -----------------------------------------------------------------------------

CREATE POLICY catalog_products_select
  ON public.products FOR SELECT
  TO anon, authenticated
  USING (COALESCE("isVisible", false) = true);

CREATE POLICY owner_products_write
  ON public.products FOR ALL
  TO authenticated
  USING (public.is_shop_owner())
  WITH CHECK (public.is_shop_owner());

CREATE POLICY catalog_variants_select
  ON public.product_variants FOR SELECT
  TO anon, authenticated
  USING (
    COALESCE(is_visible, false) = true
    AND EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.product_id = product_variants.product_id
        AND COALESCE(p."isVisible", false) = true
    )
  );

CREATE POLICY owner_variants_write
  ON public.product_variants FOR ALL
  TO authenticated
  USING (public.is_shop_owner())
  WITH CHECK (public.is_shop_owner());

-- -----------------------------------------------------------------------------
-- PUBLIC CATALOG — categories, brands, collections
-- -----------------------------------------------------------------------------

CREATE POLICY catalog_categories_select
  ON public.categories FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY owner_categories_write
  ON public.categories FOR ALL
  TO authenticated
  USING (public.is_shop_owner())
  WITH CHECK (public.is_shop_owner());

CREATE POLICY catalog_brands_select
  ON public.brands FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY owner_brands_write
  ON public.brands FOR ALL
  TO authenticated
  USING (public.is_shop_owner())
  WITH CHECK (public.is_shop_owner());

CREATE POLICY catalog_collections_select
  ON public.collections FOR SELECT
  TO anon, authenticated
  USING (COALESCE(is_active, false) = true);

CREATE POLICY owner_collections_write
  ON public.collections FOR ALL
  TO authenticated
  USING (public.is_shop_owner())
  WITH CHECK (public.is_shop_owner());

CREATE POLICY catalog_collection_items_select
  ON public.collection_items FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.collections c
      WHERE c.collection_id = collection_items.collection_id
        AND COALESCE(c.is_active, false) = true
    )
    AND EXISTS (
      SELECT 1 FROM public.product_variants pv
      JOIN public.products p ON p.product_id = pv.product_id
      WHERE pv.variant_id = collection_items.variant_id
        AND COALESCE(pv.is_visible, false) = true
        AND COALESCE(p."isVisible", false) = true
    )
  );

CREATE POLICY owner_collection_items_write
  ON public.collection_items FOR ALL
  TO authenticated
  USING (public.is_shop_owner())
  WITH CHECK (public.is_shop_owner());

-- -----------------------------------------------------------------------------
-- PUBLIC — shop config & app versions
-- -----------------------------------------------------------------------------

CREATE POLICY catalog_shop_select
  ON public.shop FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY owner_shop_write
  ON public.shop FOR ALL
  TO authenticated
  USING (public.is_shop_owner())
  WITH CHECK (public.is_shop_owner());

CREATE POLICY catalog_app_versions_select
  ON public.app_versions FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY owner_app_versions_write
  ON public.app_versions FOR ALL
  TO authenticated
  USING (public.is_shop_owner())
  WITH CHECK (public.is_shop_owner());

-- -----------------------------------------------------------------------------
-- REVIEWS — public read, customer write own
-- -----------------------------------------------------------------------------

CREATE POLICY reviews_public_select
  ON public.reviews FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY reviews_customer_insert
  ON public.reviews FOR INSERT
  TO authenticated
  WITH CHECK (customer_id = public.auth_customer_id());

CREATE POLICY reviews_customer_update
  ON public.reviews FOR UPDATE
  TO authenticated
  USING (customer_id = public.auth_customer_id())
  WITH CHECK (customer_id = public.auth_customer_id());

CREATE POLICY reviews_customer_delete
  ON public.reviews FOR DELETE
  TO authenticated
  USING (customer_id = public.auth_customer_id());

CREATE POLICY owner_reviews_delete
  ON public.reviews FOR DELETE
  TO authenticated
  USING (public.is_shop_owner());

-- -----------------------------------------------------------------------------
-- CUSTOMER profile
-- -----------------------------------------------------------------------------

CREATE POLICY customers_select_own
  ON public.customers FOR SELECT
  TO authenticated
  USING (auth_uid = auth.uid()::text);

CREATE POLICY customers_update_own
  ON public.customers FOR UPDATE
  TO authenticated
  USING (auth_uid = auth.uid()::text)
  WITH CHECK (auth_uid = auth.uid()::text);

CREATE POLICY owner_customers_read
  ON public.customers FOR SELECT
  TO authenticated
  USING (public.is_shop_owner());

-- -----------------------------------------------------------------------------
-- CUSTOMER-owned — addresses, cart, wishlist
-- -----------------------------------------------------------------------------

CREATE POLICY addresses_customer_all
  ON public.addresses FOR ALL
  TO authenticated
  USING (customer_id = public.auth_customer_id())
  WITH CHECK (customer_id = public.auth_customer_id());

CREATE POLICY cart_customer_all
  ON public.cart FOR ALL
  TO authenticated
  USING (customer_id = public.auth_customer_id())
  WITH CHECK (customer_id = public.auth_customer_id());

CREATE POLICY wishlist_customer_all
  ON public.wishlist FOR ALL
  TO authenticated
  USING (customer_id = public.auth_customer_id())
  WITH CHECK (customer_id = public.auth_customer_id());

-- -----------------------------------------------------------------------------
-- CUSTOMER-owned — orders & related
-- -----------------------------------------------------------------------------

CREATE POLICY orders_customer_select
  ON public.orders FOR SELECT
  TO authenticated
  USING (customer_id = public.auth_customer_id());

CREATE POLICY owner_orders_all
  ON public.orders FOR ALL
  TO authenticated
  USING (public.is_shop_owner())
  WITH CHECK (public.is_shop_owner());

CREATE POLICY order_items_customer_select
  ON public.order_items FOR SELECT
  TO authenticated
  USING (public.owns_order(order_id));

CREATE POLICY owner_order_items_all
  ON public.order_items FOR ALL
  TO authenticated
  USING (public.is_shop_owner())
  WITH CHECK (public.is_shop_owner());

CREATE POLICY order_addresses_customer_select
  ON public.order_addresses FOR SELECT
  TO authenticated
  USING (customer_id = public.auth_customer_id());

CREATE POLICY owner_order_addresses_all
  ON public.order_addresses FOR ALL
  TO authenticated
  USING (public.is_shop_owner())
  WITH CHECK (public.is_shop_owner());

-- -----------------------------------------------------------------------------
-- CUSTOMER-owned — collection cart
-- -----------------------------------------------------------------------------

CREATE POLICY collection_cart_customer_all
  ON public.collection_cart FOR ALL
  TO authenticated
  USING (customer_id = public.auth_customer_id())
  WITH CHECK (customer_id = public.auth_customer_id());

CREATE POLICY collection_cart_items_customer_all
  ON public.collection_cart_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.collection_cart cc
      WHERE cc.collection_cart_id = collection_cart_items.collection_cart_id
        AND cc.customer_id = public.auth_customer_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.collection_cart cc
      WHERE cc.collection_cart_id = collection_cart_items.collection_cart_id
        AND cc.customer_id = public.auth_customer_id()
    )
  );

-- -----------------------------------------------------------------------------
-- CUSTOMER notifications (via order ownership)
-- -----------------------------------------------------------------------------

CREATE POLICY notifications_customer_select
  ON public.notifications FOR SELECT
  TO authenticated
  USING (
    order_id IS NOT NULL
    AND public.owns_order(order_id)
  );

CREATE POLICY owner_notifications_all
  ON public.notifications FOR ALL
  TO authenticated
  USING (public.is_shop_owner())
  WITH CHECK (public.is_shop_owner());

-- -----------------------------------------------------------------------------
-- SHOP OWNER — operational tables (no anon/authenticated customer access)
-- -----------------------------------------------------------------------------

CREATE POLICY owner_expenses_all
  ON public.expenses FOR ALL
  TO authenticated
  USING (public.is_shop_owner())
  WITH CHECK (public.is_shop_owner());

CREATE POLICY owner_account_book_all
  ON public.account_book FOR ALL
  TO authenticated
  USING (public.is_shop_owner())
  WITH CHECK (public.is_shop_owner());

CREATE POLICY owner_product_discounts_all
  ON public.product_discounts FOR ALL
  TO authenticated
  USING (public.is_shop_owner())
  WITH CHECK (public.is_shop_owner());

CREATE POLICY owner_invoice_coupons_all
  ON public.invoice_coupons FOR ALL
  TO authenticated
  USING (public.is_shop_owner())
  WITH CHECK (public.is_shop_owner());

CREATE POLICY owner_installment_plans_all
  ON public.installment_plans FOR ALL
  TO authenticated
  USING (public.is_shop_owner())
  WITH CHECK (public.is_shop_owner());

CREATE POLICY owner_installment_payments_all
  ON public.installment_payments FOR ALL
  TO authenticated
  USING (public.is_shop_owner())
  WITH CHECK (public.is_shop_owner());

CREATE POLICY owner_purchases_all
  ON public.purchases FOR ALL
  TO authenticated
  USING (public.is_shop_owner())
  WITH CHECK (public.is_shop_owner());

CREATE POLICY owner_purchase_items_all
  ON public.purchase_items FOR ALL
  TO authenticated
  USING (public.is_shop_owner())
  WITH CHECK (public.is_shop_owner());

CREATE POLICY owner_users_all
  ON public.users FOR ALL
  TO authenticated
  USING (public.is_shop_owner())
  WITH CHECK (public.is_shop_owner());

CREATE POLICY owner_vendors_all
  ON public.vendors FOR ALL
  TO authenticated
  USING (public.is_shop_owner())
  WITH CHECK (public.is_shop_owner());

CREATE POLICY owner_salesman_all
  ON public.salesman FOR ALL
  TO authenticated
  USING (public.is_shop_owner())
  WITH CHECK (public.is_shop_owner());

CREATE POLICY owner_guarantors_all
  ON public.guarantors FOR ALL
  TO authenticated
  USING (public.is_shop_owner())
  WITH CHECK (public.is_shop_owner());

CREATE POLICY owner_images_all
  ON public.images FOR ALL
  TO authenticated
  USING (public.is_shop_owner())
  WITH CHECK (public.is_shop_owner());

CREATE POLICY owner_image_entity_all
  ON public.image_entity FOR ALL
  TO authenticated
  USING (public.is_shop_owner())
  WITH CHECK (public.is_shop_owner());

-- -----------------------------------------------------------------------------
-- Backend-only tables: RLS enabled, no client policies
-- (service_role bypasses RLS)
-- extras, inventory_reservations, kiosk_cart, security_audit_log
-- -----------------------------------------------------------------------------

COMMIT;
