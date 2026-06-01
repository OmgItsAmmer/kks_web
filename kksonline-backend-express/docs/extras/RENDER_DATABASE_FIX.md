# Render Database Connection Fix

## Problem
```
Can't reach database server at db.jjxqwtltkepeajwtcish.supabase.co:5432
```

This error occurs because Supabase requires SSL for external database connections, and the `DATABASE_URL` on Render is missing the SSL parameter or using the wrong connection type.

## Solution

### Option 1: Use Connection Pooler (RECOMMENDED ✅)

The connection pooler is designed for production server environments like Render and handles SSL automatically.

**Steps**:

1. Go to **Supabase Dashboard** → Your Project → **Settings** → **Database**

2. Scroll to **"Connection string"** section

3. Select the **"Connection pooling"** tab

4. Copy the connection string that looks like:
   ```
   postgresql://postgres.[PROJECT]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
   ```

5. In **Render Dashboard**:
   - Go to your service → **Environment**
   - Find `DATABASE_URL`
   - Replace it with the connection pooling URL
   - **Important**: If the URL doesn't already include `?pgbouncer=true`, add it:
     ```
     postgresql://postgres.[PROJECT]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true
     ```

6. Save and restart the service (auto-restarts on save)

### Option 2: Use Direct Connection with SSL

If you must use the direct connection (port 5432), add SSL requirement:

**Steps**:

1. Get direct connection URL from Supabase:
   - Format: `postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres`

2. **Add SSL parameter** at the end:
   ```
   postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres?sslmode=require
   ```

3. Update `DATABASE_URL` in Render Dashboard → Environment

4. Save and restart

## Verify the Fix

After updating `DATABASE_URL`:

1. **Check Render Logs**:
   - Go to Render Dashboard → Your Service → Logs
   - Look for successful database connections
   - Should see: `Server running on port 10000` (no database errors)

2. **Test API Endpoint**:
   ```bash
   curl https://your-app.onrender.com/api/v1/health
   ```

3. **Test Database Query**:
   ```bash
   curl https://your-app.onrender.com/api/v1/products
   ```
   Should return products, not database errors.

## Connection String Format Reference

### Connection Pooler (Recommended) ✅
```
postgresql://postgres.[PROJECT]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true
```
- Port: **6543**
- Parameter: `?pgbouncer=true`
- Better for production/server environments
- Handles SSL automatically

### Direct Connection (Alternative)
```
postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres?sslmode=require
```
- Port: **5432**
- Parameter: `?sslmode=require` (required for external connections)
- Limited connections (not ideal for production)

## Common Mistakes

❌ **Wrong**: `postgresql://...@db.xxx.supabase.co:5432/postgres?pgbouncer=true`
- Can't use `pgbouncer=true` on port 5432

❌ **Wrong**: `postgresql://...@db.xxx.supabase.co:5432/postgres`
- Missing SSL parameter for direct connection

✅ **Correct (Pooler)**: `postgresql://...@xxx.pooler.supabase.com:6543/postgres?pgbouncer=true`

✅ **Correct (Direct)**: `postgresql://...@db.xxx.supabase.co:5432/postgres?sslmode=require`

## Why This Happens

- **Localhost**: Your local machine may have different SSL/TLS settings or test mode
- **Render**: Render's servers require explicit SSL configuration for external database connections
- **Supabase**: Supabase databases require SSL for security, but some connection strings don't include it by default

## Still Having Issues?

1. **Double-check the connection string**:
   - Copy directly from Supabase Dashboard
   - Ensure no extra spaces or characters
   - Password should be URL-encoded if it contains special characters

2. **Verify environment variable is set**:
   - Render Dashboard → Service → Environment
   - Ensure `DATABASE_URL` exists and is correct

3. **Check Supabase project status**:
   - Ensure project is active and not paused
   - Verify database is running (Supabase Dashboard)

4. **Regenerate Prisma Client**:
   - After changing `DATABASE_URL`, you may need to regenerate:
   ```bash
   npx prisma generate
   ```
   (This happens automatically in Render build, but can help locally)
