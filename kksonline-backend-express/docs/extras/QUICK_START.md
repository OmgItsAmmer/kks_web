# 🚀 Quick Start - Fly.io Deployment

## Prerequisites

1. **Install Fly CLI**:
   ```powershell
   iwr https://fly.io/install.ps1 -useb | iex
   ```

2. **Login**:
   ```powershell
   fly auth login
   ```

## 5-Minute Deployment

### Step 1: Initialize App
```powershell
cd kksonline-backend-express
fly launch --no-deploy
```

### Step 2: Set Secrets (Required)
```powershell
# Database (get from Supabase Dashboard > Settings > Database)
fly secrets set DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@YOUR_HOST:5432/postgres"

# Supabase
fly secrets set SUPABASE_URL="https://your-project.supabase.co"
fly secrets set SUPABASE_SERVICE_KEY="your_service_key"

# JWT
fly secrets set JWT_SECRET="your_min_32_char_secret"
fly secrets set GOOGLE_CLIENT_ID="your_google_client_id"

# Optional: Set remaining secrets (see DEPLOYMENT.md for full list)
```

### Step 3: Deploy
```powershell
fly deploy
```

### Step 4: Verify
```powershell
fly status
fly logs
fly open
```

## Using the Helper Script

```powershell
# Setup
.\deploy.ps1 -Setup

# Deploy
.\deploy.ps1 -Deploy

# Check status
.\deploy.ps1 -Status

# View logs
.\deploy.ps1 -Logs
```

## Cost

- **Free Tier**: 3 shared-cpu-1x VMs with 256MB RAM
- **Your Config**: 1 VM with scale-to-zero
- **Estimated Cost**: **$0/month** ✅

## Troubleshooting

**Cold start too slow?**
- Keep 1 machine running: `fly scale count 1` (~$1.94/month)

**Out of memory?**
- Increase RAM: `fly scale memory 512` (costs more)

**Need help?**
- See `DEPLOYMENT.md` for detailed guide
- Check Fly.io docs: https://fly.io/docs
