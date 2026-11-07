# 01. Where to put secrets

**Why:** I need keys to connect to Neon, Cloudflare, OpenAI and so on. If a key ends up in chat or in GitHub, anyone can use it. So keys go in a few safe places only.
**Time:** 5 minutes.

## The safe places

| Place | Used for | How |
|---|---|---|
| **`.env.development` or `.env.local`** | Everyday local development on your computer | Described below |
| **GitHub Secrets** | Automated workflows (backups, jobs) | See [12-github-secrets.md](12-github-secrets.md) |
| **Fly.io Secrets** | Live Express backend | Set via `flyctl secrets set` (never from files) |
| **Cloudflare Pages Environment** | Live storefront & admin frontends | Set in Cloudflare Pages dashboard |

## Steps for local development env files

1. In `kksonline-backend-express`:
   - `.env.development` holds everyday local development keys (points to dev Neon branch and test buckets).
   - `.env.local` can be created for your personal machine overrides (it wins over `.env.development`).
2. Each key goes on its own line:
   ```
   R2_ACCOUNT_ID=abc123
   OPENAI_API_KEY=sk-xxxxxxxx
   ```
   No spaces around `=`, and no quote marks needed.
3. The runbooks tell you the exact name for each key (the part before `=`). Use those names exactly.

## How env files are loaded (Precedence)

When the backend or scripts run, files are loaded in this order (first file wins):
1. Environment variables already set in your terminal / process
2. `.env.<APP_ENV>.local` (e.g. `.env.development.local`)
3. `.env.local` (machine overrides)
4. `.env.<APP_ENV>` (e.g. `.env.development`)
5. Root `.env.local` (written automatically by the Neon CLI for `DATABASE_URL`)

## Already done for you

The Neon database addresses are in `.env.local` at the root of `kks_web`. Neon's tool wrote it automatically when you ran `neon checkout dev`. Do not delete or rename it so `neon checkout` continues working.

## Running against Production vs Dev

- Everyday development runs with `APP_ENV=development` (default).
- To deliberately run a script against production, set `APP_ENV=production`.
- Safety guards: writing scripts against production require an explicit flag: `CONFIRM_PRODUCTION=yes`. Dangerous operations like `--reset` and `smoke-admin` are completely blocked on production.

## Frontend environment rules

Frontend apps (`react-frontend` and `admin-frontend`) are compiled and served directly to the browser.
- **NEVER put secrets or private keys in frontend env files!** Everything with `VITE_` prefix is public to any website visitor.
- Run `npm run check:env` in either frontend to verify no secret-like names are set.

## Check it is safe

Open a terminal in the main folder and run:

```
git check-ignore -v kksonline-backend-express/.env.development react-frontend/.env.development admin-frontend/.env.development
```

You should see lines that mention `.gitignore`. If it prints nothing, stop and tell me, because that means the files could be uploaded.

## If a key leaks

If you pasted a key in chat, in a commit or anywhere public, do not panic: go to that service's dashboard, delete (revoke) the key, make a new one and update your local env file. Then tell me which service it was.

## Send me

Nothing. Just tell me when a key is in place, for example "done 05 R2 keys in .env.development".

