# Environment Files Architecture

This document describes the environment variable setup across all three applications in KKS Online.

---

## 1. File List per App

### kksonline-backend-express (Express API on Fly.io)
| File | Git Status | Purpose |
|---|---|---|
| `.env.example` | Committed template | Documentation of all variable names and descriptions (no real secrets). |
| `.env.development` | Ignored | Everyday local development against Neon `dev` branch and local/test services. |
| `.env.production` | Ignored | Local PC only for running targeted migration/status scripts against production. |
| `.env.local` | Ignored | Personal machine-specific overrides (wins over `.env.development`). |
| `../.env.local` | Ignored | Managed automatically at the repo root by the Neon CLI (`neon checkout dev`). |

### react-frontend (Storefront on Cloudflare Pages)
| File | Git Status | Purpose |
|---|---|---|
| `.env.example` | Committed template | Template for storefront frontend variables. |
| `.env.development` | Ignored | Points to `http://localhost:5000` (local backend). |
| `.env.production` | Ignored | Public production values (`https://api.kks-online.com`, `https://cdn.kks-online.com`). |
| `.env.local` | Ignored | Personal machine-specific overrides. |

### admin-frontend (Admin App on Cloudflare Pages)
| File | Git Status | Purpose |
|---|---|---|
| `.env.example` | Committed template | Template for admin frontend variables. |
| `.env.development` | Ignored | Uses `/api/v1` through the local Vite dev proxy (`http://localhost:5000`). |
| `.env.production` | Ignored | Uses `https://api.kks-online.com/api/v1` directly. |
| `.env.local` | Ignored | Personal machine-specific overrides. |

---

## 2. API Base URL Difference between Frontends

Notice that the two frontends structure `VITE_API_BASE_URL` differently:
- **`react-frontend`**: Expects `VITE_API_BASE_URL` **WITHOUT** `/api/v1` (e.g. `http://localhost:5000` in dev, `https://api.kks-online.com` in prod). The code (`services/api.config.ts`) internally appends `/api/v1`.
- **`admin-frontend`**: Expects `VITE_API_BASE_URL` **WITH** `/api/v1` (e.g. `/api/v1` in dev via Vite proxy, `https://api.kks-online.com/api/v1` in prod). The client code (`src/lib/api-client.ts`) directly appends sub-routes like `/admin`.

---

## 3. Backend Loader Precedence Table

The backend loader (`src/config/load-env.ts` and `scripts/load-env.cjs`) resolves active environment via `APP_ENV` (falling back to `NODE_ENV`, defaulting to `development`).
Because `dotenv` is **first-wins** (does not overwrite already set variables), files are loaded from most specific to least specific:

| Priority | Source / File | Purpose / Behavior |
|:---:|---|---|
| **1 (Highest)** | Process environment (`process.env`) | Terminal exports, Fly.io secrets, test runners |
| **2** | `.env.<env>.local` (e.g. `.env.development.local`) | Environment-specific local overrides |
| **3** | `.env.local` | Local overrides on current machine |
| **4** | `.env.<env>` (e.g. `.env.development`) | Standard environment settings |
| **5** | `.env` | Legacy fallback (transitional during migration) |
| **6 (Fallback)** | Root `../.env.local` | Written by Neon CLI (`DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `NEON_BRANCH`) |

---

## 4. Production Safety Guards

To prevent accidental data loss or writes to the production database:
1. **Startup Check**: If `NODE_ENV=production`, the API immediately terminates at startup if required variables (`DATABASE_URL`, `JWT_SECRET`, `GOOGLE_CLIENT_ID`, `R2_*`, `CLOUDFLARE_*`, `ADMIN_ACCOUNTS`, `ADMIN_SESSION_SECRET`, `JOBS_SECRET`) are missing.
2. **Refusal on Production**: `scripts/smoke-admin.mjs` and `scripts/migrate-from-supabase.mjs --reset` actively refuse to run when `APP_ENV=production` or `NEON_BRANCH=production`.
3. **Explicit Confirmation**: Applying schema/data migrations (`--apply`) against production requires setting `CONFIRM_PRODUCTION=yes`.

---

## 5. Where Production Values Live

Production configurations **NEVER** come from `.env` files in production environments:

### Fly.io Secrets (Backend API)
Set with `flyctl secrets set KEY=VALUE`:
- `DATABASE_URL` (Neon pooled string for production branch)
- `DATABASE_URL_UNPOOLED` (Neon direct string for production migrations)
- `JWT_SECRET`
- `GOOGLE_CLIENT_ID`
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_PUBLIC_BUCKET` (`kks-public`)
- `R2_PRIVATE_BUCKET` (`kks-private`)
- `ASSET_BASE_URL` (`https://cdn.kks-online.com`)
- `CLOUDFLARE_ZONE_ID`
- `CLOUDFLARE_API_TOKEN`
- `ADMIN_ACCOUNTS` (single-line JSON with bcrypt hashes)
- `ADMIN_SESSION_SECRET`
- `ADMIN_ORIGIN` (`https://admin.kks-online.com`)
- `COOKIE_DOMAIN` (`.kks-online.com`)
- `JOBS_SECRET`
- `OPENAI_API_KEY`
- `NEON_API_KEY` (optional)
- `SENTRY_DSN` (optional)

### Cloudflare Pages Dashboard Settings (Frontends)
Configured under **Settings -> Environment variables** for each Pages project:
- **react-frontend**:
  - `VITE_API_BASE_URL`: `https://api.kks-online.com`
  - `VITE_ASSET_BASE_URL`: `https://cdn.kks-online.com`
  - `VITE_GOOGLE_CLIENT_ID`: Google OAuth Client ID
  - `VITE_LOCATIONIQ_API_KEY`: LocationIQ public key
- **admin-frontend**:
  - `VITE_API_BASE_URL`: `https://api.kks-online.com/api/v1`
  - `VITE_ASSET_BASE_URL`: `https://cdn.kks-online.com`

### GitHub Actions Secrets (Automation & Backups)
Configured in GitHub repository **Settings -> Secrets and variables -> Actions**:
- `API_URL` (`https://api.kks-online.com`)
- `JOBS_SECRET`
- `BACKUP_PASSPHRASE`
- `NEON_BACKUP_DATABASE_URL`
- `R2_BACKUP_ACCESS_KEY_ID`
- `R2_BACKUP_SECRET_ACCESS_KEY`
- `R2_ACCOUNT_ID`

