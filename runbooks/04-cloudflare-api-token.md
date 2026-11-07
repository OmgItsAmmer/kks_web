# 04. Cloudflare API token (so I can clear the cache)

**Why:** Cloudflare remembers (caches) product pages for up to a minute so the shop is fast. When you change a product, the app asks Cloudflare to forget the old copy. That needs a token with permission to do only that.
**Time:** 10 minutes. **Needs:** [03-cloudflare-domain.md](03-cloudflare-domain.md) finished.

## Steps

1. In the Cloudflare dashboard, click your domain.
2. On the right side of the **Overview** page, find **API → Zone ID**. Copy it.
3. Open `kksonline-backend-express/.env` and add:
   ```
   CLOUDFLARE_ZONE_ID=paste_the_zone_id_here
   ```
4. Click your profile picture (top right) → **My Profile** → **API Tokens** → **Create Token** → **Create Custom Token** (Get started).
5. Token name: `kks-cache-purge`.
6. Permissions (add two rows):
   - **Zone → Cache Purge → Purge**
   - **Zone → Cache Rules → Edit**
7. Zone Resources: **Include → Specific zone →** choose your domain. (Only this domain. Not "All zones".)
8. Click **Continue to summary** → **Create Token**. Copy the token now. Cloudflare shows it once.
9. Add to the same `.env` file:
   ```
   CLOUDFLARE_API_TOKEN=paste_the_token_here
   ```

## Check it worked

On the token page you can click **Test** (or I check it with the `preflight` command). It must say the token is active.

## Send me

"done 04". Not the token.
