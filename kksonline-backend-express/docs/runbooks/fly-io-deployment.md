# Fly.io Deployment Runbook — Cost-Optimized (Scale-to-Zero)

This runbook covers deploying the KKS Online backend to [Fly.io](https://fly.io) with the **lowest practical bill**: shared CPU, 256 MB RAM, auto stop/start, and zero minimum machines.

## Cost target

| Setting | Value | Typical cost |
|---------|--------|--------------|
| VM | `shared-cpu-1x`, 256 MB | Free tier eligible |
| `min_machines_running` | `0` | $0 when idle |
| `auto_stop_machines` | `true` | Stops after idle (~5 min) |
| `auto_start_machines` | `true` | Starts on first request |
| HA deploy | `--ha=false` | Single machine (cheaper) |

**Expected bill for ~1,000–1,500 requests/day:** $0/month within Fly free tier (3 shared VMs, 160 GB outbound).

Trade-off: **cold starts ~10–15 s** after idle. Keep one machine warm only if latency matters (~$2/month).

---

## Prerequisites

1. [Fly CLI](https://fly.io/docs/hands-on/install-flyctl/) installed
2. Fly account (`fly auth login`)
3. Supabase (or other) PostgreSQL with **connection pooling** URL
4. All secrets from `env.example.txt`

---

## One-time setup

```powershell
cd kksonline-backend-express

# Create app (do not deploy yet)
fly launch --no-deploy

# Confirm fly.toml matches cost settings:
#   min_machines_running = 0
#   auto_stop_machines = true
#   memory_mb = 256
```

Set secrets (never commit these):

```powershell
fly secrets set `
  DATABASE_URL="postgresql://..." `
  SUPABASE_URL="https://xxx.supabase.co" `
  SUPABASE_SERVICE_KEY="..." `
  JWT_SECRET="min-32-char-secret" `
  GOOGLE_CLIENT_ID="....apps.googleusercontent.com" `
  ALLOWED_ORIGINS="https://your-frontend.com"
```

Use Supabase **Session pooler** (port 6543) in `DATABASE_URL` for serverless-style connections.

---

## Deploy

### Manual

```powershell
cd kksonline-backend-express
fly deploy --ha=false
```

### CI/CD (GitHub Actions)

1. Create Fly deploy token: `fly tokens create deploy`
2. Add repository secret: `FLY_API_TOKEN`
3. Push to `main` — workflow `.github/workflows/backend-ci.yml` runs tests, builds Docker, then deploys

---

## Scale down (cheapest mode)

```powershell
# Scale to zero running machines (default in fly.toml)
fly scale count 0

# Confirm auto-stop is enabled
fly config show | Select-String "auto_stop"
```

When `min_machines_running = 0` and `auto_stop_machines = true`, Fly stops VMs after inactivity. The next HTTP request wakes the app (cold start).

### Slightly faster, slightly costlier

```powershell
# Keep exactly one machine always on (~$1.94/mo shared-cpu-1x)
fly scale count 1
```

Revert to cheapest:

```powershell
fly scale count 0
```

---

## Docker local test (matches production image)

```powershell
# Start Postgres + API (test stack)
docker compose -f docker-compose.test.yml up -d postgres

# Push schema to test DB
$env:DATABASE_URL="postgresql://postgres:postgres@localhost:5433/kks_test?schema=public"
npx prisma db push

# Run full test suite
npm run test

# Optional: run API container
docker compose -f docker-compose.test.yml up --build api
curl http://localhost:8080/api/v1/health
```

Production image build (same as Fly):

```powershell
docker build -t kksonline-backend:local .
docker run -p 8080:8080 --env-file .env kksonline-backend:local
```

---

## Health & monitoring

```powershell
fly status
fly logs
fly checks list
curl https://<app-name>.fly.dev/api/v1/health
```

Healthy response:

```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "..."
}
```

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|----------------|-----|
| Cold start timeout | 256 MB + Prisma startup | Increase grace period in `fly.toml` checks; or `fly scale count 1` |
| OOM / crash loop | Memory too low | `fly scale memory 512` (costs more) |
| DB connection errors | Direct DB URL, too many connections | Use Supabase pooler URL (`?pgbouncer=true`) |
| CORS errors | Missing production origin | `fly secrets set ALLOWED_ORIGINS="https://..."` |
| Deploy fails in CI | Missing `FLY_API_TOKEN` | Add secret in GitHub repo settings |

---

## Rollback

```powershell
fly releases list
fly releases rollback
```

---

## Security checklist

- [ ] Secrets only via `fly secrets set`, not in `fly.toml`
- [ ] `DATABASE_URL` uses pooler, not direct connection in production
- [ ] `ALLOWED_ORIGINS` lists production frontend only
- [ ] JWT secret ≥ 32 characters, rotated periodically
- [ ] Fly deploy token scoped to this app only

---

## Related files

- `fly.toml` — scale-to-zero VM config
- `Dockerfile` — multi-stage production build
- `docker-compose.test.yml` — local Postgres + API
- `.github/workflows/backend-ci.yml` — test + Docker + Fly deploy
- `tests/` — unit, integration, and system tests
