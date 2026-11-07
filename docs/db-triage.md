# Database triage: what moves to Neon and what stays behind

**Status: preliminary.** This list comes from the old Prisma schema and the backend and admin code. It has **not** yet been checked against the live Supabase database, because the Supabase tool was not connected when this was written. Run `node scripts/migrate-from-supabase.mjs` (dry run) once `SUPABASE_DATABASE_URL` is set: it prints every table it finds, and any table in Supabase that is not in this list is something to look at here before cutover.

Rule: **Keep** = the store or the new admin uses it. **Archive** = ERP/POS history; saved as a dump file in R2 (`kks-private/archive/`), not restored into Neon. **Drop** = unused.

## Keep (copied to Neon by `scripts/migrate-from-supabase.mjs`)

| Table | Used by | Notes |
|---|---|---|
| `customers` | storefront, admin | Google sign-in links via `auth_uid` |
| `addresses`, `order_addresses` | checkout, orders | `vendor_id`, `salesman_id`, `user_id` columns are dropped |
| `categories`, `brands` | catalog | |
| `products`, `product_variants` | catalog, stock | New: `min_price`, `max_price`, `updated_at`. Negative stock is clamped to 0 while copying |
| `images`, `image_entity` | pictures | Key in R2 is `folderType/filename` |
| `orders`, `order_items` | checkout, orders | ERP columns (`saletype`, `salesman_*`, `user_id`) dropped. New: `created_at`, `updated_at`, `cancel_reason`, `cancelled_at`, `admin_note` |
| `cart`, `wishlist`, `reviews` | storefront | `reviews.is_hidden` is new |
| `shop`, `app_versions` | settings | |
| `notifications` | admin bell | `installment_plan_id` dropped |
| `product_discounts`, `invoice_coupons` | not used by the storefront yet | Kept so a later discounts feature has its data |
| `collections`, `collection_items`, `collection_cart`, `collection_cart_items` | storefront bundles | Exist in the live database but were never in the Prisma schema; now they are |

## New in Neon (created by the migrations)

`inventory_movements` (stock ledger), `order_payments`, `order_status_history`, `purchases` and `purchase_items` (stock receipts, no vendors), `admin_audit_log`.

## Archive (ERP / POS: dumped, not restored)

| Table | Why it is scope creep |
|---|---|
| `users` | Supabase-auth-linked staff for the old Flutter admin. Replaced by the fixed admin accounts |
| `vendors` | Vendor management was removed |
| `salesman` | Commission / salesman feature of the POS |
| `guarantors`, `installment_plans`, `installment_payments` | Installment sales (POS) |
| `account_book`, `expenses` | Accounting of the ERP |
| `purchases`, `purchase_items` (old shape) | Vendor-linked purchasing. Replaced by the new stock receipts |
| `extras` | Held the shared admin signup key (a security hole) |
| `kiosk_cart` | In-store kiosk (POS); there is no mobile app or kiosk |

Archive command (run from the backend folder with the old database URL, using the PostgreSQL 18 tools):

```
pg_dump "$SUPABASE_DATABASE_URL" --format=custom --no-owner --no-acl \
  -t users -t vendors -t salesman -t guarantors -t installment_plans -t installment_payments \
  -t account_book -t expenses -t purchases -t purchase_items -t extras -t kiosk_cart \
  --file=erp-archive.pgdump
```

Then upload `erp-archive.pgdump` to `kks-private/archive/` (see runbook 13). Keep it for good: it is the only copy of that history once the Supabase project is deleted.

## Skipped on purpose

| Table | Why |
|---|---|
| `inventory_reservations` | Short-lived checkout holds; nothing to carry over |
| `security_audit_log` | Old technical log; optional, not needed |

## Supabase-only things (gate G3) still to check

To confirm when Supabase access exists: functions, triggers, views, extensions, Row Level Security policies and edge functions. Expected handling: every one is dropped or replaced (plan section 0.4, G3). The store's own triggers (`notify_low_stock`, `product_variant_stock_trigger`) are replaced by `applyStockChanges` in `src/services/inventory.service.ts`.
