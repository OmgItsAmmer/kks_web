# Row Level Security (RLS) — KKS Online Database

This document defines RLS for the Supabase PostgreSQL schema documented in [schema.md](./schema.md) and [schema_doc.md](./schema_doc.md).

## Architecture

| Access path | Role | RLS |
|-------------|------|-----|
| Express backend (Prisma) | `service_role` | **Bypasses RLS** — full access |
| Mobile / web client via Supabase client | `authenticated` | Customer-scoped + catalog read |
| Unauthenticated storefront | `anon` | Public catalog read only |
| Shop owner admin panel (future) | `authenticated` + `shop.owner_auth_uid` | Full admin write |

**Identity link:** `customers.auth_uid = auth.uid()::text` (Google / Supabase Auth).

**Admin link:** `shop.owner_auth_uid = auth.uid()::text`.

## Helper functions

| Function | Purpose |
|----------|---------|
| `auth_customer_id()` | Returns `customer_id` for the current JWT, or `NULL` |
| `is_shop_owner()` | `true` when JWT matches `shop.owner_auth_uid` |
| `owns_order(order_id)` | `true` when order belongs to current customer |

## Policy summary by table

### Public catalog (anon + authenticated READ)

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| `products` | Visible products only (`isVisible = true`) | Owner | Owner | Owner |
| `product_variants` | Visible variant + visible product | Owner | Owner | Owner |
| `categories` | All rows | Owner | Owner | Owner |
| `brands` | All rows | Owner | Owner | Owner |
| `collections` | Active only (`is_active = true`) | Owner | Owner | Owner |
| `collection_items` | Active collection + visible variant | Owner | Owner | Owner |
| `shop` | All rows | Owner | Owner | Owner |
| `app_versions` | All rows | Owner | Owner | Owner |
| `reviews` | All rows (product ratings) | Own customer | Own customer | Own customer |

### Customer-owned data (authenticated only)

| Table | Policy |
|-------|--------|
| `customers` | SELECT/UPDATE own row (`auth_uid = auth.uid()`) |
| `addresses` | ALL where `customer_id = auth_customer_id()` |
| `cart` | ALL where `customer_id = auth_customer_id()` |
| `wishlist` | ALL where `customer_id = auth_customer_id()` |
| `orders` | SELECT where `customer_id = auth_customer_id()` |
| `order_items` | SELECT via parent order ownership |
| `order_addresses` | SELECT where `customer_id = auth_customer_id()` |
| `collection_cart` | ALL where `customer_id = auth_customer_id()` |
| `collection_cart_items` | ALL via parent `collection_cart` ownership |
| `notifications` | SELECT when linked order belongs to customer |

### Backend-only (no anon/authenticated direct access)

These tables have RLS enabled with **no** policies for `anon` or `authenticated`. Only `service_role` (Express API) can access them:

- `account_book`, `expenses`, `extras`
- `users`, `vendors`, `salesman`, `guarantors`
- `purchases`, `purchase_items`
- `product_discounts`, `invoice_coupons`
- `installment_plans`, `installment_payments`
- `inventory_reservations`, `kiosk_cart`
- `images`, `image_entity`
- `security_audit_log`

### Views

Views (`collections_summary`, `collection_items_detail`, `customer_public_info`, `inventory_status`, `account_book_summary`, `monthly_account_summary`, `security_dashboard`) inherit effective access from underlying tables. Do not expose views that aggregate sensitive data to `anon` without reviewing base-table policies.

## Shop owner override

When `is_shop_owner()` is true, authenticated users may **INSERT/UPDATE/DELETE** on catalog and operational tables (products, variants, categories, brands, collections, shop config, app_versions, orders status, expenses, etc.). See migration for exact policy names prefixed with `owner_`.

## Applying migrations

Run in Supabase SQL Editor or CI, in order:

1. [migrations/001_rls_policies.sql](./migrations/001_rls_policies.sql) — table RLS
2. [migrations/002_storage_buckets.sql](./migrations/002_storage_buckets.sql) — create buckets
3. [migrations/003_storage_rls_policies.sql](./migrations/003_storage_rls_policies.sql) — storage RLS

Storage policy details: [RLS_storage_policies.md](./RLS_storage_policies.md).

## Verification checklist

```sql
-- Should return policies for each protected table
SELECT schemaname, tablename, policyname, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Confirm RLS is on
SELECT relname, relrowsecurity
FROM pg_class
JOIN pg_namespace n ON n.oid = relnamespace
WHERE n.nspname = 'public' AND relkind = 'r'
ORDER BY relname;
```

## Notes

- Minimum order amounts, checkout security, and inventory reservation logic remain in the **Express backend**; RLS is a second layer for direct database access.
- CNIC, phone, and FCM tokens in `customers` are only readable by the owning customer or service role.
- For production, rotate and never expose `service_role` in client apps.
