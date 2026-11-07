# 14. Put the new admin online (Vercel admin + Fly API, on Neon)

**Why:** to use the new admin from anywhere before the full cutover. The live shop keeps running on Render and Supabase and is not touched.
**Time:** about 30 minutes, once.

## How the pieces fit

```
Browser ──► https://<your-admin>.vercel.app   (Vercel: the admin screens)
              │  /api/... is forwarded by Vercel (same address, so the login cookie works)
              ▼
            https://<kks-api>.fly.dev          (Fly, Singapore: the new backend)
              ▼
            Neon `dev` branch (your real shop data copy)  +  R2 pictures
```

The storefront and the admin are meant to share this one backend. Until cutover the live storefront still uses the old Render backend.

## Your steps

### 1. Fly: switch to the right account
```
fly auth logout
fly auth login
```
Log in with the account that should own the KKS API, then tell me.

### 2. Vercel: sign in
1. Go to <https://vercel.com>, sign in with GitHub.
2. **Add New → Project**, pick the `kks_web` repository.
3. **Root Directory:** `admin-frontend`. Framework: Vite (detected). Leave the build settings as they are (`vercel.json` sets them).
4. Do not add environment variables: the admin has no secrets.
5. Click **Deploy**. (The API address in `vercel.json` is `kks-api-dev.fly.dev`, the dev API; see plan.md 14.7.)

Send me the address Vercel gives you (like `kks-admin.vercel.app`).

## My steps (after 1 and 2)

1. Create the Fly app, set its secrets from your `.env.development` (never printed), and deploy.
2. Put the Fly address into `admin-frontend/vercel.json`, and set `ADMIN_ORIGIN` on Fly to your Vercel address.
3. Push, let Vercel redeploy, and test sign-in, orders, products and collections.

## Things to know

- **Use a different admin password for this online admin** than the one on your PC. The hash goes into the Fly secret `ADMIN_ACCOUNTS` (make it with `make admin-hash`).
- **Pictures are broken** until `cdn.kks-online.com` is connected to `kks-public` (runbook 05, step 2) and the Supabase image copy has run.
- **Sign-in rate limit:** Vercel forwards requests, so the API sees Vercel's address instead of yours. The "5 tries per 15 minutes" limit is therefore shared by everyone using the admin. That is fine for a small team.
- **Cost:** Vercel Hobby is free for personal use. For a business site Vercel's terms ask for the Pro plan (about $20/month); plan.md recommended Cloudflare Pages, which is free for commercial use. The admin is static, so it can move there later without changes.
