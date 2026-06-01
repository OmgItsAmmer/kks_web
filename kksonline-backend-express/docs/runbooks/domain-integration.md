# Domain Integration Runbook — kks-online.com

Connect the Hostinger domain **kks-online.com** to the production stack:

| Component | Platform | Production URL (target) |
|-----------|----------|-------------------------|
| React storefront | Vercel | `https://kks-online.com` and `https://www.kks-online.com` |
| Express API | Fly.io (`kksonline-backend`) | `https://api.kks-online.com` (recommended) or `https://kksonline-backend.fly.dev` |

DNS stays at **Hostinger** (registrar). You only add records Hostinger and Vercel/Fly tell you to add.

---

## End state (recommended)

```
Browser
   │
   ├─► https://kks-online.com          ──► Vercel (react-frontend)
   ├─► https://www.kks-online.com      ──► Vercel (redirect or same project)
   └─► https://api.kks-online.com      ──► Fly.io (kksonline-backend)
              ▲
              └── VITE_API_BASE_URL in Vercel
```

---

## Prerequisites

- [ ] Domain **kks-online.com** active in [Hostinger](https://hpanel.hostinger.com/)
- [ ] Frontend deployed on [Vercel](https://vercel.com/) (`react-frontend` project)
- [ ] Backend deployed on Fly.io — see [fly-io-deployment.md](./fly-io-deployment.md)
- [ ] Health check works: `curl https://kksonline-backend.fly.dev/api/v1/health`
- [ ] Access to **Vercel** project env vars and **Fly** secrets

---

## Part 1 — Frontend on Vercel (kks-online.com)

### 1.1 Add domains in Vercel

1. Open the Vercel project for `react-frontend`.
2. **Settings → Domains**.
3. Add:
   - `kks-online.com` (apex)
   - `www.kks-online.com`
4. Set **primary domain** to `kks-online.com` and enable redirect **www → apex** (or the reverse — pick one canonical URL and stick to it).

Vercel shows **Invalid Configuration** until DNS is correct. Keep that tab open for the exact records.

### 1.2 DNS at Hostinger (Vercel records)

In Hostinger: **Domains → kks-online.com → DNS / DNS Zone**.

Remove conflicting old `A` / `CNAME` records for `@` and `www` if they point elsewhere.

Add what Vercel requests (typical values — **always prefer the values shown in your Vercel Domains UI**):

| Type | Name / Host | Value | TTL |
|------|-------------|-------|-----|
| `A` | `@` | `76.76.21.21` | 300–3600 |
| `CNAME` | `www` | `cname.vercel-dns.com` | 300–3600 |

Notes:

- Some panels label `@` as blank or `kks-online.com`.
- If Hostinger does not allow `CNAME` on apex, use only the `A` record Vercel lists; Vercel’s UI is authoritative.
- DNS propagation: **15 minutes to 48 hours**. Re-check in Vercel until both domains show **Valid**.

### 1.3 Verify HTTPS on Vercel

After DNS is valid, Vercel issues certificates automatically. Confirm:

- `https://kks-online.com` loads the storefront
- `https://www.kks-online.com` redirects to your canonical host (if configured)

---

## Part 2 — API subdomain on Fly.io (api.kks-online.com)

Using a custom API host avoids mixed branding and makes CORS and OAuth origins clearer.

### 2.1 Create certificate on Fly

```powershell
cd kksonline-backend-express
fly certs create api.kks-online.com -a kksonline-backend
fly certs show api.kks-online.com -a kksonline-backend
```

Fly prints DNS instructions (often a `CNAME` for `api` → `kksonline-backend.fly.dev`, or `A`/`AAAA` targets). Use **exactly** what `fly certs show` outputs.

### 2.2 DNS at Hostinger (API record)

Example (confirm with `fly certs show`):

| Type | Name / Host | Value |
|------|-------------|-------|
| `CNAME` | `api` | `kksonline-backend.fly.dev` |

Wait until:

```powershell
fly certs check api.kks-online.com -a kksonline-backend
```

shows the certificate as ready.

### 2.3 Smoke test API

```powershell
curl https://api.kks-online.com/api/v1/health
```

Expect JSON with `"status":"ok"` and `"database":"connected"`.

**Skip custom API domain:** you can keep `https://kksonline-backend.fly.dev` as `VITE_API_BASE_URL` and skip Part 2. Custom domain is still recommended for production.

---

## Authentication & domain (how sign-in works)

Production auth is **Google Sign-In (ID token / credential flow)** — not a redirect to your API and **not** Supabase Auth for customers.

### Flow (production)

```mermaid
sequenceDiagram
    participant User
    participant Store as kks-online.com (Vercel)
    participant Google
    participant API as api.kks-online.com (Fly)

    User->>Store: Open site / protected page
    Store->>User: Login modal (GoogleLogin button)
    User->>Google: Sign in (popup / account picker)
    Google->>Store: ID token (JWT credential)
    Store->>API: POST /api/v1/auth/google { idToken }
    Note over Store,API: Cross-origin; needs ALLOWED_ORIGINS + CORS
    API->>Google: verifyIdToken (GOOGLE_CLIENT_ID)
    API->>API: Create/link customer, issue JWT (45m)
    API->>Store: { token, user }
    Store->>Store: localStorage auth_token
    Store->>API: GET /api/v1/auth/me (Authorization Bearer)
```

| Step | Where | What happens |
|------|--------|----------------|
| 1 | Browser on **storefront domain** | `@react-oauth/google` (`GoogleLogin` in `LoginModal`) talks to Google using `VITE_GOOGLE_CLIENT_ID`. Google checks **Authorized JavaScript origins** match the page URL (`https://kks-online.com`). |
| 2 | Browser | Google returns a one-time **ID token** (`credential`). No redirect to `api.kks-online.com`. |
| 3 | Browser → API | `POST {VITE_API_BASE_URL}/api/v1/auth/google` with `{ "idToken": "..." }`. |
| 4 | Fly backend | `google-auth-library` verifies the ID token audience equals `GOOGLE_CLIENT_ID`, upserts customer, returns app **JWT** (45 minutes). |
| 5 | Browser | JWT saved as `localStorage.auth_token`; later requests send `Authorization: Bearer <token>`. |
| 6 | Session end | Frontend timer logs out at JWT expiry; `401` responses also clear the token. **Refresh tokens are not implemented** — user signs in with Google again. |

Protected routes (login modal if not signed in): `/cart`, `/checkout`, `/wishlist`, `/orders`, `/orders/:orderId`. Browsing and product pages work without login.

### What domains affect auth

| Setting | Must match |
|---------|------------|
| User’s browser address bar | An entry in Fly `ALLOWED_ORIGINS` (exact `https://host`, no path) |
| Google **Authorized JavaScript origins** | Same storefront URL(s) users open |
| `VITE_GOOGLE_CLIENT_ID` (Vercel) | Fly `GOOGLE_CLIENT_ID` (same OAuth Web client) |
| `VITE_API_BASE_URL` (Vercel) | Public API base URL users’ browsers call |

The API hostname (`api.kks-online.com`) does **not** go in Google JavaScript origins — only the Vercel storefront host does.

### Google Cloud Console (credential flow)

Use an OAuth **Web application** client.

**Authorized JavaScript origins** — required:

| Environment | Origin |
|-------------|--------|
| Local (Vite) | `http://localhost:5173` |
| Production (canonical) | `https://kks-online.com` |
| Production (if www is reachable) | `https://www.kks-online.com` |

**Authorized redirect URIs** — **not used** by this app (`GoogleLogin` + ID token, not OAuth redirect). You can leave redirect URIs empty or keep dev URIs only; do not confuse them with JavaScript origins.

OAuth consent screen: add `kks-online.com` under **Authorized domains** if Google prompts for domain verification.

---

## Part 3 — Application configuration (required)

Environment changes are **not** picked up from Hostinger or DNS alone. Update Vercel and Fly after DNS works.

### 3.1 Vercel environment variables (frontend + auth)

**Settings → Environment Variables** (Production):

| Variable | Example value | Notes |
|----------|---------------|-------|
| `VITE_API_BASE_URL` | `https://api.kks-online.com` | No trailing slash. Auth calls `{base}/api/v1/auth/google`. |
| `VITE_GOOGLE_CLIENT_ID` | `….apps.googleusercontent.com` | **Must equal** Fly `GOOGLE_CLIENT_ID` or Google returns / backend rejects with audience mismatch. |
| `VITE_LOCATIONIQ_API_KEY` | `pk.…` | Optional; address geocoding only. |

`VITE_*` variables are baked in at **build time**. After changing them:

1. **Deployments → Redeploy** latest production deployment, or push a commit to trigger a build.

If `VITE_GOOGLE_CLIENT_ID` is empty, `GoogleOAuthProvider` gets an empty client ID and sign-in fails silently or with a Google error.

### 3.2 Fly.io secrets (API + auth + CORS)

Set auth-related secrets together with CORS:

```powershell
fly secrets set `
  ALLOWED_ORIGINS="https://kks-online.com,https://www.kks-online.com" `
  GOOGLE_CLIENT_ID="YOUR_CLIENT_ID.apps.googleusercontent.com" `
  JWT_SECRET="your-min-32-char-secret" `
  -a kksonline-backend
```

| Secret | Role |
|--------|------|
| `ALLOWED_ORIGINS` | Comma-separated storefront origins for `cors()` (see `src/app.ts`). Required for browser `POST /auth/google` from Vercel. |
| `GOOGLE_CLIENT_ID` | Verifies Google ID token `aud` claim in `auth.service.ts`. |
| `JWT_SECRET` | Signs session JWTs returned to the browser (45m expiry). |

Rules:

- Include **every** origin users can open (apex and `www` if both work without redirect).
- No trailing slashes on origins.
- `GOOGLE_CLIENT_SECRET` is **not** in `env.config.ts` and is **not** used for this ID-token flow.

Fly restarts machines after `fly secrets set`; no full redeploy needed.

### 3.3 Google Cloud Console

See [Authentication & domain](#authentication--domain-how-sign-in-works) above. Summary:

1. [Credentials](https://console.cloud.google.com/apis/credentials) → OAuth 2.0 Client ID (Web application).
2. Add production **JavaScript origins** (`https://kks-online.com`, and `www` if needed).
3. Keep `http://localhost:5173` for local dev.
4. Do **not** rely on redirect URIs for this app’s sign-in button.

### 3.4 Supabase

Customer login does **not** use Supabase Auth. Supabase is database/storage only — no Supabase “Site URL” change is required for Google sign-in unless you add Supabase Auth later.

---

## Part 4 — Verification checklist

Run through this after DNS and env updates:

| Check | How |
|-------|-----|
| Apex site loads | Open `https://kks-online.com` |
| www behavior | Open `https://www.kks-online.com` — should match canonical strategy |
| API health | `curl https://api.kks-online.com/api/v1/health` |
| API from browser | DevTools → Network: API calls go to `api.kks-online.com` (or your chosen base URL), not `localhost` |
| No CORS errors | Console clean when opening `/cart` and signing in |
| Google sign-in | `/cart` → login modal → Google → `POST .../auth/google` → `200`, then `GET .../auth/me` → `200` |
| Token stored | Application → Local Storage → `auth_token` present after login |
| Protected pages | `/wishlist`, `/checkout` work when signed in |
| SSL | Padlock valid on apex, www, and api |

**Auth smoke test (DevTools → Network):**

1. Filter `auth/google` — request URL must be `https://<api-host>/api/v1/auth/google`, not `localhost`.
2. Response body should include `data.token` and `data.user`.
3. Subsequent requests include header `Authorization: Bearer eyJ...`.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|----------------|-----|
| Vercel domain “Invalid Configuration” | DNS not propagated or wrong records | Compare Hostinger records to Vercel Domains UI; wait up to 48h; use [dnschecker.org](https://dnschecker.org/) for `@` and `www` |
| Site shows Hostinger parking / old site | Old `A` record or wrong nameservers | Remove stale records; ensure nameservers are Hostinger’s (unless you intentionally moved DNS to Vercel) |
| `NET::ERR_CERT_*` on API | Fly cert not issued | `fly certs check api.kks-online.com`; fix `api` CNAME/A per `fly certs show` |
| CORS error on `POST /auth/google` | `ALLOWED_ORIGINS` missing the storefront host | Match the **address bar** origin exactly (e.g. user on `www` but only apex listed) |
| API calls still go to `localhost:5000` | `VITE_API_BASE_URL` unset or not rebuilt | Set in Vercel Production, **redeploy** frontend |
| Google `origin_mismatch` / popup blocked | JavaScript origins missing in Google Console | Add `https://kks-online.com` (and `www` if used) — **not** the API subdomain |
| `Google Client ID mismatch` (API 401) | `VITE_GOOGLE_CLIENT_ID` ≠ Fly `GOOGLE_CLIENT_ID` | Align both to the same Web client ID; redeploy Vercel |
| Sign-in works on apex but not www | Split origins | Add both to `ALLOWED_ORIGINS` and Google JavaScript origins, or force redirect to one canonical host |
| Login then immediate logout / 401 on `/auth/me` | Wrong `JWT_SECRET` on Fly or expired token | Ensure `JWT_SECRET` is set and stable; re-login after secret rotation |
| `Authentication required` after ~45 min | Expected JWT expiry | User signs in with Google again (no refresh flow) |
| Empty Google button / instant error | `VITE_GOOGLE_CLIENT_ID` missing at build | Set in Vercel, redeploy |
| 502 / timeout on first API hit | Fly cold start (~10–15 s) | Retry login; see [fly-io-deployment.md](./fly-io-deployment.md) |
| Mixed content blocked | HTTP API from HTTPS site | Ensure `VITE_API_BASE_URL` uses `https://` |

---

## Quick reference — record summary

After setup, Hostinger DNS often looks like:

| Type | Host | Points to |
|------|------|-----------|
| `A` | `@` | `76.76.21.21` (Vercel — confirm in UI) |
| `CNAME` | `www` | `cname.vercel-dns.com` (Vercel — confirm in UI) |
| `CNAME` | `api` | `kksonline-backend.fly.dev` (Fly — confirm with `fly certs show`) |

---

## Related docs

- [fly-io-deployment.md](./fly-io-deployment.md) — backend deploy, secrets, cold starts
- `kksonline-backend-express/env.example.txt` — `ALLOWED_ORIGINS`, `GOOGLE_CLIENT_ID`, `JWT_SECRET`
- `react-frontend/env.example.txt` — `VITE_API_BASE_URL`, `VITE_GOOGLE_CLIENT_ID`
- `docs/extras/AUTHENTICATION_SETUP.md` — deeper auth guide (note: redirect URI steps do not apply to the current `GoogleLogin` flow)

### Auth-related source files

| Layer | File |
|-------|------|
| Google button | `react-frontend/src/components/auth/LoginModal.tsx` |
| Session state | `react-frontend/src/contexts/AuthContext.tsx` |
| API + `Authorization` header | `react-frontend/src/services/api.config.ts`, `auth.service.ts` |
| Verify Google + issue JWT | `kksonline-backend-express/src/services/auth.service.ts` |
| Routes | `kksonline-backend-express/src/routes/auth.routes.ts` |
| CORS | `kksonline-backend-express/src/app.ts` |

---

## Optional next steps

- **Email** on `@kks-online.com`: configure Hostinger mail or forwarders separately from this runbook.
- **Staging**: use a subdomain (e.g. `staging.kks-online.com`) on a second Vercel environment with its own `ALLOWED_ORIGINS` entry.
- **CDN / images**: Cloudinary and Supabase URLs are independent of this domain; no DNS change required unless you add a custom storage domain.
