-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('male', 'female', 'other');

-- CreateEnum
CREATE TYPE "product_tags" AS ENUM ('CHOICE', 'RECOMMENDED', 'TRENDING', 'hotSeller', 'flashSale', 'newArrival', 'AUTHENTIC');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('pending', 'ready', 'confirmed', 'cancelled', 'delivered', 'processing', 'completed');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('cod', 'credit_card', 'bank_transfer', 'pickup', 'jazzcash');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('percentage', 'fixed');

-- CreateEnum
CREATE TYPE "SeverityLevel" AS ENUM ('info', 'warning', 'error', 'critical');

-- CreateEnum
CREATE TYPE "PurchaseReceiptStatus" AS ENUM ('draft', 'received', 'cancelled');

-- CreateEnum
CREATE TYPE "MovementReason" AS ENUM ('initial', 'order_placed', 'order_cancelled', 'purchase_received', 'purchase_reversed', 'manual_adjustment', 'correction', 'return');

-- CreateTable
CREATE TABLE "customers" (
    "customer_id" SERIAL NOT NULL,
    "phone_number" TEXT DEFAULT '',
    "first_name" TEXT NOT NULL DEFAULT '',
    "last_name" TEXT DEFAULT '',
    "cnic" TEXT DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "dob" TIMESTAMPTZ,
    "gender" "Gender",
    "auth_uid" TEXT,
    "fcm_token" TEXT,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("customer_id")
);

-- CreateTable
CREATE TABLE "categories" (
    "category_id" SERIAL NOT NULL,
    "category_name" TEXT NOT NULL,
    "isFeatured" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "product_count" INTEGER,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("category_id")
);

-- CreateTable
CREATE TABLE "brands" (
    "brandID" SERIAL NOT NULL,
    "brandname" TEXT,
    "isVerified" BOOLEAN DEFAULT false,
    "isFeatured" BOOLEAN,
    "product_count" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("brandID")
);

-- CreateTable
CREATE TABLE "products" (
    "product_id" SERIAL NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "description" TEXT DEFAULT '',
    "base_price" TEXT DEFAULT '',
    "sale_price" TEXT DEFAULT '',
    "category_id" INTEGER DEFAULT 11,
    "ispopular" BOOLEAN DEFAULT false,
    "stock_quantity" INTEGER DEFAULT 0,
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "brandID" INTEGER DEFAULT 20,
    "alert_stock" INTEGER,
    "isVisible" BOOLEAN DEFAULT false,
    "tag" "product_tags",
    "price_range" TEXT DEFAULT '--',
    "min_price" DECIMAL(12,2),
    "max_price" DECIMAL(12,2),
    "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "products_pkey" PRIMARY KEY ("product_id")
);

-- CreateTable
CREATE TABLE "product_variants" (
    "variant_id" SERIAL NOT NULL,
    "product_id" INTEGER NOT NULL,
    "buy_price" DECIMAL NOT NULL,
    "sell_price" DECIMAL NOT NULL,
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "sku" VARCHAR,
    "variant_name" TEXT NOT NULL,
    "is_visible" BOOLEAN DEFAULT true,
    "stock" INTEGER DEFAULT 0,
    "alert_stock" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("variant_id")
);

-- CreateTable
CREATE TABLE "cart" (
    "cart_id" SERIAL NOT NULL,
    "variant_id" INTEGER,
    "quantity" TEXT NOT NULL DEFAULT '',
    "customer_id" INTEGER,

    CONSTRAINT "cart_pkey" PRIMARY KEY ("cart_id")
);

-- CreateTable
CREATE TABLE "wishlist" (
    "wishlist_id" BIGSERIAL NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "product_id" INTEGER,
    "customer_id" INTEGER,

    CONSTRAINT "wishlist_pkey" PRIMARY KEY ("wishlist_id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "review_id" BIGSERIAL NOT NULL,
    "product_id" INTEGER,
    "sent_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "review" TEXT DEFAULT '',
    "rating" DECIMAL,
    "customer_id" INTEGER,
    "is_hidden" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("review_id")
);

-- CreateTable
CREATE TABLE "addresses" (
    "address_id" SERIAL NOT NULL,
    "shipping_address" TEXT DEFAULT '',
    "phone_number" TEXT DEFAULT '',
    "postal_code" TEXT DEFAULT '',
    "city" TEXT DEFAULT '',
    "country" TEXT DEFAULT '',
    "full_name" TEXT NOT NULL,
    "customer_id" INTEGER,
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "place_id" TEXT,
    "formatted_address" TEXT,

    CONSTRAINT "addresses_pkey" PRIMARY KEY ("address_id")
);

-- CreateTable
CREATE TABLE "order_addresses" (
    "order_address_id" SERIAL NOT NULL,
    "shipping_address" TEXT DEFAULT '',
    "phone_number" TEXT DEFAULT '',
    "postal_code" TEXT DEFAULT '',
    "city" TEXT DEFAULT '',
    "country" TEXT DEFAULT '',
    "full_name" TEXT NOT NULL,
    "customer_id" INTEGER,
    "address_id" INTEGER,
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "place_id" TEXT,
    "formatted_address" TEXT,

    CONSTRAINT "order_addresses_pkey" PRIMARY KEY ("order_address_id")
);

-- CreateTable
CREATE TABLE "orders" (
    "order_id" SERIAL NOT NULL,
    "order_date" DATE NOT NULL,
    "sub_total" DECIMAL NOT NULL,
    "status" "OrderStatus" NOT NULL,
    "address_id" INTEGER,
    "paid_amount" DECIMAL,
    "buying_price" DECIMAL,
    "discount" DECIMAL DEFAULT 0.0,
    "tax" DECIMAL DEFAULT 0.0,
    "shipping_fee" DECIMAL DEFAULT 0.0,
    "customer_id" INTEGER,
    "idempotency_key" VARCHAR,
    "payment_method" "PaymentMethod" DEFAULT 'cod',
    "shipping_method" TEXT,
    "payment_receipt_path" TEXT,
    "cancel_reason" TEXT,
    "admin_note" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("order_id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "product_id" INTEGER NOT NULL,
    "price" DECIMAL NOT NULL,
    "quantity" INTEGER NOT NULL,
    "order_id" INTEGER NOT NULL,
    "unit" VARCHAR,
    "total_buy_price" DECIMAL DEFAULT 0.0,
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "variant_id" INTEGER NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("product_id","order_id","variant_id")
);

-- CreateTable
CREATE TABLE "shop" (
    "shop_id" SERIAL NOT NULL,
    "shopname" TEXT NOT NULL,
    "taxrate" DECIMAL NOT NULL,
    "shipping_price" DECIMAL NOT NULL,
    "threshold_free_shipping" DECIMAL,
    "software_company_name" TEXT,
    "software_website_link" TEXT,
    "software_contact_no" TEXT,
    "is_shipping_enable" BOOLEAN NOT NULL DEFAULT false,
    "max_allowed_item_quantity" BIGINT NOT NULL DEFAULT 50,
    "is_advance_payment_receipt_mandatory" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "shop_pkey" PRIMARY KEY ("shop_id")
);

-- CreateTable
CREATE TABLE "images" (
    "image_id" SERIAL NOT NULL,
    "filename" TEXT,
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "image_url" TEXT,
    "folderType" TEXT,

    CONSTRAINT "images_pkey" PRIMARY KEY ("image_id")
);

-- CreateTable
CREATE TABLE "image_entity" (
    "image_entity_id" SERIAL NOT NULL,
    "image_id" INTEGER,
    "entity_id" INTEGER,
    "entity_category" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isFeatured" BOOLEAN DEFAULT false,
    "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "image_entity_pkey" PRIMARY KEY ("image_entity_id")
);

-- CreateTable
CREATE TABLE "product_discounts" (
    "discount_id" SERIAL NOT NULL,
    "product_id" INTEGER NOT NULL,
    "discount_type" "DiscountType" NOT NULL,
    "amount" DECIMAL NOT NULL,
    "start_date" TIMESTAMPTZ NOT NULL,
    "end_date" TIMESTAMPTZ NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_discounts_pkey" PRIMARY KEY ("discount_id")
);

-- CreateTable
CREATE TABLE "invoice_coupons" (
    "coupon_id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "coupon_code" TEXT NOT NULL,
    "discount_type" "DiscountType" NOT NULL,
    "amount" DECIMAL NOT NULL,
    "usage_limit" INTEGER,
    "used_count" INTEGER NOT NULL DEFAULT 0,
    "start_date" TIMESTAMPTZ NOT NULL,
    "end_date" TIMESTAMPTZ NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_coupons_pkey" PRIMARY KEY ("coupon_id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "notification_id" SERIAL NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,
    "sub_description" TEXT,
    "isRead" BOOLEAN DEFAULT false,
    "NotificationType" TEXT,
    "expires_at" TIMESTAMPTZ,
    "order_id" INTEGER,
    "product_id" INTEGER,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("notification_id")
);

-- CreateTable
CREATE TABLE "inventory_reservations" (
    "reservation_id" VARCHAR NOT NULL,
    "variant_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_reservations_pkey" PRIMARY KEY ("reservation_id","variant_id")
);

-- CreateTable
CREATE TABLE "security_audit_log" (
    "log_id" SERIAL NOT NULL,
    "event_type" VARCHAR NOT NULL,
    "event_data" JSONB,
    "timestamp" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "ip_address" INET,
    "user_agent" TEXT,
    "customer_id" INTEGER,
    "severity" "SeverityLevel" DEFAULT 'info',

    CONSTRAINT "security_audit_log_pkey" PRIMARY KEY ("log_id")
);

-- CreateTable
CREATE TABLE "app_versions" (
    "id" BIGSERIAL NOT NULL,
    "version" TEXT NOT NULL,
    "force_update" BOOLEAN NOT NULL DEFAULT false,
    "redirect_url" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "app_locked" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "app_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchases" (
    "purchase_id" BIGSERIAL NOT NULL,
    "purchase_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "supplier_name" TEXT,
    "reference" TEXT,
    "note" TEXT,
    "receipt_status" "PurchaseReceiptStatus" NOT NULL DEFAULT 'draft',
    "sub_total" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "shipping_fee" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "discount" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "total" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "received_at" TIMESTAMPTZ,
    "created_by" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchases_pkey" PRIMARY KEY ("purchase_id")
);

-- CreateTable
CREATE TABLE "purchase_items" (
    "purchase_item_id" BIGSERIAL NOT NULL,
    "purchase_id" BIGINT NOT NULL,
    "product_id" INTEGER NOT NULL,
    "variant_id" INTEGER NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_items_pkey" PRIMARY KEY ("purchase_item_id")
);

-- CreateTable
CREATE TABLE "inventory_movements" (
    "movement_id" BIGSERIAL NOT NULL,
    "variant_id" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,
    "delta" INTEGER NOT NULL,
    "stock_after" INTEGER NOT NULL,
    "reason" "MovementReason" NOT NULL,
    "ref_type" TEXT,
    "ref_id" TEXT,
    "unit_cost" DECIMAL(12,2),
    "note" TEXT,
    "actor" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_movements_pkey" PRIMARY KEY ("movement_id")
);

-- CreateTable
CREATE TABLE "order_payments" (
    "payment_id" BIGSERIAL NOT NULL,
    "order_id" INTEGER NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "reference" TEXT,
    "note" TEXT,
    "receipt_path" TEXT,
    "received_by" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_payments_pkey" PRIMARY KEY ("payment_id")
);

-- CreateTable
CREATE TABLE "admin_audit_log" (
    "log_id" BIGSERIAL NOT NULL,
    "actor_admin_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "before" JSONB,
    "after" JSONB,
    "ip_address" TEXT,
    "request_id" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_log_pkey" PRIMARY KEY ("log_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "customers_auth_uid_key" ON "customers"("auth_uid");

-- CreateIndex
CREATE INDEX "products_category_id_idx" ON "products"("category_id");

-- CreateIndex
CREATE INDEX "products_brandID_idx" ON "products"("brandID");

-- CreateIndex
CREATE INDEX "products_isVisible_idx" ON "products"("isVisible");

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_sku_key" ON "product_variants"("sku");

-- CreateIndex
CREATE INDEX "reviews_product_id_idx" ON "reviews"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "orders_idempotency_key_key" ON "orders"("idempotency_key");

-- CreateIndex
CREATE INDEX "orders_status_order_date_idx" ON "orders"("status", "order_date");

-- CreateIndex
CREATE INDEX "orders_customer_id_idx" ON "orders"("customer_id");

-- CreateIndex
CREATE INDEX "order_items_order_id_idx" ON "order_items"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_coupons_coupon_code_key" ON "invoice_coupons"("coupon_code");

-- CreateIndex
CREATE INDEX "notifications_isRead_created_at_idx" ON "notifications"("isRead", "created_at");

-- CreateIndex
CREATE INDEX "purchases_receipt_status_purchase_date_idx" ON "purchases"("receipt_status", "purchase_date");

-- CreateIndex
CREATE INDEX "purchase_items_purchase_id_idx" ON "purchase_items"("purchase_id");

-- CreateIndex
CREATE INDEX "inventory_movements_variant_id_created_at_idx" ON "inventory_movements"("variant_id", "created_at");

-- CreateIndex
CREATE INDEX "inventory_movements_ref_type_ref_id_idx" ON "inventory_movements"("ref_type", "ref_id");

-- CreateIndex
CREATE INDEX "order_payments_order_id_idx" ON "order_payments"("order_id");

-- CreateIndex
CREATE INDEX "admin_audit_log_created_at_idx" ON "admin_audit_log"("created_at");

-- CreateIndex
CREATE INDEX "admin_audit_log_entity_type_entity_id_idx" ON "admin_audit_log"("entity_type", "entity_id");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("category_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_brandID_fkey" FOREIGN KEY ("brandID") REFERENCES "brands"("brandID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("product_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart" ADD CONSTRAINT "cart_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("variant_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart" ADD CONSTRAINT "cart_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("customer_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlist" ADD CONSTRAINT "wishlist_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("product_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlist" ADD CONSTRAINT "wishlist_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("customer_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("product_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("customer_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("customer_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_addresses" ADD CONSTRAINT "order_addresses_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("customer_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_addresses" ADD CONSTRAINT "order_addresses_address_id_fkey" FOREIGN KEY ("address_id") REFERENCES "addresses"("address_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_address_id_fkey" FOREIGN KEY ("address_id") REFERENCES "addresses"("address_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("customer_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("order_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("product_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "image_entity" ADD CONSTRAINT "image_entity_image_id_fkey" FOREIGN KEY ("image_id") REFERENCES "images"("image_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_discounts" ADD CONSTRAINT "product_discounts_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("product_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("order_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("product_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_reservations" ADD CONSTRAINT "inventory_reservations_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("variant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_purchase_id_fkey" FOREIGN KEY ("purchase_id") REFERENCES "purchases"("purchase_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("product_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("variant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("variant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("product_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_payments" ADD CONSTRAINT "order_payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("order_id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- ---------------------------------------------------------------------------
-- Hand-written additions (Prisma cannot express these)
-- ---------------------------------------------------------------------------

-- Fast, typo-tolerant search (plan section 4.10)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX "products_name_trgm_idx" ON "products" USING gin ("name" gin_trgm_ops);
CREATE INDEX "brands_name_trgm_idx" ON "brands" USING gin ("brandname" gin_trgm_ops);
CREATE INDEX "categories_name_trgm_idx" ON "categories" USING gin ("category_name" gin_trgm_ops);
CREATE INDEX "variants_sku_trgm_idx" ON "product_variants" USING gin ("sku" gin_trgm_ops);

-- Stock can never go negative, even if application code has a bug
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_stock_nonneg" CHECK ("stock" IS NULL OR "stock" >= 0);
