# Render Deployment Guide

This guide will help you deploy your KKS Online Backend Express API to Render with zero configuration for TypeScript imports.

## 📋 Prerequisites

1. **Render Account**: Sign up at [render.com](https://render.com)
2. **GitHub/GitLab Repository**: Your code should be in a Git repository
3. **Environment Variables**: Prepare all required environment variables (see below)

## 🚀 Quick Deploy (Recommended)

### Option 1: Using render.yaml (Automatic)

1. **Push to Git**: Ensure `render.yaml` is committed to your repository
2. **Create New Web Service**:
   - Go to Render Dashboard → New → Web Service
   - Connect your Git repository
   - Render will automatically detect `render.yaml` and use it

3. **Add Environment Variables** in Render Dashboard:
   - Go to your service → Environment
   - Add all variables from `env.example.txt` (see list below)

4. **Deploy**: Click "Create Web Service" and Render will automatically:
   - Run `npm ci` (install dependencies)
   - Run `npm run build` (compile TypeScript, fix imports)
   - Run `npm start` (start the server)

### Option 2: Manual Configuration

1. **Create New Web Service**:
   - Go to Render Dashboard → New → Web Service
   - Connect your Git repository
   - Select the `kksonline-backend-express` folder (if monorepo)

2. **Configure Settings**:
   - **Name**: `kksonline-backend` (or your preferred name)
   - **Environment**: `Node`
   - **Region**: Choose closest to your users (e.g., `Singapore`, `Frankfurt`)
   - **Branch**: `main` or `master`
   - **Root Directory**: `kksonline-backend-express` (if monorepo)

3. **Build & Start Commands**:
   ```
   Build Command: npm ci && npm run build
   Start Command: npm start
   ```

4. **Environment Variables**: See section below

5. **Advanced Settings**:
   - **Health Check Path**: `/api/v1/health`
   - **Auto-Deploy**: `Yes` (optional, for automatic deployments)

## 🔐 Environment Variables

Add these in Render Dashboard → Your Service → Environment:

### Required Variables

```bash
# Server
NODE_ENV=production
PORT=10000  # Render sets this automatically, but can be explicitly set
API_VERSION=v1

# Database (Prisma connection to Supabase)
# OPTION 1: Connection Pooler (RECOMMENDED for production/Render)
DATABASE_URL=postgresql://postgres:[PASSWORD]@[PROJECT].pooler.supabase.com:6543/postgres?pgbouncer=true
# OPTION 2: Direct Connection (requires SSL)
# DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres?sslmode=require

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key

# JWT Authentication
JWT_SECRET=your_secret_min_32_characters_long
GOOGLE_CLIENT_ID=your_google_client_id

# CORS (update with your production domains)
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

### Optional Variables

```bash
# Supabase S3 Protocol (if using)
SUPABASE_S3_ENDPOINT=your_s3_endpoint
SUPABASE_S3_ACCESS_KEY_ID=your_access_key
SUPABASE_S3_SECRET_ACCESS_KEY=your_secret_key
SUPABASE_S3_REGION=ap-southeast-1

# Cloudinary (for legacy image uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Cache
CACHE_TTL_SECONDS=1800

# Logging
LOG_LEVEL=info
```

**Note**: Never commit `.env` files. Always set variables in Render Dashboard.

## 📦 Build Process

The build process automatically:

1. **Installs Dependencies**: `npm ci` (clean install from package-lock.json)
2. **Generates Prisma Client**: `prisma generate` (via postinstall script)
3. **Compiles TypeScript**: `tsc` (compiles to `dist/`)
4. **Resolves Path Aliases**: `tsc-alias` (resolves `@config/*` paths)
5. **Fixes Import Extensions**: `scripts/fix-imports.js` (converts `.ts` → `.js` in compiled files)

**Result**: All `.ts` imports in source become working `.js` imports in compiled output!

## 🏗️ Project Structure

```
kksonline-backend-express/
├── src/                    # TypeScript source files (.ts)
│   ├── config/
│   ├── routes/
│   ├── services/
│   └── ...
├── dist/                   # Compiled JavaScript (.js) - generated
├── scripts/
│   └── fix-imports.js      # Post-build script to fix extensions
├── package.json            # Dependencies and scripts
├── tsconfig.json           # TypeScript configuration
├── render.yaml             # Render deployment config
└── RENDER_DEPLOYMENT.md    # This file
```

## ✅ Verification

After deployment:

1. **Check Health Endpoint**:
   ```bash
   curl https://your-app.onrender.com/api/v1/health
   ```

2. **View Logs**:
   - Render Dashboard → Your Service → Logs
   - Should see: "Server running on port 10000" (or your PORT)

3. **Test API Endpoint**:
   ```bash
   curl https://your-app.onrender.com/api/v1/products
   ```

## 🔧 Troubleshooting

### Build Fails

**Error**: `Cannot find module './config/env.config.ts'`
- **Solution**: Ensure `scripts/fix-imports.js` is running after `tsc`
- Check build logs to verify the script runs

**Error**: `Module not found: Cannot resolve '@config/...'`
- **Solution**: `tsc-alias` should resolve these. Check `package.json` includes it in build command

### Runtime Errors

**Error**: `Cannot find module './config/env.config.js'`
- **Solution**: The fix-imports script might not have run. Check build logs.
- Verify `dist/` contains `.js` files with `.js` imports

**Error**: `Prisma Client not generated`
- **Solution**: Ensure `prisma:generate` runs before build (it's in postinstall and build)

### Database Connection Issues

**Error**: `Can't reach database server at db.xxx.supabase.co:5432`

**Causes & Solutions**:

1. **Missing SSL parameter** (for direct connection on port 5432):
   - Your `DATABASE_URL` should end with `?sslmode=require`
   - Example: `postgresql://postgres:[PASSWORD]@db.xxx.supabase.co:5432/postgres?sslmode=require`

2. **Wrong port for connection pooler** (recommended fix):
   - Use connection pooler URL with port 6543
   - Format: `postgresql://postgres:[PASSWORD]@[PROJECT].pooler.supabase.com:6543/postgres?pgbouncer=true`
   - Replace `[PROJECT]` with your Supabase project reference (not full hostname)

3. **How to get the correct connection string**:
   - Go to Supabase Dashboard → Project Settings → Database
   - Under "Connection string", select "Connection pooling" tab
   - Copy the "Connection pooling" URI (port 6543)
   - Or use "Direct connection" URI but add `?sslmode=require` at the end

4. **Verify connection string format**:
   - Should NOT have `pgbouncer=true` on port 5432
   - Should use port 6543 if using `pgbouncer=true`
   - Should use `sslmode=require` if using port 5432 (direct connection)

5. **Test the connection**:
   - Update `DATABASE_URL` in Render Dashboard → Environment
   - Save changes (service will auto-restart)
   - Check logs to verify connection succeeds

### Environment Variables

- Double-check all required variables are set in Render Dashboard
- Variables are case-sensitive
- Use `key=value` format (no spaces around `=`)
- Restart service after adding/modifying variables

## 🔄 Updates & Redeployment

### Automatic Deployment

- Enabled by default when connected to Git
- Pushes to `main`/`master` branch trigger automatic deployments
- Build logs show real-time progress

### Manual Deployment

1. Make code changes
2. Commit and push to Git
3. Render automatically detects and deploys
4. Or trigger manually: Service → Manual Deploy

### Rollback

1. Go to Service → Deploys
2. Click "..." on a previous successful deployment
3. Select "Rollback to this deploy"

## 💰 Pricing & Limits

**Free Tier**:
- 750 hours/month (enough for 1 service running 24/7)
- Sleeps after 15 minutes of inactivity (wakes on first request)
- 512MB RAM, shared CPU
- Auto-scaling

**Starter Plan** ($7/month):
- Always-on (no sleep)
- 512MB RAM, shared CPU
- Custom domains

**Professional** ($25/month):
- Always-on
- 1GB RAM, shared CPU
- Better performance

## 📊 Monitoring

- **Logs**: Real-time logs in Render Dashboard
- **Metrics**: CPU, Memory, Request metrics
- **Alerts**: Set up email alerts for deployment failures
- **Health Checks**: Automatic health check at `/api/v1/health`

## 🔐 Security Best Practices

1. **Secrets**: Never commit secrets to Git. Use Render Environment Variables
2. **HTTPS**: Automatically enabled by Render
3. **CORS**: Update `ALLOWED_ORIGINS` with production domains only
4. **Rate Limiting**: Already configured in your app
5. **Helmet**: Security headers already configured

## 📞 Support

- **Render Docs**: https://render.com/docs
- **Render Status**: https://status.render.com
- **Community**: https://community.render.com

## 🎯 Summary

With this setup:

✅ **TypeScript imports work automatically** (no manual `.js` edits)  
✅ **Build process is automated** (`npm ci && npm run build`)  
✅ **Start command is simple** (`npm start`)  
✅ **Environment variables managed in Dashboard**  
✅ **Zero-config deployment** with `render.yaml`  
✅ **Production-ready** TypeScript backend  

Your backend is now ready for Render deployment! 🚀
