# 02. Neon: API key and the blocked port

**Why:** The Neon database is already created (Singapore, Postgres 18). Two things are left that only you can do. First, make an API key so a daily check can read how much of the free allowance is used. Second, find out why this computer can't reach the database.
**Time:** 10 minutes.

## Part A: Make the Neon API key

1. Go to <https://console.neon.tech> and sign in.
2. Click your profile picture (top right) → **Account settings** (or **Personal settings**) → **API keys**.
3. Click **Create new API key**. Name it `kks-usage-check`.
4. Copy the key right away. Neon shows it only once.
5. Open `kksonline-backend-express/.env` and add a line:
   ```
   NEON_API_KEY=paste_the_key_here
   ```
   (Not sure how? See [01-secrets.md](01-secrets.md).)

**Check:** the line is in the file and the key starts with `napi_`.

## Part B: The blocked port (database cannot be reached from your PC)

**What I found:** from your computer, the connection to Neon on port 5432 times out. The same server answers fine on port 443. That usually means your internet provider, router or office network blocks port 5432. It is not a problem with Neon. The live server on Fly will not have this problem, but I need it to work on your PC to test.

Try these in order. Stop when one works.

1. **Phone hotspot.** Turn on your phone's hotspot, connect your PC to it, then run this in PowerShell:
   ```
   Test-NetConnection ep-hidden-moon-ao1cyb40.c-2.ap-southeast-1.aws.neon.tech -Port 5432
   ```
   If it shows `TcpTestSucceeded : True`, then your normal internet blocks port 5432.
2. **Turn off a VPN or firewall** you might be running (some antivirus programs have a "network protection" switch). Test again.
3. **Call your internet provider** (or ask the office IT person) and ask: "Please open outgoing TCP port 5432." Some providers refuse.
4. **If none of that works**, tell me. I'll switch my local testing to Neon's web-based connection, which uses port 443. The live server stays on the normal connection.

**Check:** `TcpTestSucceeded : True` on at least one network.

## Send me

- "done 02", plus which option worked (hotspot, VPN off, provider, or none).
- Do not paste the API key.
