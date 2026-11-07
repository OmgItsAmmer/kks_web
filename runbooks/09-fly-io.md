# 09. Fly.io: the server that runs the API (always on)

**Why:** Your API runs on Fly in Singapore. Right now it turns itself off when idle, so the first visitor waits 2 to 4 seconds. You agreed to keep one machine always on (about $2 a month). Fly needs a payment card for that.
**Time:** 15 minutes.

## Steps

1. Go to <https://fly.io> and sign in (the account that already owns the app `kksonline-backend`).
2. Open **Billing** in the dashboard. Make sure a **payment card** is added. Fly won't keep a machine running without one.
3. Install the Fly command-line tool on your PC, if you haven't:
   - Open PowerShell and run:
     ```
     iwr https://fly.io/install.ps1 -useb | iex
     ```
   - Close and reopen PowerShell.
4. Log in:
   ```
   fly auth login
   ```
   A browser opens. Approve it.
5. Check I can see your app:
   ```
   fly status -a kksonline-backend
   ```
   You should see the app and its region `sin`.
6. That's all. **I change the settings myself** (`min_machines_running = 1`, the health check, secrets) with this login. Don't change settings by hand.

## Check it worked

`fly status -a kksonline-backend` prints a machine and no error. If it asks "app not found", you may be on a different Fly account: tell me.

## What it costs

About $2 a month for one small always-on machine. The Fly dashboard shows the exact amount under **Billing**. Set a spending alert if you like.

## Send me

"done 09". Also tell me if `render.yaml` (Render) is also live, because the repo has both. If Render is old and unused, I'll remove it.
