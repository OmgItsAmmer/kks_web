# Fly.io Deployment Guide - Cost-Optimized

This guide will help you deploy your KKS Online Backend to Fly.io with minimal cost (ideally $0/month).

## 📊 Cost Breakdown

- **Free Tier**: 3 shared-cpu-1x VMs with 256MB RAM
- **Your Usage**: 1 VM with scale-to-zero
- **Estimated Cost**: **$0/month** (within free tier limits)
- **Traffic**: ~1000-1500 requests/day = ~45-65 requests/hour (well within limits)

## 🚀 Prerequisites

1. **Install Fly CLI** (PowerShell):
   ```powershell
   # Using PowerShell
   iwr https://fly.io/install.ps1 -useb | iex
   ```

2. **Login to Fly.io**:
   ```powershell
   fly auth login
   ```

3. **Verify installation**:
   ```powershell
   fly version
   ```

## 📝 Pre-Deployment Checklist

1. **Environment Variables**: Ensure all required environment variables are set (see `env.example.txt`)

2. **Database**: Your Supabase database should be accessible from Fly.io's network

3. **CORS Origins**: Update `ALLOWED_ORIGINS` in your environment to include your production domains

## 🔧 Deployment Steps

### Step 1: Initialize Fly.io App

```powershell
cd kksonline-backend-express
fly launch --no-deploy
```

When prompted:
- **App name**: Choose a unique name (e.g., `kksonline-backend-prod`) or press Enter for auto-generated
- **Region**: Choose closest to your users (e.g., `iad` for US East, `lhr` for Europe)
- **PostgreSQL**: **No** (you're using Supabase)
- **Redis**: **No** (optional, not needed for minimal setup)

### Step 2: Configure Secrets (Environment Variables)

Set all your environment variables as Fly.io secrets:

```powershell
# Server Configuration
fly secrets set NODE_ENV=production
fly secrets set PORT=8080
fly secrets set API_VERSION=v1

# Database Configuration (Prisma connection string)
# Get this from Supabase Dashboard > Settings > Database > Connection String
# Format: postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres?pgbouncer=true
fly secrets set DATABASE_URL=postgresql://postgres:password@host:5432/postgres

# Supabase Configuration
fly secrets set SUPABASE_URL=your_supabase_project_url
fly secrets set SUPABASE_SERVICE_KEY=your_supabase_service_role_key
fly secrets set SUPABASE_S3_ENDPOINT=your_s3_endpoint
fly secrets set SUPABASE_S3_ACCESS_KEY_ID=your_access_key
fly secrets set SUPABASE_S3_SECRET_ACCESS_KEY=your_secret_key
fly secrets set SUPABASE_S3_REGION=ap-southeast-1

# JWT Configuration
fly secrets set JWT_SECRET=your_jwt_secret_min_32_chars
fly secrets set JWT_EXPIRES_IN=7d
fly secrets set JWT_REFRESH_SECRET=your_refresh_secret
fly secrets set JWT_REFRESH_EXPIRES_IN=30d

# Google OAuth
fly secrets set GOOGLE_CLIENT_ID=your_google_client_id
fly secrets set GOOGLE_CLIENT_SECRET=your_google_client_secret

# Cloudinary
fly secrets set CLOUDINARY_CLOUD_NAME=your_cloud_name
fly secrets set CLOUDINARY_API_KEY=your_api_key
fly secrets set CLOUDINARY_API_SECRET=your_api_secret

# Firebase (if using)
fly secrets set FIREBASE_KEY_BASE64=your_firebase_key_base64

# Rate Limiting
fly secrets set RATE_LIMIT_WINDOW_MS=900000
fly secrets set RATE_LIMIT_MAX_REQUESTS=100

# CORS (update with your production domains)
fly secrets set ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Cache Configuration
fly secrets set CACHE_TTL_SECONDS=1800
```

**Alternative**: Set multiple secrets at once using a file:

```powershell
# Create secrets.txt with format: KEY=value (one per line)
fly secrets import < secrets.txt
```

### Step 3: Review and Adjust fly.toml

The `fly.toml` is already optimized, but you may want to:

1. **Change app name** (if you want a different name):
   ```toml
   app = "your-app-name"
   ```

2. **Change region** (closest to your users):
   ```toml
   primary_region = "iad"  # Options: iad, ord, dfw, sea, sjc, lhr, cdg, etc.
   ```

3. **Verify VM size** (should be minimal):
   ```toml
   [[vm]]
     cpu_kind = "shared"
     cpus = 1
     memory_mb = 256
   ```

### Step 4: Deploy

```powershell
fly deploy
```

This will:
1. Build your Docker image
2. Push it to Fly.io
3. Deploy and start your app

### Step 5: Verify Deployment

```powershell
# Check app status
fly status

# View logs
fly logs

# Test health endpoint
fly curl /api/v1/health

# Open in browser
fly open
```

## 🔍 Monitoring & Management

### View Logs
```powershell
# Real-time logs
fly logs

# Follow logs
fly logs -a kksonline-backend
```

### Check Status
```powershell
# App status
fly status

# Machine status
fly machine list
```

### Scale Configuration
```powershell
# Current scale (should show min_machines_running: 0)
fly scale show

# If needed, ensure scale-to-zero is enabled
fly scale count 0 --yes
```

### Restart App
```powershell
fly apps restart kksonline-backend
```

## 💰 Cost Optimization Best Practices

### ✅ Already Implemented

1. **Scale-to-Zero**: Machines stop after 5 minutes of inactivity
2. **Minimal VM Size**: 256MB RAM, shared CPU (cheapest option)
3. **Auto-start/stop**: Machines start on first request, stop when idle
4. **Optimized Dockerfile**: Multi-stage build reduces image size
5. **Health Checks**: Efficient health endpoint for monitoring

### 📋 Additional Tips

1. **Monitor Usage**:
   ```powershell
   fly dashboard
   ```
   Check your usage dashboard regularly to ensure you're within free tier

2. **Optimize Cold Starts**:
   - Your app already has graceful shutdown handling
   - Health checks help keep machines warm during active periods

3. **Database Connections**:
   - Ensure Supabase connection pooling is configured
   - Use connection limits to avoid excessive connections

4. **Caching**:
   - Your app already uses node-cache
   - Consider increasing cache TTL for frequently accessed data

5. **Rate Limiting**:
   - Already configured in your app
   - Prevents abuse and unnecessary resource usage

## 🐛 Troubleshooting

### Cold Start Issues
If cold starts are too slow (>15s), you can:
- Keep 1 machine running: `fly scale count 1`
- This costs ~$1.94/month but eliminates cold starts

### Memory Issues
If you see OOM (Out of Memory) errors:
```powershell
# Increase memory (costs more)
fly scale memory 512
```

### Database Connection Issues
- Ensure Supabase allows connections from Fly.io IPs
- Check Supabase connection pooling settings
- Verify environment variables are set correctly

### Build Failures
```powershell
# Check build logs
fly logs --build

# Rebuild locally to test
docker build -t test-build .
```

## 🔐 Security Notes

1. **Secrets**: Never commit secrets to git. Use `fly secrets set`
2. **HTTPS**: Automatically enabled by Fly.io
3. **CORS**: Update `ALLOWED_ORIGINS` with production domains
4. **Rate Limiting**: Already configured in your app

## 📊 Expected Performance

- **Cold Start**: ~10-15 seconds (first request after idle period)
- **Warm Requests**: <100ms response time
- **Concurrent Requests**: Handles 1000-1500 requests/day easily
- **Uptime**: 99.9%+ (within free tier limits)

## 🔄 Updates & Redeployment

To update your app:

```powershell
# Make your code changes
# Then redeploy
fly deploy

# Or deploy from a specific directory
fly deploy --config fly.toml
```

## 📞 Support

- **Fly.io Docs**: https://fly.io/docs
- **Fly.io Status**: https://status.fly.io
- **Community**: https://community.fly.io

## 🎯 Summary

With this configuration:
- ✅ **Cost**: $0/month (within free tier)
- ✅ **Scale-to-Zero**: Enabled (saves money)
- ✅ **Minimal Resources**: 256MB RAM, shared CPU
- ✅ **Auto-scaling**: Starts/stops automatically
- ✅ **Reliability**: Health checks and graceful shutdowns
- ✅ **Security**: HTTPS, secrets management, rate limiting

Your backend is now optimized for minimal cost while maintaining reliability! 🚀
