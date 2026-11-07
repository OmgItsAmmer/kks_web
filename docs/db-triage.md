# Database triage: what moves to Neon and what stays behind

**Status: checked against the live Supabase database on 2026-11-07** (read-only queries through the Supabase tool; nothing was changed). Row counts below are exact counts from that day.

Rule: **Keep** = the store or the new admin uses it. **Archive** = ERP/POS history; saved as a dump file in R2 (`kks-private/archive/`), not restored into Neon. **Drop** = unused.

## Size (gate G2)

| What | Size | Limit | Verdict |
|---|---|---|---|
| Database | **24 MB** | Neon free 0.5 GB | Fits easily |
| Storage (images), 249 files | **39.9 MB** (about 30 MB of it PNG, the rest JPEG) | R2 free 10 GB | Fits easily. **No need for `--webp`**; copy as they are |

Per bucket: products 173 files / 29.4 MB, collections 11 / 5.2 MB, users 2 / 1.7 MB, brands 28 / 1.7 MB, customers 12 / 1.5 MB, categories 21 / 0.3 MB, shop 2 / 0 MB. Empty: guarantors, salesman, vendors, payment-receipts.

## Keep (copied to Neon by `scripts/migrate-from-supabase.mjs`)

| Table | Rows | Used by | Notes |
|---|---|---|---|
| `customers` | 44 | storefront, admin | Google sign-in links via `auth_uid` (all 44 have one, no duplicate emails). `token_version` dropped (all 0) |
| `addresses`, `order_addresses` | 87, 34 | checkout, orders | `vendor_id`, `salesman_id`, `user_id` columns are dropped |
| `categories`, `brands` | 18, 27 | catalog | |
| `products`, `product_variants` | 153, 335 | catalog, stock | New: `min_price`, `max_price`, `updated_at`. No negative stock found (clamp is a safety net). `base_price` / `sale_price` are empty text in 146 products: harmless, the real price is on the variant |
| `images`, `image_entity` | 289, 259 | pictures | Key in R2 is `folderType/filename`. See "Images that point at nothing" below |
| `orders`, `order_items` | 83, 193 | checkout, orders | ERP columns (`saletype`, `salesman_*`, `user_id`, `cart.kiosk_session_id`) dropped. New: `created_at`, `updated_at`, `cancel_reason`, `cancelled_at`, `admin_note`. Status mix: pending 46, ready 18, completed 12, processing 4, cancelled 3 |
| `cart`, `wishlist`, `reviews` | 28, 308, 46 | storefront | `reviews.is_hidden` is new |
| `shop`, `app_versions` | 1, 2 | settings | `shop.owner_auth_uid` dropped |
| `notifications` | 0 | admin bell | `installment_plan_id` dropped |
| `product_discounts`, `invoice_coupons` | 0, 0 | not used yet | Kept so a later discounts feature has its structure |
| `collections`, `collection_items`, `collection_cart`, `collection_cart_items` | 6, 24, 10, 44 | storefront bundles | No NULLs in columns that are NOT NULL in Neon, so they copy cleanly |

## New in Neon (created by the migrations)

`inventory_movements` (stock ledger), `order_payments`, `order_status_history`, `purchases` and `purchase_items` (stock receipts, no vendors), `admin_audit_log`.

## Archive (ERP / POS: dumped, not restored)

| Table | Rows | Why it is scope creep |
|---|---|---|
| `users` | 4 | Supabase-auth-linked staff for the old Flutter admin. Replaced by the fixed admin accounts |
| `vendors` | 8 | Vendor management was removed |
| `salesman` | 2 | Commission / salesman feature of the POS |
| `guarantors`, `installment_plans`, `installment_payments` | 0, 0, 0 | Installment sales (POS), never used |
| `account_book`, `expenses` | 2, 3 | Accounting of the ERP |
| `purchases`, `purchase_items` (old shape) | 140, 402 | Vendor-linked purchasing. Replaced by the new stock receipts. **This is real history (140 purchases), so the dump matters** |
| `extras` | 1 | Held the shared admin signup key (a security hole). Do not copy its contents anywhere |
| `kiosk_cart` | 14 | In-store kiosk (POS); there is no mobile app or kiosk |

Archive command (run from the backend folder with the old database URL, using the PostgreSQL 18 tools):

```
pg_dump "$SUPABASE_DATABASE_URL" --format=custom --no-owner --no-acl \
  -t users -t vendors -t salesman -t guarantors -t installment_plans -t installment_payments \
  -t account_book -t expenses -t purchases -t purchase_items -t extras -t kiosk_cart \
  --file=erp-archive.pgdump
```

Then upload `erp-archive.pgdump` to `kks-private/archive/` (see runbook 13). Keep it for good: it is the only copy of that history once the Supabase project is deleted.

## Skipped on purpose

| Table | Rows | Why |
|---|---|---|
| `inventory_reservations` | 0 | Short-lived checkout holds; nothing to carry over |
| `security_audit_log` | 332 | Old technical log; optional, not needed |

## Data problems found (gate G4)

The script copies only columns that exist on both sides, so it cannot fail on a missing column. Checked against the live data:

| Finding | Effect on the copy | Action |
|---|---|---|
| **12 `order_items` rows point at a variant that no longer exists** (orders 49, 63, 64, 74, 80, 88, 91, 99, 100; statuses cancelled, pending, processing, ready) | None. Neon has no foreign key on `order_items.variant_id`, so they copy as they are. But the admin cannot show a variant name for them, and cancelling such an order cannot return stock for that line | Fine to copy. Admin should show "deleted variant" for these lines |
| **Images that point at nothing**: 44 `images` rows have no file in Storage (customers 35, brands 4, products 3, collections 2) | The image copy will report them as missing and skip them | Expected for the 35 `customers` rows (old test pictures). Check the 3 product, 4 brand and 2 collection ones in the dry run, because a product could show a broken picture |
| 4 files in Storage have no `images` row | They are not copied by row, so they are not needed | Ignore |
| `orders.created_at` is filled from `order_date` (a date, no time) | Old orders show 00:00 as their time | Accepted |
| Dropped columns hold data | `orders.saletype`, `orders.salesman_id`, `orders.salesman_comission`, `orders.user_id`, `cart.kiosk_session_id`, `shop.owner_auth_uid`, `collection_cart.updated_at`, `customers.token_version` | All ERP/POS or unused (token_version is 0 everywhere). Safe |

## Supabase-only things (gate G3): found, and what happens to each

None of these move to Neon. All are dropped or replaced.

- **Extensions in use:** `pgcrypto`, `pgsodium`, `supabase_vault`, `pgjwt`, `uuid-ossp`, `pg_stat_statements` (Supabase defaults); `http` and `pg_net` (**unexpected**: they let the database call web addresses; used by `notify_order_ready`). Neon needs only `pg_trgm`. `pg_cron` is not installed (no scheduled jobs in the database).
- **Functions (about 38 of the shop's own):** stock and cart logic (`reserve_inventory_secure`, `confirm_inventory_reservation`, `apply_cart_adjustments`, `validate_and_adjust_cart_stock`, `get_available_stock`, `reduce_variant_stock`, `update_variant_stock_with_validation`, `update_inventory_after_order`), order logic (`insert_order_with_items`, `update_admin_order_comprehensive`, `calculate_admin_order_totals`, `validate_order_integrity`), customer logic (`insert_customer`, `insert_customer_simple`, `delete_customer_by_auth_uid`), POS (`transfer_cart_to_kiosk`, `reserve_admin_inventory`, `apply_admin_stock_changes`), and helpers (`is_shop_owner`, `auth_customer_id`, `owns_order`). **Replaced** by the API code (`applyStockChanges`, checkout service). Not copied.
- **Triggers (7):** `sync_product_variants` (keeps product stock and price range up to date), `log_price_changes`, `update_brand_product_count`, `auto_cleanup_reservations`, and 3 timestamp triggers. **Replaced** by `applyStockChanges` and the API. **Check:** `brands.product_count` and `categories.product_count` were kept up to date by a trigger; in Neon they only change if the API does it. See below.
- **Views (7):** `account_book_summary`, `monthly_account_summary`, `security_dashboard` (ERP, dropped); `collections_summary`, `collection_items_detail`, `customer_public_info`, `inventory_status` (not used by the new API, dropped).
- **Enums:** `OrderStatus`, `PaymentMethod`, `gender`, `product_tags`, `SeverityLevel` exist in Neon too. `role` (customer / moderator / admin / owner) is Supabase-only and dropped.
- **Row Level Security:** on for every table (46 policies on `public`). Based on `auth.uid()`, `is_shop_owner()` and `auth_customer_id()`. Neon has no `auth` schema, and the API checks permissions in code, so none of them move. Four tables have RLS on with no policy (`extras`, `inventory_reservations`, `kiosk_cart`, `security_audit_log`): closed to everyone, which is fine.
- **Edge functions (7, all still ACTIVE):** `notify-ready`, `secure-checkout`, `jazzcash-webhook`, `admin-secure-checkout`, `admin-update-order`, `status_update`, `delete-account`. Last changed July–August 2025. **Question for the owner:** is `jazzcash-webhook` still used for real payments? The new API does not take JazzCash. If it is, it needs a plan before cutover.
- **Supabase Auth:** 46 users (36 Google, 10 email). Last sign-up 2026-02-19. Customers are linked by `customers.auth_uid`; the new API verifies the Google token itself.
- **Storage:** 11 buckets, 57+ policies.

### Security holes found (Phase 0, still open on the live project)

1. **Anyone can write to the `products`, `collections` and `vendors` image buckets without signing in.** Policies `alll 1ifhysk_0..3`, `all unrc7p_0..3` and `all 5qvju3_1` on `storage.objects` are for the `public` role with no owner check. With the public key from the storefront, a stranger can upload, overwrite or delete product images. Fix: runbook 11, step A3.
2. 15 `SECURITY DEFINER` functions can be called by anyone from the internet through the Supabase REST address, including `delete_customer_by_auth_uid`, `insert_customer`, `apply_cart_adjustments` and `transfer_cart_to_kiosk`. Fix: runbook 11, step A3.
3. 3 views (`customer_public_info`, `collections_summary`, `collection_items_detail`) run with the creator's rights and bypass RLS. `customer_public_info` is the worrying one. Fix: runbook 11, step A3.
4. Leaked-password protection is off; Postgres 15.8.1.100 has security patches waiting. Low priority: the whole project is retired at cutover.

### Still to do for the Neon side

- `brands.product_count` / `categories.product_count`: **the API does not keep them current.** `updateProductCount()` exists in the brand and category repositories but nothing calls it (checked 2026-11-07). The old Supabase trigger did this. The copy brings the correct numbers over, but they will drift as soon as the admin adds, hides or moves products. Fix needed: call it from the catalog service, or compute the count when reading.
