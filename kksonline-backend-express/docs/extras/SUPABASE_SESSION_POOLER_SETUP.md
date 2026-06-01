# Supabase Session Pooler Setup (IPv4)

## Why Use Session Pooler?

✅ **Session Pooler (Port 6543)** - RECOMMENDED for production
- Designed for server-side applications
- Better connection pooling and performance
- Handles SSL automatically
- More concurrent connections
- Supports IPv4 and IPv6

❌ **Direct Connection (Port 5432)** - Not recommended for production
- Limited number of connections (default: 15-20)
- Requires explicit SSL configuration
- Can cause connection timeouts under load

## How to Get Your Session Pooler Connection String

### Step 1: Go to Supabase Dashboard

1. Visit [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** (gear icon in left sidebar)
4. Click **Database**

### Step 2: Get Session Pooler Connection String

1. Scroll down to **"Connection string"** section
2. Click on the **"Session pooler"** tab (NOT "Transaction pooler" or "Direct connection")
3. Select **"URI"** format
4. You'll see a connection string like:

```
postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

### Step 3: Add Required Parameter

Add `?pgbouncer=true` to the end of the connection string:

```
postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true
```

### Step 4: Replace Password

In the connection string, replace `[YOUR-PASSWORD]` with your actual database password.

**Where to find your password:**
- If you saved it during project creation, use that
- If you forgot it, go to **Database Settings** and click **"Reset Database Password"**

## Connection String Components Explained

```
postgresql://postgres.abcdefgh:myP@ssw0rd!@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
           └─────┬─────┘ └────┬────┘ └──────────────┬──────────────┘ └─┬─┘ └───┬──┘ └──────┬──────┘
              Project      Password            Session Pooler Host    Port  DB    PgBouncer
              Reference                         (IPv4 endpoint)                    Parameter
```

- **postgres.abcdefgh**: Your project reference
- **myP@ssw0rd!**: Your database password (URL-encode special characters)
- **aws-0-us-east-1.pooler.supabase.com**: IPv4 session pooler endpoint
- **6543**: Session pooler port (NOT 5432)
- **postgres**: Database name
- **pgbouncer=true**: Required for session pooling mode

## Special Characters in Password

If your password contains special characters, you need to URL-encode them:

| Character | URL Encoded |
|-----------|-------------|
| `!`       | `%21`       |
| `@`       | `%40`       |
| `#`       | `%23`       |
| `$`       | `%24`       |
| `%`       | `%25`       |
| `^`       | `%5E`       |
| `&`       | `%26`       |
| `*`       | `%2A`       |
| `(`       | `%28`       |
| `)`       | `%29`       |

**Example:**
- Original password: `myP@ss!word#123`
- URL-encoded: `myP%40ss%21word%23123`

## Example Connection Strings

### Development (Session Pooler)
```env
DATABASE_URL=postgresql://postgres.abcdefgh:your-password@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

### Production (Session Pooler)
```env
DATABASE_URL=postgresql://postgres.abcdefgh:your-password@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

## Regional Endpoints

Supabase uses region-specific pooler endpoints:

- **US East**: `aws-0-us-east-1.pooler.supabase.com`
- **US West**: `aws-0-us-west-1.pooler.supabase.com`
- **EU Central**: `aws-0-eu-central-1.pooler.supabase.com`
- **EU West**: `aws-0-eu-west-1.pooler.supabase.com`
- **AP Northeast**: `aws-0-ap-northeast-1.pooler.supabase.com`
- **AP Southeast**: `aws-0-ap-southeast-1.pooler.supabase.com`
- **AP South**: `aws-0-ap-south-1.pooler.supabase.com`

## Testing the Connection

After setting up your `.env` file with the new `DATABASE_URL`:

```bash
# 1. Install dependencies
npm install

# 2. Generate Prisma Client
npx prisma generate

# 3. Test the connection
npm run dev
```

You should see in the logs:
```
✅ Database connection successful
Database URL: postgresql://postgres.abcdefgh:***@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
Server running on port 5000
```

## Troubleshooting

### Error: "Can't reach database server"
- ✅ Check that you're using port **6543** (not 5432)
- ✅ Verify the connection string includes `?pgbouncer=true`
- ✅ Ensure your password is correctly URL-encoded

### Error: "Invalid connection string"
- ✅ Make sure there are no spaces in the connection string
- ✅ Check that all special characters in password are URL-encoded
- ✅ Verify you copied the complete string with no line breaks

### Error: "Authentication failed"
- ✅ Reset your database password in Supabase Dashboard
- ✅ Update the `DATABASE_URL` with the new password
- ✅ Restart your application

### Connection works locally but not in production
- ✅ Make sure you've updated the environment variable in your hosting platform (Render, Fly.io, etc.)
- ✅ Verify the hosting platform has IPv4 connectivity
- ✅ Check that the environment variable is being loaded correctly

## Deployment Platforms

### Render
1. Go to Render Dashboard → Your Service
2. Click **Environment** tab
3. Find or add `DATABASE_URL`
4. Paste your session pooler connection string
5. Click **Save** (service will auto-restart)

### Fly.io
```bash
fly secrets set DATABASE_URL="postgresql://postgres.abcdefgh:password@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
```

### Vercel
```bash
vercel env add DATABASE_URL production
# Then paste your connection string
```

### Railway
1. Go to your project dashboard
2. Click **Variables** tab
3. Add `DATABASE_URL` with your session pooler string
4. Deploy will restart automatically

## Additional Resources

- [Supabase Connection Pooling Docs](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler)
- [Prisma with Supabase](https://www.prisma.io/docs/guides/database/supabase)
- [PgBouncer Configuration](https://www.pgbouncer.org/config.html)
