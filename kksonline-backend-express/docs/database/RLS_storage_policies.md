# Storage RLS Policies — Supabase Buckets

Buckets are created in [migrations/002_storage_buckets.sql](./migrations/002_storage_buckets.sql). Policies are applied in [migrations/003_storage_rls_policies.sql](./migrations/003_storage_rls_policies.sql).

## Bucket inventory

| Bucket | Public read | Who can upload | Path convention |
|--------|-------------|----------------|-----------------|
| `products` | Yes | Service role + shop owner | `{filename}` or `{product_id}/{filename}` |
| `categories` | Yes | Service role + shop owner | `{category_id}/{filename}` |
| `brands` | Yes | Service role + shop owner | `{brand_id}/{filename}` |
| `collections` | Yes | Service role + shop owner | `{collection_id}/{filename}` |
| `shop` | Yes | Service role + shop owner | Store assets / logo |
| `customers` | Own folder only | Own customer + service role | `{customer_id}/{filename}` |
| `users` | Own folder only | Service role + shop owner | `{user_id}/{filename}` |
| `vendors` | No (authenticated staff) | Service role + shop owner | `{vendor_id}/{filename}` |
| `salesman` | No | Service role + shop owner | `{salesman_id}/{filename}` |
| `guarantors` | No | Service role + shop owner | `{guarantor_id}/{filename}` |

`service_role` (Express backend) **bypasses** storage RLS and is used for all admin uploads today.

## Policy groups

### 1. Public catalog buckets

**Buckets:** `products`, `categories`, `brands`, `collections`, `shop`

| Operation | anon | authenticated | shop owner |
|-----------|------|---------------|------------|
| SELECT (download) | Allow | Allow | Allow |
| INSERT | Deny | Deny | Allow |
| UPDATE | Deny | Deny | Allow |
| DELETE | Deny | Deny | Allow |

### 2. Customer profile bucket

**Bucket:** `customers`

| Operation | Rule |
|-----------|------|
| SELECT | Authenticated user whose `auth_customer_id()` matches first path segment |
| INSERT / UPDATE / DELETE | Same ownership rule |
| anon | Denied |

Example object path: `customers/42/profile.webp` → only customer_id `42` may access.

### 3. Staff / internal buckets

**Buckets:** `users`, `vendors`, `salesman`, `guarantors`

| Operation | anon | authenticated customer | shop owner |
|-----------|------|------------------------|------------|
| SELECT | Deny | Deny | Allow |
| INSERT / UPDATE / DELETE | Deny | Deny | Allow |

Direct customer access to these buckets is denied; the Express API serves data using service role when needed.

## Path helper

Storage policies use `(storage.foldername(name))[1]` as the entity folder id. Upload code should keep `{entity_id}/{filename}` structure consistent with [supabase-image.service.ts](../../src/services/supabase-image.service.ts) (`folderType` = bucket name, `filename` = object key).

## Applying

Run in **Supabase Dashboard → SQL Editor** only (direct `postgres` role). Run in order:

1. `002_storage_buckets.sql`
2. `003_storage_rls_policies.sql`

Do **not** run storage migrations through:

- Session pooler URL (port `6543`, `?pgbouncer=true`)
- Prisma / backend `DATABASE_URL`
- MCP or third-party SQL clients using the pooler connection string

Those connections are not owners of `storage.objects` and will fail with:

```text
ERROR: 42501: must be owner of table objects
```

Use the **direct** database connection from **Project Settings → Database → Connection string → URI** (port `5432`, not pooler) if you run SQL outside the Dashboard.

### Troubleshooting `must be owner of table objects`

| Cause | Fix |
|-------|-----|
| `ALTER TABLE storage.objects ...` in an old migration copy | Remove it — RLS is already on; use the updated `003` file |
| Pooler / Prisma connection | Use Supabase SQL Editor or direct `:5432` URI |
| `CREATE POLICY` still fails in SQL Editor | Add policies via **Storage → [bucket] → Policies** in the Dashboard (same rules as in `003`) |

## Verification

```sql
SELECT policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
ORDER BY policyname;
```
