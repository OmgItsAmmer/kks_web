# Runbooks: the things only you can do

These are step-by-step guides for the setup jobs that need **you** (accounts, payment cards, dashboards, DNS). Everything I can do myself (code, the Neon dev branch, database roles, Fly settings, tests) has no runbook.

Each runbook says: why you are doing it, how long it takes, the exact steps, how to check it worked, and what to send me.

## The rules

1. **Never paste a secret into the chat.** A secret is a password, an API key, a token or a connection string. Put it in the place the runbook says (a `.env` file or GitHub Secrets). Then just tell me "done" in chat. See [01-secrets.md](01-secrets.md).
2. **Do them in the order below.** Later ones need the earlier ones.
3. **Stuck?** Tell me the runbook number and the step number, and paste the error message (never the secret).
4. **When you finish one**, tell me, for example: "done 05". I run a check (`npm run preflight`, once I've written it in Phase 1) that prints a tick or a cross for each item without printing any secret.

## Order

| Order | Runbook | What it is | Time | Needed for |
|---|---|---|---|---|
| 0 | [00-run-it-on-your-pc.md](00-run-it-on-your-pc.md) | See the new admin working on your computer | 10 min | Any time |
| 1 | [01-secrets.md](01-secrets.md) | Where to put keys safely | 5 min | Everything |
| 2 | [02-neon.md](02-neon.md) | Neon API key, and the blocked port problem | 10 min | Phase 1 |
| 3 | [03-cloudflare-domain.md](03-cloudflare-domain.md) | Cloudflare account and your domain | 30 min, plus waiting up to a day | Phase 1 |
| 4 | [04-cloudflare-api-token.md](04-cloudflare-api-token.md) | A token so I can clear the cache | 10 min | Phase 2 |
| 5 | [05-cloudflare-r2.md](05-cloudflare-r2.md) | R2 buckets for images and backups | 20 min | Phase 1 |
| 6 | [09-fly-io.md](09-fly-io.md) | Fly.io login, card, always-on machine | 15 min | Phase 0 |
| 7 | [11-supabase-steps.md](11-supabase-steps.md) | Safety steps and sizes in the old Supabase | 20 min | Phase 0 and 1 |
| 8 | [12-github-secrets.md](12-github-secrets.md) | Secrets for the backup and job robots | 10 min | Phase 2 |
| 9 | [06-cloudflare-pages.md](06-cloudflare-pages.md) | Hosting for the storefront (now) and admin (later) | 20 min | Phase 2 and 3 |
| 10 | [10-admin-accounts.md](10-admin-accounts.md) | Your admin sign-in (fixed accounts) | 5 min | Phase 3 |
| 12 | [07-openai.md](07-openai.md) | OpenAI key with a spending limit | 10 min | Phase 6 |
| 13 | [13-production-cutover.md](13-production-cutover.md) | The night we switch (you say "go") | 1 evening | Phase 11 |

Runbooks 1 to 8 are what I need before I start coding everything. Runbooks 9 to 12 can wait until their phase, but doing them early means I never have to stop.

## Words used in these guides

- **Domain**: your website address, like `kksonline.com`.
- **DNS**: the list that tells the internet where your domain points.
- **API key / token**: a long password a program uses to log in.
- **`.env` file**: a text file on your computer that holds secrets. It is never uploaded to GitHub.
- **Dashboard**: the website where you manage an account (Cloudflare, Neon, and so on).
