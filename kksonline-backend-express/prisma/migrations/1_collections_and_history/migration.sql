-- Order status history, cancelled_at, and the collections (bundles) tables the storefront reads with raw SQL.
ALTER TABLE "orders" ADD COLUMN "cancelled_at" TIMESTAMPTZ;

CREATE TABLE "order_status_history" (
  "history_id" BIGSERIAL PRIMARY KEY,
  "order_id" INTEGER NOT NULL,
  "from_status" "OrderStatus",
  "to_status" "OrderStatus" NOT NULL,
  "note" TEXT,
  "actor" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "order_status_history_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("order_id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "order_status_history_order_id_created_at_idx" ON "order_status_history"("order_id", "created_at");

CREATE TABLE "collections" (
  "collection_id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "image_url" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "is_featured" BOOLEAN NOT NULL DEFAULT false,
  "is_premium" BOOLEAN NOT NULL DEFAULT false,
  "display_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "collection_items" (
  "collection_item_id" SERIAL PRIMARY KEY,
  "collection_id" INTEGER NOT NULL,
  "variant_id" INTEGER NOT NULL,
  "default_quantity" INTEGER NOT NULL DEFAULT 1,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "collection_items_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "collections"("collection_id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "collection_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("variant_id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "collection_items_collection_id_variant_id_key" ON "collection_items"("collection_id", "variant_id");

CREATE TABLE "collection_cart" (
  "collection_cart_id" SERIAL PRIMARY KEY,
  "customer_id" INTEGER NOT NULL,
  "collection_id" INTEGER NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "collection_cart_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("customer_id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "collection_cart_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "collections"("collection_id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "collection_cart_customer_id_collection_id_key" ON "collection_cart"("customer_id", "collection_id");

CREATE TABLE "collection_cart_items" (
  "collection_cart_item_id" SERIAL PRIMARY KEY,
  "collection_cart_id" INTEGER NOT NULL,
  "variant_id" INTEGER NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "collection_cart_items_collection_cart_id_fkey" FOREIGN KEY ("collection_cart_id") REFERENCES "collection_cart"("collection_cart_id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "collection_cart_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("variant_id") ON DELETE CASCADE ON UPDATE CASCADE
);
