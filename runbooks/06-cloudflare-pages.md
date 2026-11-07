# 06. Cloudflare Pages: hosting for the storefront and the admin

**Why:** Cloudflare Pages hosts the websites for free and allows commercial use (Vercel's free plan is only for non-commercial use). The storefront moves here in Phase 2. The new admin goes here in Phase 3.
**Time:** 20 minutes for the storefront. 10 minutes later for the admin.
**Needs:** [03-cloudflare-domain.md](03-cloudflare-domain.md) finished.

Do **Part A** before Phase 2. Do **Part B** only when I tell you the admin app exists (Phase 3).

## Part A: The storefront (`react-frontend`)

1. In the Cloudflare dashboard (left menu) click **Workers & Pages** → **Create** → **Pages** tab → **Connect to Git**.
2. Click **Connect GitHub**. A GitHub page opens. Choose the account `OmgItsAmmer` and allow access to the repo `kks_web` only (choose "Only select repositories"). Click **Install & Authorize**.
3. Choose the repo `kks_web` → **Begin setup**.
4. Fill in:
   - **Project name:** `kks-store`
   - **Production branch:** `main`
   - **Framework preset:** None (or Vite)
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Root directory (advanced):** `react-frontend`
5. Open **Environment variables** and add these three (take the values from your current Vercel project: Settings → Environment Variables):
   - `VITE_API_BASE_URL`
   - `VITE_GOOGLE_CLIENT_ID`
   - `VITE_LOCATIONIQ_API_KEY`

   Also add `NODE_VERSION` with value `22`.
6. Click **Save and Deploy**. Wait for the build to finish (2 to 4 minutes).
7. Cloudflare gives you an address like `kks-store.pages.dev`. Open it. The store should load.
8. **Do not point your real domain here yet.** I'll tell you when (it happens after I've tested everything). Keep Vercel running until then.

**If the build fails:** copy the last 20 lines of the build log and send them to me.

## Part B: The admin (later)

1. **Workers & Pages** → **Create** → **Pages** → **Connect to Git** → the same repo `kks_web`.
2. Fill in:
   - **Project name:** `kks-admin`
   - **Production branch:** `main`
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Root directory:** `admin-frontend` (I'll confirm the exact folder name when it exists)
3. Environment variables: `VITE_API_BASE_URL` = `https://api.yourdomain.com/api/v1`, and `NODE_VERSION` = `22`.
4. After the first deploy, open the project → **Custom domains** → **Set up a custom domain** → `admin.yourdomain.com`. Cloudflare adds the DNS record for you.

## Check it worked

- Part A: `kks-store.pages.dev` loads the shop and product pictures show.
- Part B: `admin.yourdomain.com` shows the login page (after Phase 3).

## Send me

"done 06 part A" (or "part B"), and the `pages.dev` address.
