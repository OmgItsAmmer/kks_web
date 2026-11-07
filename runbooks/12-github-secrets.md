# 12. GitHub secrets (for the backup and job robots)

**Why:** GitHub Actions runs a nightly database backup and a few small jobs for free. They need a few keys, and GitHub Secrets keeps them safe so no one can read them back.
**Time:** 10 minutes. **Needs:** [05-cloudflare-r2.md](05-cloudflare-r2.md) finished. **Needed by:** Phase 2.

## Steps

1. Open your repo on GitHub: `github.com/OmgItsAmmer/kks_web`.
2. Click **Settings** → **Secrets and variables** → **Actions**. (Also check that **Actions** are enabled under **Settings → Actions → General**.)
3. Click **New repository secret** for each row below. Name goes in "Name", the value goes in "Secret".

| Name | Value |
|---|---|
| `R2_BACKUP_ACCESS_KEY_ID` | The Access Key ID of the backup key you made in step 5 of runbook 05 |
| `R2_BACKUP_SECRET_ACCESS_KEY` | The Secret Access Key of the same key |
| `R2_ACCOUNT_ID` | Your R2 account ID (same as in `.env`) |
| `BACKUP_PASSPHRASE` | Another long random text (made the same way). It **encrypts the nightly backups**. Keep a copy in your password manager: without it a backup cannot be opened |
| `API_URL` | The address of the live API, for example `https://api.kks-online.com` (no slash at the end). The job robot calls it |
| `JOBS_SECRET` | Any long random text. Make one in PowerShell with: `-join ((48..57)+(65..90)+(97..122) \| Get-Random -Count 40 \| % {[char]$_})` |

4. Add the same `JOBS_SECRET` value to `kksonline-backend-express/.env` too, and to the Fly secrets (I do that with `flyctl`).
5. I create the read-only database user for backups myself (called `backup_ro`) and give you its connection string through a safe channel. You then add it as a fourth secret named `NEON_BACKUP_DATABASE_URL`. I'll tell you when it's ready; you don't need to do this one yet.

## Check it worked

The **Actions secrets** page lists the names above (GitHub never shows values). In Phase 2, the first manual backup run should end with a green tick.

## Send me

"done 12". Not any value.
