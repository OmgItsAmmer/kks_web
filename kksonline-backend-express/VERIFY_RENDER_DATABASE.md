# Verify Render Database Configuration

## Issue: Database connection failing even after updating DATABASE_URL

This guide helps you verify that Render is using the correct `DATABASE_URL` and that Prisma is properly configured.

## Step 1: Verify DATABASE_URL in Render Dashboard

1. Go to **Render Dashboard**: https://dashboard.render.com
2. Select your service: **kks-web** (or your service name)
3. Click **"Environment"** in the left sidebar
4. Find **`DATABASE_URL`** in the list
5. **Click on it** to view the full value (it might be truncated in the list)
6. **Verify the format**:

### ✅ Correct Format (Connection Pooler)
```
postgresql://postgres.jjxqwtltkepeajwtcish:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

### ✅ Correct Format (Direct with SSL)
```
postgresql://postgres:[PASSWORD]@db.jjxqwtltkepeajwtcish.supabase.co:5432/postgres?sslmode=require
```

### ❌ Wrong Format (Missing SSL/Pooler)
```
postgresql://postgres:[PASSWORD]@db.jjxqwtltkepeajwtcish.supabase.co:5432/postgres
```

## Step 2: Check Startup Logs (After Next Deploy)

After deploying the updated code, check Render logs for:

1. Go to **Render Dashboard** → Your Service → **Logs**
2. Look for these lines at startup:
   ```
   Database URL: postgresql://postgres.***@...
   ✅ Database connection successful
   ```

3. If you see:
   ```
   Database URL: NOT SET
   ```
   → `DATABASE_URL` is not set in Render environment variables

4. If you see:
   ```
   Database URL: postgresql://postgres:***@db.xxx.supabase.co:5432/postgres
   ❌ Database connection check failed
   ```
   → `DATABASE_URL` is set but wrong format (missing `?sslmode=require` or using wrong port)

## Step 3: Force Rebuild and Restart

### Option A: Manual Redeploy

1. In Render Dashboard → Your Service
2. Click **"Manual Deploy"** (top right)
3. Select **"Clear build cache & deploy"**
4. Click **"Deploy latest commit"**

This will:
- Clear any cached builds
- Reinstall dependencies
- Regenerate Prisma Client
- Rebuild TypeScript
- Restart the service with new environment variables

### Option B: Trigger by Environment Variable Change

1. In Render Dashboard → Your Service → **Environment**
2. Find `DATABASE_URL`
3. Click **"Edit"** (pencil icon)
4. Make a small change (add a space at the end, then remove it)
5. Click **"Save Changes"**
6. Service will auto-restart

## Step 4: Verify Prisma Client Generation

The build process should show Prisma client generation:

1. Go to **Render Dashboard** → Your Service → **Events** or **Logs**
2. During build, you should see:
   ```
   Running build command...
   > prisma generate
   Prisma Client generated
   ```

3. If you see Prisma errors during build:
   - Check that `DATABASE_URL` is available during build (it should be)
   - Check that `prisma` package is installed (should be in `package.json`)

## Step 5: Verify Build Command

Check that `render.yaml` has the correct build command:

```yaml
buildCommand: npm ci && npm run prisma:generate && npx tsc && npx tsc-alias && node scripts/fix-imports.js
```

This ensures:
- ✅ `npm ci` - Install dependencies
- ✅ `npm run prisma:generate` - Generate Prisma Client (reads `DATABASE_URL` from env)
- ✅ `npx tsc` - Compile TypeScript
- ✅ `npx tsc-alias` - Resolve path aliases
- ✅ `node scripts/fix-imports.js` - Fix import extensions

## Step 6: Check Render Build Logs

Look at the **build logs** (not runtime logs) to see if Prisma generate is running:

1. Render Dashboard → Your Service → **Events**
2. Click on the latest **"Deploy succeeded"** or **"Deploy failed"** event
3. Look for build output:
   ```
   ==> Building...
   Running: npm ci && npm run prisma:generate && ...
   ...
   > prisma generate
   ```

## Common Issues and Solutions

### Issue 1: DATABASE_URL not updating

**Symptom**: Logs still show old connection string

**Solution**:
1. Double-check `DATABASE_URL` is saved in Render Dashboard
2. Use **"Clear build cache & deploy"** to force full rebuild
3. Verify no other `.env` files are being used

### Issue 2: Prisma Client not regenerating

**Symptom**: Build logs don't show `prisma generate`

**Solution**:
1. Check `package.json` has `prisma:generate` script
2. Check `render.yaml` build command includes `npm run prisma:generate`
3. Verify `prisma` package is in `devDependencies` in `package.json`

### Issue 3: Connection still failing after fix

**Symptom**: Correct DATABASE_URL but still can't connect

**Possible causes**:
1. **Supabase project paused**: Check Supabase Dashboard
2. **Network/firewall**: Verify Supabase allows connections from Render IPs
3. **Password encoding**: Ensure password is URL-encoded if it contains special characters
4. **Connection pooler limit**: Supabase free tier has connection limits

### Issue 4: "Can't reach database server"

**Symptom**: Exactly your error message

**Solutions to try**:
1. ✅ Use connection pooler URL (port 6543) instead of direct (port 5432)
2. ✅ Add `?sslmode=require` if using direct connection
3. ✅ Verify Supabase project is active (not paused)
4. ✅ Check Supabase Dashboard → Database → Settings for correct connection strings

## Quick Verification Checklist

- [ ] `DATABASE_URL` is set in Render Dashboard → Environment
- [ ] `DATABASE_URL` format is correct (pooler or direct with SSL)
- [ ] Service was restarted after updating `DATABASE_URL`
- [ ] Build logs show `prisma generate` running
- [ ] Startup logs show "Database connection successful" (after next deploy)
- [ ] Supabase project is active and not paused
- [ ] Password in `DATABASE_URL` is correct (URL-encoded if needed)

## After Next Deploy: Check Logs

Once you deploy the updated code, you'll see in Render logs:

```
Database URL: postgresql://postgres.***@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true
✅ Database connection successful
🚀 Server started in production mode
```

Or if there's still an issue:

```
Database URL: postgresql://postgres:***@db.xxx.supabase.co:5432/postgres
❌ Database connection check failed
💡 Tip: Ensure DATABASE_URL is set correctly in Render Dashboard → Environment
```

This will tell you exactly what `DATABASE_URL` Render is using!
