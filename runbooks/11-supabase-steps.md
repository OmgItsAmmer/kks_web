# 11. The old Supabase project: safety steps and sizes

**Why:** Your live store still runs on Supabase until the final switch. Two things need doing in its dashboard: close some security holes (I found them while reading the code), and measure how big everything is so I know it fits in the free plans.
**Time:** 20 minutes. **Do before:** Phase 0 and Phase 1.

Open <https://supabase.com/dashboard> and choose the project (its reference starts with `jjxqwtlt`).

## Part A: Security steps (Phase 0)

### A1. Turn off public sign-ups
1. Left menu → **Authentication** → **Sign In / Providers** (or **Providers**).
2. Find **Allow new users to sign up** and turn it **off**.
3. Save.

*Why:* the old admin app let people create an admin account using a shared key. After this, nobody can create new Supabase accounts by themselves. Your customers sign in through your own API, not through Supabase Auth, so they aren't affected. (If you later see a customer login break, tell me and turn it back on.)

### A2. Rotate the service key (only if unsure)
The old Flutter admin app may have shipped with a powerful key inside its files. If that app was ever given to anyone else, or put on a computer you don't control:
1. **Project Settings** → **API Keys** (or **API**).
2. Under the **service_role** / secret key, use **Reset** or create a new secret key and delete the old one.
3. Put the new key in `kksonline-backend-express/.env` as `SUPABASE_SERVICE_KEY` and in the Fly secrets (tell me, and I'll do the Fly part).
4. The old admin app (OMGx) stops working until it's updated. That's fine; it's being retired.

If you are sure the app only ever lived on your own computer, skip A2.

### A3. Close the open image buckets and the open functions (found 2026-11-07)

**Why:** I read the live project and found that anyone on the internet can upload, replace or delete pictures in the `products`, `collections` and `vendors` buckets, and can call some database functions without signing in. The new system does not use any of this, so closing it cannot break the new shop. It *could* break the **old** live shop if the old storefront or app uploads pictures straight to Supabase; the storefront shows pictures only (reading stays open), so reading is not touched.

1. Left menu → **SQL Editor** → **New query**.
2. Paste and run **step 1** (stops anonymous writes to pictures; reading stays open):
   ```sql
   drop policy if exists "alll 1ifhysk_0" on storage.objects;
   drop policy if exists "alll 1ifhysk_2" on storage.objects;
   drop policy if exists "alll 1ifhysk_3" on storage.objects;
   drop policy if exists "all unrc7p_1" on storage.objects;
   drop policy if exists "all unrc7p_2" on storage.objects;
   drop policy if exists "all unrc7p_3" on storage.objects;
   drop policy if exists "all 5qvju3_1" on storage.objects;
   ```
   (Reading stays open through the policies `alll 1ifhysk_1` and `all unrc7p_0`. Signed-in shop owners can still upload, through the policies named `kks_owner_*`.)
3. Run **step 2** (stops strangers calling the account and cart functions):
   ```sql
   revoke execute on function public.delete_customer_by_auth_uid(uuid) from anon, authenticated;
   revoke execute on function public.transfer_cart_to_kiosk(integer, uuid) from anon, authenticated;
   revoke execute on function public.insert_customer_simple(text,text,text,text,text,timestamptz,text,uuid,text) from anon, authenticated;
   revoke execute on function public.insert_customer(text,text,text,text,text,timestamptz,public.gender,uuid,text) from anon, authenticated;
   ```
4. Run **step 3** (the customer view that skips the privacy rules):
   ```sql
   alter view public.customer_public_info set (security_invoker = true);
   alter view public.collections_summary set (security_invoker = true);
   alter view public.collection_items_detail set (security_invoker = true);
   ```
5. Check the old shop: open it, look at a product page (pictures still show) and sign in with Google.

**If something in the old shop breaks,** tell me which page. I will give you the one line to undo it. Do steps 1 to 3 one at a time and test between them.

*Not done by me:* the Supabase tool I used is able to change things, but you asked me to only read, so I changed nothing.

## Part B: Measure the sizes (Phase 1)

> **Already measured by me on 2026-11-07, so you can skip Part B:** database 24 MB; images 249 files, 39.9 MB (see `docs/db-triage.md`).

### B1. Database size
1. Left menu → **SQL Editor** → **New query**.
2. Paste and run:
   ```sql
   select pg_size_pretty(pg_database_size(current_database())) as database_size;
   ```
3. Write down the answer.

### B2. Biggest tables (helps with the clean-up)
Run:
```sql
select relname as table_name,
       pg_size_pretty(pg_total_relation_size(relid)) as size,
       n_live_tup as rows
from pg_stat_user_tables
order by pg_total_relation_size(relid) desc
limit 40;
```
Copy the result (it's only table names and sizes, nothing private).

### B3. Image storage size
1. Left menu → **Storage**.
2. Open each bucket and note its size, or run this in the SQL Editor:
   ```sql
   select bucket_id,
          count(*) as files,
          pg_size_pretty(sum((metadata->>'size')::bigint)) as total_size
   from storage.objects
   group by bucket_id
   order by sum((metadata->>'size')::bigint) desc;
   ```
3. Write down the sizes. Most files are PNG. The total decides whether I copy them as they are or convert them to WebP.

## Part C: Read access for me (choose one)

- **Option 1 (easiest):** In this project I already added the Supabase tool. Restart your Claude session once and approve it (Claude Code asks). Then I can read the database myself, and you don't need to do anything. It currently has the power to change data, so tell me if you want it set to read-only. I recommend read-only.
- **Option 2:** Make a read-only database user. Run in the SQL Editor (choose your own long password):
  ```sql
  create role kks_readonly login password 'CHOOSE_A_LONG_PASSWORD';
  grant usage on schema public to kks_readonly;
  grant select on all tables in schema public to kks_readonly;
  ```
  Then in **Project Settings → Database → Connection string**, copy the **Session pooler** string and replace the user and password with `kks_readonly` and your password. Put it in `.env` as `SUPABASE_DATABASE_URL=...`.

## Send me

- The numbers from B1, B2 and B3 (in chat).
- Which option for Part C.
- "done 11".
