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

## Part B: Measure the sizes (Phase 1)

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
