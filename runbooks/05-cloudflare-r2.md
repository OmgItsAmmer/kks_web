# 05. Cloudflare R2: where images and backups live

**Why:** R2 replaces Supabase Storage. It holds product images (public) and receipts and database backups (private). It costs $0 up to 10 GB, and unlike Supabase it doesn't freeze.
**Time:** 20 minutes. **Needs:** [03-cloudflare-domain.md](03-cloudflare-domain.md) finished (domain Active).

## Steps

### 1. Turn on R2
1. In the Cloudflare dashboard (left menu) click **R2 Object Storage**.
2. Click **Purchase R2 Plan** / **Enable R2**. It asks for a payment card. **You are not charged inside the free allowance** (10 GB storage). Choose the free plan.
3. Copy your **Account ID** from the R2 page (it's also on the right side of the main dashboard). Add to `kksonline-backend-express/.env`:
   ```
   R2_ACCOUNT_ID=paste_it_here
   ```

### 2. Make the public bucket (images everyone can see)
1. Click **Create bucket**. Name: `kks-public`. Location: **Automatic** (or Asia-Pacific if it asks). Click **Create**.
2. Open the bucket → **Settings** → **Custom Domains** → **Add**.
3. Type `cdn.yourdomain.com` (use your real domain). Click **Continue** and **Connect domain**. Cloudflare adds the DNS record by itself.
4. **Leave "R2.dev subdomain" turned off.** We don't use it.
5. Wait a few minutes until the domain status says **Active**.

### 3. Make the private bucket (receipts and backups)
1. Click **Create bucket**. Name: `kks-private`. Click **Create**.
2. Don't add any domain and don't turn on public access. It stays private.

### 4. Make the access key
1. On the R2 main page click **Manage API tokens** (right side) → **Create API token**.
2. Name: `kks-app`. Permission: **Object Read & Write**.
3. Under "Specify bucket(s)", choose **Apply to specific buckets only** and tick both `kks-public` and `kks-private`.
4. Click **Create API Token**.
5. You see an **Access Key ID** and a **Secret Access Key**. Copy both now (shown once). Add to `.env`:
   ```
   R2_ACCESS_KEY_ID=paste_it_here
   R2_SECRET_ACCESS_KEY=paste_it_here
   R2_PUBLIC_BUCKET=kks-public
   R2_PRIVATE_BUCKET=kks-private
   ASSET_BASE_URL=https://cdn.yourdomain.com
   ```
   (Use your real domain in the last line.)

### 5. A second key just for backups
The nightly backup robot should have its own key, so that if it leaks, only backups are at risk.
1. **Create API token** again. Name: `kks-backup`. Permission: **Object Read & Write**. Only bucket: `kks-private`.
2. Copy the two values but **don't put them in `.env`**. They go in GitHub (see [12-github-secrets.md](12-github-secrets.md)). Keep them in a safe temporary place until then, such as a password manager.

## Check it worked

- `kks-public` shows a custom domain with status **Active**.
- Both buckets are listed on the R2 page.
- Upload any small picture to `kks-public` in the dashboard, then open `https://cdn.yourdomain.com/thatfilename.png` in a browser. The picture shows. Then delete it.

## Send me

- "done 05".
- The size of your current Supabase **Storage** (see [11-supabase-steps.md](11-supabase-steps.md)). It tells me if the PNG images fit in 10 GB.
- Not the keys.
