# 🚀 Quick Reference: What to Add to .env

## Required: Database Connection (Session Pooler - IPv4)

Add this to your `.env` file:

```env
DATABASE_URL=postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true
```

## How to Get Your Connection String

1. **Go to Supabase Dashboard**: https://supabase.com/dashboard
2. **Select your project**
3. **Settings** → **Database** → Scroll to "Connection string" section
4. **Click "Session pooler" tab** (NOT "Direct connection")
5. **Select "URI" format**
6. **Copy the connection string**
7. **Add `?pgbouncer=true` at the end**

## Example Real Connection String

```env
# Replace these values with your actual ones:
# - abcdefgh → your project reference
# - MySecurePassword123 → your database password
# - us-east-1 → your region

DATABASE_URL=postgresql://postgres.abcdefgh:MySecurePassword123@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

## Important Details

✅ **Port**: Must be **6543** (session pooler port)
✅ **Parameter**: Must include `?pgbouncer=true`
✅ **Host**: Should end with `.pooler.supabase.com`
✅ **Password**: URL-encode special characters if needed

## Common Regions

- **US East**: `aws-0-us-east-1.pooler.supabase.com`
- **EU Central**: `aws-0-eu-central-1.pooler.supabase.com`
- **AP Southeast**: `aws-0-ap-southeast-1.pooler.supabase.com`

## Complete .env File Example

Create a `.env` file in `kksonline-backend-express/` with:

```env
# Server Configuration
NODE_ENV=development
PORT=5000
API_VERSION=v1

# Database Configuration (Supabase Session Pooler - IPv4)
DATABASE_URL=postgresql://postgres.abcdefgh:your-password@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true

# Supabase Configuration
SUPABASE_URL=https://abcdefgh.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key_here

# Supabase S3 Protocol (for storage access)
SUPABASE_S3_ENDPOINT=https://abcdefgh.storage.supabase.co/storage/v1/s3
SUPABASE_S3_ACCESS_KEY_ID=your_s3_access_key_id
SUPABASE_S3_SECRET_ACCESS_KEY=your_s3_secret_access_key
SUPABASE_S3_REGION=ap-southeast-1

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_min_32_chars_here
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your_refresh_token_secret_key_here
JWT_REFRESH_EXPIRES_IN=30d

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Firebase (for push notifications)
FIREBASE_KEY_BASE64=your_firebase_service_account_json_base64_encoded

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# Cache Configuration
CACHE_TTL_SECONDS=1800
```

## After Adding to .env

Run these commands:

```bash
# 1. Install dependencies (if not already)
npm install

# 2. Generate Prisma Client
npx prisma generate

# 3. Start the server
npm run dev
```

## You're Done! ✅

Your backend is now configured to use the Supabase Session Pooler (IPv4) for optimal performance and reliability.
