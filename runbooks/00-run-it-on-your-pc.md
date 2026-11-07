# 00. Run the new admin on your own computer

**Why:** to see the new admin working before anything goes live. Nothing here touches the live store.
**Time:** 10 minutes.

## What you need

- The `.env` file in `kksonline-backend-express` with the Neon and R2 lines (you already have these).
- Node.js 22 (check with `node --version`).

## Steps

1. Open a terminal in the main `kks_web` folder and install everything once:
   ```
   npm run install:all
   ```
2. Make your admin password (see [10-admin-accounts.md](10-admin-accounts.md) for the full explanation):
   ```
   cd kksonline-backend-express
   npm run admin:hash
   ```
   Type a password (12+ characters). Copy the long text it prints.
3. Add these lines to `kksonline-backend-express/.env` (the `ADMIN_ACCOUNTS` value must stay on **one line**):
   ```
   ADMIN_ACCOUNTS=[{"email":"you@example.com","name":"Your Name","role":"owner","passwordHash":"PASTE_THE_HASH"}]
   ADMIN_SESSION_SECRET=any_long_random_text_at_least_32_characters
   JWT_SECRET=any_long_random_text_at_least_32_characters
   GOOGLE_CLIENT_ID=anything-for-now
   ```
   The last two are for the customer side. For a test on your PC any text works. (For the real server, copy the real values from Fly or Render.)
4. Create the tables in the **dev** database (safe, it is a copy for testing):
   ```
   npm run db:migrate
   ```
5. Check everything is connected:
   ```
   npm run preflight
   ```
   ✅ means good. Lines marked ❌ tell you in plain words what is missing.
6. Go back to the main folder and start everything:
   ```
   cd ..
   npm run dev
   ```
7. Open <http://localhost:5174> and sign in with the email and password from step 2/3.

## If something does not work

| What you see | What to do |
|---|---|
| "Admin sign-in is not configured on this server" | `ADMIN_ACCOUNTS` or `ADMIN_SESSION_SECRET` is missing or not on one line in `.env`. Restart `npm run dev` after editing |
| "Wrong email or password" | The email must match exactly (capitals do not matter). Make a new hash and replace it |
| The page cannot reach the server | The backend is on port 5000. Check the terminal for an error line |
| Pictures show as broken | `cdn.kks-online.com` is not connected yet (runbook 05, step 2) |
| Slow answers (half a second each) | Your internet to Singapore. On the real server both are in Singapore and it is fast |

## Send me

Nothing needed. If something fails, paste the red error lines (never the `.env` file).
