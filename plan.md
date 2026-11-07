# KKS Online Admin Dashboard: Rebuild Plan

**Status:** v7 · **built and tested locally on 2026-11-07; re-verified the same day after the folder move** (see section 14, and 14.5 for the latest check) · **Date:** 2026-11-06 · **Owner:** OmgItsAmmer

This plan replaces the Flutter `OMGx` admin app with a web-only React admin limited to running the KKS Online store. It also moves the store off Supabase to a **near-$0 stack**: Neon (Postgres), Cloudflare R2 (images and backups), Cloudflare's free CDN in front of everything, and a small built-in admin sign-in (fixed accounts, no email service). Each phase ends with exit criteria that must hold before the next phase starts.

**Design target:** about **1,000 registered users** with **50–100 active at the same time**, smooth and production-grade, for roughly **$2/month plus the domain** (see 4.6–4.12). The architecture diagrams are in [diagram.md](diagram.md).

---

## 0. Before we start: what I need from you

Everything in this section is something only you can do: accounts, billing, DNS, secrets and decisions. When the checklist in 0.4 is green, I can work through the phases from start to finish without stopping for setup.

### 0.1 How to hand over secrets

- **Never paste a secret into chat, a commit or a PR.**
- Put local values in `kksonline-backend-express/.env` (confirm it is gitignored before you add anything).
- CI values go in **GitHub → Settings → Secrets and variables → Actions**.
- Deployed values go in the hosting dashboard's environment settings.
- In Phase 1 I will add every variable below to `kksonline-backend-express/.env.example` and write `npm run preflight`. It prints ✅/❌ per item and never prints a value. Run it after you finish the checklist.

### 0.2 Checklist

| # | What to do | Give me (variable / where) | Needed by |
|---|---|---|---|
| 1 | **Neon account** (free plan). Create a project named `kks-online`. **Done:** the project exists in Singapore (confirmed, same as Fly `sin`) on **Postgres 18**, with the default branch `production`, linked to this repo with `neon init` (it writes `.env.local`). I'll create the `dev` branch myself through the Neon tool. Supabase runs 15.8; the versions don't have to match. Copy the **pooled** and the **direct** connection string for each branch. In the compute settings, set the size to **0.25 CU fixed** (autoscaling off). Also create a Neon **API key** (used only to read monthly compute usage for the warning in 4.9). | `DATABASE_URL` (pooled), `DATABASE_URL_UNPOOLED` (direct), once for `dev` and once for `main` · `NEON_API_KEY` · local `.env` | Phase 1 |
| 1b | *Shortcut for #1:* this session has a Neon tool connected. If you say "use the Neon tool", I can create the project, branches and connection strings myself, after you confirm which Neon account it is connected to. | A yes/no, plus the region | Phase 1 |
| 2 | **Cloudflare account** (free). Add your domain to Cloudflare (change nameservers at your registrar). Before switching nameservers, check that Cloudflare imported every existing DNS record (storefront, email, and so on), because the live store depends on them. This is needed for the R2 public image domain, Cloudflare Pages, and the free edge cache in front of the API (4.8). Also create a Cloudflare API token with **Zone → Cache Purge** and **Zone → Cache Rules: Edit** permissions for that domain only. | Confirmation that the domain shows "Active" in Cloudflare · `CLOUDFLARE_ZONE_ID`, `CLOUDFLARE_API_TOKEN` | Phase 1 |
| 3 | **Cloudflare R2** (free: 10 GB). Enable R2 (Cloudflare may ask for a payment method; you are not charged within the free allowance). Create two buckets: `kks-public` (attach custom domain `cdn.<yourdomain>`) and `kks-private` (no public access; used for payment receipts and database backups). Create an R2 API token with *Object Read & Write*, limited to those two buckets. | `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_PUBLIC_BUCKET=kks-public`, `R2_PRIVATE_BUCKET=kks-private`, `ASSET_BASE_URL=https://cdn.<yourdomain>` | Phase 1 |
| 4 | **OpenAI**: create a project-scoped API key and set a **monthly budget limit** (for example $5) in the OpenAI dashboard. | `OPENAI_API_KEY` | Phase 6 |
| 5 | **Email: skipped for now** (decided 2026-11-07). No Resend, no invites, no password-reset emails. | Nothing | ✅ Dropped |
| 6 | **Admin sign-in (fixed accounts).** Run `npm run admin:hash` in the backend folder, type the password you want, and it prints a bcrypt hash. Put the account in `.env` as `ADMIN_ACCOUNTS` (format in `.env.example`). The password is never stored in the code or in git. Share the **email/role list** in chat if you want more than one account. | `ADMIN_ACCOUNTS`, `ADMIN_SESSION_SECRET` in `.env` | Phase 3 |
| 7 | **Domains and hosting.** Confirm the names: `admin.<domain>`, `api.<domain>`, `cdn.<domain>`. They must share one parent domain, because admin login uses cookies (see 5.1). The repo has both `fly.toml` (Singapore, `sin`) and `render.yaml`: tell me which one is live, and give me the ability to set its env vars (for Fly, a logged-in `flyctl` on this machine is enough). The admin app, and later the storefront, go on **Cloudflare Pages** (free, allows commercial use; connect it to the GitHub repo). | The three hostnames, the live API host, and Cloudflare Pages connected to the repo | Phase 2 |
| 8 | **Current Supabase (read access for migration only).** A connection string for the current database (read-only role preferred) and its size. Run `select pg_size_pretty(pg_database_size(current_database()));` in the Supabase SQL editor and also check the Storage size in the dashboard. Keep the existing `SUPABASE_*` variables in the backend `.env` until cutover (Phase 11). | `SUPABASE_DATABASE_URL`, plus the two sizes in chat | Phase 2 |
| 9 | **GitHub**: confirm the repo, enable Actions, and add these Actions secrets: `NEON_BACKUP_DATABASE_URL` (read-only role; I'll create it), `R2_BACKUP_ACCESS_KEY_ID`, `R2_BACKUP_SECRET_ACCESS_KEY`, `JOBS_SECRET` (any long random string). | Secrets added in GitHub | Phase 2 |
| 10 | **Customer mobile app: there is none** (you confirmed). Gate G1 is closed and Supabase can be removed completely. | Nothing more | ✅ Answered |
| 11 | **Permission to work**: OK for me to create feature branches and commit per phase (you merge the PRs)? OK to run restores and migrations against the Neon `dev` branch? **Production changes (Phase 11) happen only after your explicit go.** | A yes/no | Phase 1 |

### 0.2a Status and runbooks

Every step that only you can do has a plain-language runbook in [runbooks/](runbooks/README.md). Steps I can do myself (creating the Neon `dev` branch, the database roles, Fly settings through `flyctl`, code) have no runbook.

| # | Item | Status | Runbook |
|---|---|---|---|
| 1 | Neon | ✅ Project, Postgres 18, `production` branch, both connections work (preflight 2026-11-07, 32 tables). Open: optional `NEON_API_KEY` (usage report). The old port 5432 block no longer shows up | [02-neon.md](runbooks/02-neon.md) |
| 2 | Cloudflare account, domain, API token | ✅ `kks-online.com` is active, token and zone ID work | [03-cloudflare-domain.md](runbooks/03-cloudflare-domain.md), [04-cloudflare-api-token.md](runbooks/04-cloudflare-api-token.md) |
| 3 | Cloudflare R2 | 🟡 Both buckets accept writes and deletes. **Open: connect `cdn.kks-online.com` to `kks-public`** (step 2 of the runbook) | [05-cloudflare-r2.md](runbooks/05-cloudflare-r2.md) |
| 4 | OpenAI | ⏳ Needed by Phase 6 | [07-openai.md](runbooks/07-openai.md) |
| 5 | ~~Resend (email)~~ | ✅ Dropped | none |
| 6 | Admin sign-in | ⏳ Still missing from `.env`: `ADMIN_ACCOUNTS`, `ADMIN_SESSION_SECRET` (also `JOBS_SECRET`). One command, then three lines | [10-admin-accounts.md](runbooks/10-admin-accounts.md) |
| 7 | Hosting: Fly, Cloudflare Pages | ✅ Decided (Fly always on, Pages for both). ⏳ Setup | [06-cloudflare-pages.md](runbooks/06-cloudflare-pages.md), [09-fly-io.md](runbooks/09-fly-io.md) |
| 8 | Supabase read access, sizes, Phase 0 dashboard steps | 🟡 Read access works (preflight), sizes measured (24 MB DB, 39.9 MB images; G2 closed). **Open: the Phase 0 security steps A1 to A3 on the live Supabase project, done by you** | [11-supabase-steps.md](runbooks/11-supabase-steps.md) |
| 9 | GitHub secrets | ⏳ After #3 | [12-github-secrets.md](runbooks/12-github-secrets.md) |
| 10 | Mobile app | ✅ None | none |
| 11 | Permission to work | ✅ You told me to code all phases once setup is done | none |
| Phase 11 | Production go | Later | [13-production-cutover.md](runbooks/13-production-cutover.md) |

How to hand over secrets: [01-secrets.md](runbooks/01-secrets.md).

### 0.3 Decisions (defaults used if you don't say otherwise)

| Decision | Default |
|---|---|
| Neon region | **Singapore (`aws-ap-southeast-1`)**, the same region as the Fly API (`sin`). The database and API must be in the same region: every database round-trip across regions adds noticeable delay |
| API machine | **One Fly machine kept always on** (`min_machines_running = 1`), about **$2/month** (**confirmed**). It removes the API's 2–4 s cold start and keeps the in-memory cache warm. The $0 alternative is scale-to-zero, accepting that cold start (4.7) |
| Admin hosting | Cloudflare Pages (**confirmed**) |
| Storefront hosting | (**confirmed**) Move from Vercel to **Cloudflare Pages** in Phase 2 (static Vite build, free, commercial use allowed, same CDN as images) |
| Admin email (invites/resets) | **None.** Dropped on 2026-11-07 |
| Production cutover window | **A weeknight in your low-traffic period, about 6 PM to 9 AM** (low, not zero; I read "9 p.m." in your message as 9 AM, tell me if that's wrong). The exact night is chosen in Phase 11. About 30 min of storefront maintenance mode, with checkout paused so no order is lost mid-move |
| Existing images | They are mostly **PNG, sizes unknown**. Phase 1 measures the total. If it is ≤ 8 GB they are copied as they are (kept as PNG); if it's more they are converted to WebP during the copy (4.3). New uploads are always WebP |
| Image storage format | WebP, longest side 1600 px, plus 400 px thumbnails |
| Old Supabase project after cutover | Left idle and **allowed to pause on its own** (confirmed; nothing for you to do). The full dumps in R2 are the real backup. Deleted after 90 days |

### 0.4 Gates and "ready" check

I stop and report back, instead of pushing on, if any of these happens:

| Gate | Trigger | Why | Recommended fix | Status |
|---|---|---|---|---|
| **G1** | The mobile app uses Supabase directly | Leaving Supabase would break it | (none needed) | ✅ **Closed**: there is no mobile app |
| **G2** | Database over ~350 MB or image storage over ~8 GB (after the table clean-up) | Neon's free plan holds 0.5 GB and R2's free plan holds 10 GB | Database: restore only the "Keep" tables (Phase 2 triage), which usually shrinks it a lot. Images: convert the PNGs to WebP during the copy (4.3), which typically cuts them by 60–80%. Only if it still doesn't fit do I come back to you with the upgrade cost | ✅ **Closed 2026-11-07**: database 24 MB, images 39.9 MB, copy as they are |
| **G3** | The dump uses Supabase-only extensions, functions or triggers that Neon doesn't support | Neon can't run them | Standard replacements: `pg_cron` → GitHub Actions cron (4.5); `pg_net` and edge functions → backend endpoints; `auth.users` and `auth.uid()` → the fixed admin accounts and backend checks; Row Level Security policies → dropped, because the Express API is the only client and connects as `app_rw` (the policies matter only for direct Supabase access, which no one will have); ERP-only functions and triggers → dropped with the ERP tables. I list every one in `docs/db-triage.md` and stop only if something doesn't fit these rules | 🟡 Inspected 2026-11-07, all listed in `docs/db-triage.md`. Found `pg_net`/`http` use and 7 edge functions. **One question for you: is `jazzcash-webhook` still used for real payments?** |
| **G4** | The Prisma schema and the real database disagree in ways that could lose data (a column type, a missing column, a changed default) | Baselining a wrong schema would silently damage data | Treat the **live database as the truth**: run `prisma db pull` into a scratch file and diff it against `schema.prisma`. Differences in ERP tables are ignored (they're removed anyway). Anything else is fixed by a written SQL migration, rehearsed on `dev` with row counts before and after. `prisma db push` is never used on production | 🟡 Data checked against the live database (`docs/db-triage.md`): 12 order lines point at deleted variants (copied as is), 44 image rows have no file. Nothing blocks the copy. The dry run of the copy script is still to do |

A **gate** is a point where I stop coding and ask you, because the answer could cost data or money. I never go past a gate without a reply.

**Ready** means `npm run preflight` shows ✅ for items 1 to 3 and 7 to 9 (the rest are checked when their phase starts). From then on I only stop at the gates, at the Phase 11 production go/no-go, and before anything destructive.

---

## 1. Context and decisions

### 1.1 Current state

| Part | Path | Stack | Notes |
|---|---|---|---|
| Storefront | `react-frontend/` | React 18 + Vite + TS, React Router 7, TanStack Query | Talks only to the Express API. |
| Backend | `kksonline-backend-express/` | Express + Prisma 5 + Postgres (Supabase), Supabase Storage | There is no mobile app (confirmed). |
| Admin (legacy) | `OMGx/` (own git repo, branch `version_2`) | Flutter + GetX + `supabase_flutter` | ~78k lines. Writes directly to ~28 Supabase tables with the anon key, plus 3 edge functions. About 45% is POS/ERP code. |

### 1.2 Decisions already made

1. **The ERP/POS is a separate product** with its own Supabase project. It shares nothing with this store, so this database can change freely.
2. **The admin is web-only.** Flutter admin is retired. No desktop or mobile admin builds.
3. **Restocking stays, vendors go.** Restocking is a lightweight *stock receipt* flow with a free-text supplier name.
4. **AI product descriptions use OpenAI `gpt-4o-mini`**, called only from the backend. Gemini is removed.
5. **The admin talks only to the Express API.** It never talks to the database or object storage directly.
6. **Supabase is removed entirely.** Database → **Neon free plan** (dev and production), images → **Cloudflare R2 free plan**, admin login → **fixed admin accounts checked by the Express API** (decided 2026-11-07; no Better Auth, no Resend, no 2FA for now). Stay on $0 as long as the limits in 4.1 allow, then move Neon to the Launch plan.
7. **The old admin keeps working until cutover.** OMGx writes straight to the Supabase database, so production stays on Supabase until the new admin covers the daily workflow (Phase 11). Until then, the new work runs on a Neon `dev` branch with a sanitized copy of production data.

### 1.3 Recommended stack

**Admin frontend** (`admin-frontend/`, a new package next to `react-frontend/`)
- React 18 + Vite + TypeScript (strict), the same toolchain as the storefront
- React Router 7, TanStack Query (server state), TanStack Table (data grids)
- shadcn/ui (Radix + Tailwind), lucide icons, sonner toasts
- react-hook-form + zod for forms, Recharts for charts
- A simple login page and session handling (cookie set by the API)
- `decimal.js` for display maths on money (never JS floats for money)

**Backend:** the existing Express + Prisma app, with a new `src/modules/admin/*` layer, **fixed-account admin sign-in** (bcrypt + signed session cookie), `@aws-sdk/client-s3` pointed at R2, `sharp` for images, and the `openai` SDK.

**Shared contracts:** a new `packages/contracts` package with zod schemas and inferred types, used by both the backend and the admin. The root `package.json` becomes an npm workspace.

**Why not Next.js:** the admin sits behind a login, needs no SEO or server rendering, and a backend already exists. Next.js would add a second server runtime and tempt logic into server actions, which would create two backends again.

---

## 2. Scope

### 2.1 In scope (features to build)

| Area | Features |
|---|---|
| **Auth and access** | Login with fixed admin accounts (from environment settings), signed session cookie, roles (owner / manager / staff) kept in the permission map, idle timeout, rate-limited login, audit log. Later upgrade path: Better Auth with 2FA (not built) |
| **Dashboard** | Order counts by status, low-stock list, recent orders (early); revenue, average order value, top products and a date-range picker (Phase 12) |
| **Orders** | List with filters (status, date, payment method, customer, search); detail view (items, customer, shipping address + map link, payment receipt, history); status changes through a defined state machine; edit order (pending/confirmed only); record payments; cancel with automatic restock; printable A4 invoice/packing slip (PDF); WhatsApp link to the customer |
| **Products** | List with filters (category, brand, visibility, stock state, tag); create/edit; variants (SKU, sell price, cost, stock, alert level, visibility); images (upload, reorder, featured, delete); bulk visibility/category/brand/delete; AI description |
| **Catalog** | Categories, brands, collections (CRUD, images, featured flags, collection items) |
| **Inventory** | Stock overview per variant; **stock receipts** (draft → received, which adds stock and updates cost); **manual adjustments** with a required reason; **movement history** (every stock change, with who and why); low-stock alerts |
| **Customers** | List and search; detail with orders, addresses, lifetime value, reviews. Read-mostly: no admin-created customers in v1 |
| **Reviews** | List, filter by product/rating, hide or delete |
| **Reports** (Phase 12) | Sales by day/week/month, by product/category/brand, gross profit (cost snapshot from order items), stock valuation, CSV export |
| **Settings** | Shop config (tax, shipping price, free-shipping threshold, max item quantity, advance-payment receipt flag), admin users and roles, app versions (for the mobile app) |
| **Notifications** | In-app notification panel: new orders, low stock, failed jobs. Marking read |

### 2.2 Removed (dropped from the admin, archived in the database)

| Removed | OMGx code removed | DB objects affected |
|---|---|---|
| POS sales screen and admin checkout | `views/sales`, `controllers/sales`, `admin-secure-checkout` edge fn | (logic only) |
| Purchase-sales screen | `views/purchase_sales`, `controllers/purchase_sales` | (logic only) |
| Installments, guarantors, refunds | `views/installments`, `controllers/installments`, `controllers/guarantors`, `check_due_payments` edge fn, installment SQL reports | `installment_plans`, `installment_payments`, `guarantors`, `refunds`, `notifications.installment_plan_id` |
| Salesman and commission | `views/salesman`, `controllers/salesman` | `salesman`, `orders.salesman_id`, `orders.salesman_comission`, `addresses.salesman_id`, `order_addresses.salesman_id` |
| Vendors | `views/vendor`, `controllers/vendor` | `vendors`, `purchases.vendor_id`, `addresses.vendor_id`, `order_addresses.vendor_id` |
| Account book | `views/account_book`, `controllers/account_book` | `account_book`, enums `EntityType`, `TransactionType` |
| Expenses | `views/expenses`, `controllers/expenses` | `expenses` |
| Thermal printing, window manager, fullscreen | `flutter_thermal_printer`, `window_manager` | (none) |
| Admin self-signup with a shared admin key | `views/signup`, `repositories/signup`, `utils/setup/check_admin_key.dart` | `extras` (`AdminKey`) |
| Gemini | `services/gemini_service.dart`, key dialog | (none) |
| Kiosk cart | (unused by the store) | `kiosk_cart` (safe: there is no mobile app) |
| POS reports | P&L, installment, salesman reports | the matching SQL functions |
| Supabase | `supabase-image.service.ts`, `supabase.config.ts`, 3 edge functions, Supabase Auth | the whole Supabase project, after the 90-day hold |

**Archive, don't drop.** The ERP/POS tables are not restored into Neon at all (see the Phase 2 table triage). They live on as a full `pg_dump` file in R2 and in the old Supabase project for 90 days. If they are ever needed in the live database, they can be restored into an `archive` schema. Old wording, still true for any table that does get moved: removed tables go to an `archive` schema after a full `pg_dump`. They're dropped for good only after 90 days with no problems. Because Neon's free plan holds only 0.5 GB, the archive schema is **not** carried into Neon unless it fits: otherwise the dump file in R2 (`kks-private`) is the archive (see G2).

### 2.3 Deferred (not in v1, see open questions)

- Admin-created ("phone/WhatsApp") orders
- Product discounts and coupons (the `product_discounts` and `invoice_coupons` tables exist, but the storefront doesn't use them)
- Customer push or email notifications triggered from the admin
- Multi-currency and multi-store

---

## 3. Target architecture

The full set of diagrams (system overview, caching layers, search, checkout, login, state machine, data model, deployment, cutover) is in [diagram.md](diagram.md). Summary:

```
┌────────────────────┐     ┌──────────────────────┐     ┌──────────────────────┐
│  react-frontend    │     │  admin-frontend      │     │   (no mobile app)    │
│ (Cloudflare Pages) │     │  (Cloudflare Pages)  │     │   web only for now   │
└─────────┬──────────┘     └──────────┬───────────┘     └──────────┬───────────┘
          │ customer JWT              │ session cookie             │ customer JWT
          │ (backend-issued)          │ (admin session)            │
          ▼                           ▼                            ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ Cloudflare edge (free): TLS, DDoS protection, cache for public catalog GETs  │
│   (60 s fresh + serve stale), never caches cart/orders/auth/admin            │
└──────────────────────────────────────┬───────────────────────────────────────┘
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ Fly.io, Singapore: 1 always-on machine, in-memory cache with single-flight   │
│ Express API  /api/v1                                                         │
│   public + customer routes (existing)                                        │
│   /admin/auth/*  → fixed-account login, session cookie                       │
│   /admin/*  → requireAdmin(role) → zod validate → service → Prisma $txn      │
│                                    └→ audit log    └→ inventory ledger       │
│   /admin/ai/* → OpenAI gpt-4o-mini (server-side key)                         │
│   /internal/jobs/* → secret-protected, called by GitHub Actions cron         │
└──────────────┬──────────────────────────────┬───────────────────────────────┘
               ▼                              ▼
     Neon Postgres (free, Singapore)  Cloudflare R2 (free)
     fixed 0.25 CU, sleeps when idle  kks-public  → cdn.<domain> (images, 1-year cache)
     main = production, dev branch    kks-private → receipts, DB backups
     runtime role: app_rw (no DDL)
```

**Principles**

1. **One write path.** Every change goes through the backend. No client writes to tables or buckets.
2. **Stock changes only in transactions.** Every stock change happens in one Prisma `$transaction` that locks the variant rows (`SELECT ... FOR UPDATE`) and writes an `inventory_movements` row.
3. **Server-enforced authorization.** Roles are checked in middleware and services. The UI hiding a button is not security.
4. **Decimal money.** Postgres `numeric` stays exact end to end. The API sends money as strings (`"1499.00"`).
5. **Archive before destroy.** Schema changes follow *expand → migrate → contract*.
6. **Free-tier friendly.** Nothing depends on a paid feature or a hidden cost. The only paid item is the ~$2/month always-on API machine, and that is optional.
7. **The database is the expensive part, so it is touched last.** Every read that can be answered from the browser, the CDN or the API's memory never reaches Postgres (4.8). This makes the app fast and keeps the free database asleep for longer.

---

## 4. Infrastructure, performance and cost

### 4.1 Limits and when to upgrade

Free-plan numbers are from third-party summaries and may have changed; confirm them on each provider's pricing page during Phase 1.

| Service | Free allowance (approx.) | Watch for | Move up when |
|---|---|---|---|
| **Neon** (Postgres) | 0.5 GB storage, ~100 compute-hours/month, compute sleeps after ~5 min idle | Slow first request after idle; very short point-in-time restore window; storage growth from `inventory_movements`, `admin_audit_log`, notifications. **Compute-hours are the limit most likely to run out** (budget in 4.9) | Storage over ~400 MB, compute-hours on track for more than ~85/month, cold starts hurt customers, or you need longer restore history → **Neon Launch** (usage-based, roughly $10 to $20/mo at this store's size) |
| **Cloudflare R2** | 10 GB storage, 1M writes + 10M reads per month, free downloads | No hard spending cap: going over the free allowance bills automatically | Storage over ~8 GB. At that point re-compress images first; paid storage is cheap (~$0.015/GB/mo) |
| **Admin sign-in (built in)** | Free; no third party | A shared fixed password is weaker than per-person accounts with 2FA. Mitigations in 5.1 | Upgrade to Better Auth later |
| **Cloudflare Pages** (admin) | Free, commercial use allowed | Build minutes | n/a |
| **GitHub Actions** (backups, cron) | Free minutes are plenty for small jobs | Scheduled jobs can run late | n/a |
| **Cloudflare CDN** (free plan) | TLS, DDoS protection, caching, a limited number of cache rules | Never cache personal responses (4.8) | n/a |
| **API host** (Fly, `sin`) | Not free: ~$2/mo for one always-on `shared-cpu-1x` 256 MB machine (check Fly's pricing) | With `min_machines_running = 0` (today's setting) the machine stops when idle: 2–4 s cold start and an empty cache on every wake | Memory above ~80% → 512 MB machine. More than one machine only if CPU stays above ~70% (unlikely at this scale) |

A **usage report** (database size, R2 bucket sizes, estimated compute-hours where available) is shown on the admin Settings page (owner only) and printed by `npm run preflight`, so you see limits approaching before they bite.

### 4.2 Neon setup and rules

- One project, branches `production` (the default, already created) and `dev`. The dev branch holds a **sanitized** copy of production data (names, phones, CNICs, emails and addresses masked), kept small to leave room in the shared free allowance. If the free allowance gets tight, create a second free Neon project for dev.
- **Connection strings:** the app uses the **pooled** URL (`DATABASE_URL`, with `pgbouncer=true`, a small `connection_limit`, and `connect_timeout=15` to tolerate a cold start). Prisma migrations use the **direct** URL (`DATABASE_URL_UNPOOLED`). In `schema.prisma`: `url = env("DATABASE_URL")`, `directUrl = env("DATABASE_URL_UNPOOLED")`. `sslmode=require` everywhere.
- **Compute size:** fixed at **0.25 CU with autoscaling off**, so compute-hours are predictable (budget in 4.9). Same region as the API (Singapore).
- **Cold-start handling:** a small Prisma wrapper retries a query up to 3 times, 1 s apart, on connection errors (`P1001`, `P1002`, `P1008`, `P1017`), so a sleeping database delays a request instead of failing it.
- **Roles:** the owner role is used only for migrations. The API runs as `app_rw` (SELECT/INSERT/UPDATE/DELETE on `public`, no DDL). Backups use a read-only `backup_ro` role.
- **No public data API:** Neon exposes nothing except the connection string, so the Supabase-style Row Level Security lockdown is not needed. Don't enable Neon's optional Data API.
- **Retention:** `admin_audit_log` and `notifications` older than 12 months, and `inventory_movements` older than 24 months, are exported to a CSV in `kks-private` and deleted by a monthly job, to keep the database under the free limit.

### 4.3 R2 setup and rules

- `kks-public` is served at `https://cdn.<domain>` (Cloudflare custom domain, with caching). The `r2.dev` address is not used for production.
- `kks-private` has no public access. Payment receipts are shown via short-lived signed URLs from the API. Database backups live under `backups/`.
- **Upload pipeline** (`sharp`): check file type by content, strip metadata, convert to WebP, longest side 1600 px at quality ~80, plus a 400 px thumbnail, random file names. This keeps 10 GB comfortably roomy. Because file names are random and never reused, images are served with `Cache-Control: public, max-age=31536000, immutable`, so browsers and the CDN download each image only once.
- **Existing PNGs.** Most current images are PNG of unknown size. Phase 1 measures the total. At ≤ 8 GB they're copied unchanged and served with the same long cache header; above that they are converted to WebP (same pipeline) during the copy, which usually cuts 60–80% off.
- **Stored as keys, not URLs.** The `images` table already stores bucket (`folderType`) + `filename`, and the API builds URLs at request time (`getSupabasePublicUrl`). The R2 key is simply `<folderType>/<filename>`, so no new column is needed. One helper, `assetUrl(key)`, builds URLs from `ASSET_BASE_URL`, so switching CDN host later is a one-line change. Any full Supabase URLs stored elsewhere (for example a collection's `image_url`) are found and rewritten at cutover.
- Supabase's on-the-fly image resizing is not available on R2. The storefront code that handles `supabase.co/storage/...` URLs (for example [ProductCard.tsx](react-frontend/src/components/ProductCard.tsx), [HeroSection.tsx](react-frontend/src/components/HeroSection.tsx)) is checked in Phase 2 and switched to the pre-generated thumbnail sizes.

### 4.4 Backups

- **Nightly `pg_dump`** via GitHub Actions (`backup_ro` role), compressed and encrypted, uploaded to `kks-private/backups/`. 30 daily + 12 monthly kept.
- Neon's free-plan restore window is short, so these backups are the real safety net.
- **Restore test:** a documented restore into a throwaway Neon branch, done once in Phase 10 and then every quarter.

### 4.5 Scheduled jobs (without an always-on server)

Free API hosts sleep, so jobs don't run inside the API process. Instead GitHub Actions calls protected endpoints (`POST /internal/jobs/<name>`, header `X-Jobs-Secret`):
- **Release expired checkout reservations** every 10 min. The checkout code also releases expired reservations for the variants it is about to check, so nothing depends on cron timing.
- **Retention export/cleanup**, monthly.
- **Backups**, nightly (runs directly in Actions).
- **Usage check**, daily: database size, compute-hours used this month (from the Neon API), R2 bucket size. Posts a notification in the admin when any is on track to pass 80% of its free limit.

Jobs that need the database are grouped into **one** daily run where possible, because every wake of the database costs at least ~5 minutes of compute.

### 4.6 Load model: what "1,000 users, 50–100 at once" means

| Measure | Estimate | Basis |
|---|---|---|
| Registered users | ~1,000 | Given |
| Active at the same time (peak) | 50–100 | Given |
| Page views per active user | ~1 every 20 s | Typical browsing |
| API calls per page view | ~3, many answered from the browser's own cache | Storefront uses TanStack Query with 5–10 min caching |
| **Peak requests reaching Cloudflare** | **~15 per second** (100 × 3 ÷ 20) | Worst case |
| Typical requests | 2–5 per second | |
| Requests reaching the API (after edge cache, ~80% hit) | ~3–5 per second at peak | |
| Requests reaching Postgres (after in-memory cache) | ~1–2 per second at peak | Mostly cart, orders, account and cache misses |
| Orders | tens to a few hundred per day | |

**What this means:** the load is small. One small Node process serves hundreds of cached responses per second, and Neon's smallest compute (0.25 CU) handles hundreds of simple indexed queries per second. That is about **10× headroom** over the peak above.

So the real risks to smoothness are **not** raw capacity. They are:
1. **Cold starts**: the database and API waking up from sleep.
2. **Slow queries**: unindexed search, missing indexes, sequential lookups.
3. **Free-tier limits**: running out of Neon compute-hours mid-month.
4. **Misconfigured protection**: a rate limiter that treats every visitor as the same IP (4.11).

Every technique in 4.7–4.12 targets one of these four.

### 4.7 Cold starts

| Layer | Today | Plan | Result |
|---|---|---|---|
| **API (Fly)** | `min_machines_running = 0`, `auto_stop_machines = 'stop'`: the machine stops when idle | `min_machines_running = 1` (one machine, always on, ~$2/mo) | No API cold start; the in-memory cache stays warm |
| **Health check** | Fly calls `/api/v1/health` every 30 s, and it runs `SELECT 1` on the database | Split it: `/health` (process alive, **no database**) for Fly and uptime monitors; `/health/db` (checks the database) only for deploy checks and the preflight | Today's check would **stop Neon from ever sleeping** while the API runs, burning the whole compute budget in ~2 weeks |
| **Database (Neon)** | (Supabase today) | Sleeps after ~5 min idle; wakes on the next query in roughly a second. `connect_timeout=15` plus the retry wrapper (4.2) make the wake a delay, not an error | First request after idle: slower, never failing |
| **Catalog reads during a DB wake** | n/a | Served from the edge cache or in-memory cache (4.8), including stale copies while the database wakes | Browsing stays instant even when the database is asleep |
| **Runtime** | Docker image uses Node 18, which reached end of life in April 2025 | Node 22 LTS | Security patches; faster startup |

### 4.8 Caching layers

The goal: a visitor browsing the catalog should almost never cause a database query.

| Layer | What it caches | How long | Invalidation |
|---|---|---|---|
| **L0 Browser** | API responses in TanStack Query (already in place: 5–10 min `staleTime`); images and JS/CSS files | Images and built assets: 1 year (`immutable`, file names are unique). API data: 5–10 min | New file names on change; queries refetch after `staleTime` |
| **L1 Cloudflare edge** (free) | Public catalog GETs: `/products*`, `/categories*`, `/brands*`, `/collections*`, `/shop/config`, search and suggestions. The API sends `Cache-Control: public, s-maxage=60, stale-while-revalidate=600, stale-if-error=86400`, and a Cloudflare Cache Rule makes those paths cacheable | Fresh 60 s, then served stale for up to 10 min while one request refreshes it; served stale for up to a day if the API is down | Short lifetime makes staleness at most ~60 s. On admin catalog changes the API also asks Cloudflare to purge the affected URLs (`CLOUDFLARE_API_TOKEN`) |
| **L2 API memory** (`node-cache`, already used, 30 min) | The same catalog data, plus search results (60 s) | 30 min catalog, 60 s search | Admin writes already call `deleteByPattern`. This works because there is **one** API machine; if a second is ever added, switch catalog lifetimes to 60 s |
| **L2 additions** | **Single-flight**: when 50 requests miss the same key at once (for example right after a deploy), only one database query runs and the rest wait for it. **Stale-on-error**: if the database is slow or waking, return the last good value | n/a | n/a |
| **L3 Postgres** | Indexes (4.10), Neon's built-in connection pooler | n/a | n/a |

**Never cached at the edge:** anything with an `Authorization` header or a cookie, and every path under `/cart`, `/orders`, `/customers`, `/addresses`, `/wishlist`, `/auth`, `/admin`, `/admin-auth`, `/internal`. The Cache Rule matches only the public paths above, and the API sets `Cache-Control: private, no-store` on everything else.

**Check before enabling the edge cache:** `extractCustomerId` runs on every request. Phase 2 confirms that public catalog responses are identical for every visitor (for example, no per-customer "in wishlist" flag). If any differ, those fields move to a separate personal request.

**Stale stock is safe.** A product page may show stock up to ~60 s old, but checkout always re-checks stock and prices against the database inside a transaction (`validateCartSecurity`, then `applyStockChanges`). A stale page can never cause an oversell.

### 4.9 Neon compute budget

Neon free gives ~100 compute-hours per month. The compute size is fixed at the minimum (**0.25 CU, autoscaling off**), which is plenty for this load, so:

> 100 CU-hours ÷ 0.25 CU = **~400 hours awake per month ≈ 13 hours a day**

The database is awake whenever a query arrived in the last ~5 minutes. Estimates:

| Scenario | Database awake | CU-hours/month | Free? |
|---|---|---|---|
| Quiet store, catalog fully cached | ~6 h/day | ~45 | ✅ |
| Moderate: steady orders and carts during the day | ~10 h/day | ~75 | ✅ |
| Busy: activity from morning to after midnight | ~16 h/day | ~120 | ❌ → Launch, roughly $10–20/mo |

**What keeps it in the free range:**
- The health-check split (4.7). Without it the database never sleeps.
- The edge and in-memory caches (4.8), so browsing doesn't wake it.
- Jobs grouped into one daily run (4.5).
- No uptime monitor calling `/health/db`.
- The daily usage check (4.5) warns at 80% of the monthly budget, so the move to Launch is a planned decision rather than an outage.

**Further savings if needed (not planned now):** carts and wishlists are the most frequent database writes. They could be kept in the browser and synced only at login or checkout. This changes behaviour for the mobile app too, so it is listed as an option, not a task.

### 4.10 Search design

Product search today uses a case-insensitive "contains" match (`name ILIKE '%…%'`), which reads the whole products table on every search. Results aren't cached (only suggestions are).

**Plan:**
1. Enable Postgres's **`pg_trgm`** extension (supported on Neon; checked by the preflight) and add **trigram GIN indexes** on `lower(name)` for products, plus SKU on variants, and brand and category names. `ILIKE '%term%'` then uses the index instead of reading every row.
2. **Ranking and typo tolerance:** results are ordered by `word_similarity` against the search term, and a typo like "samsng" still finds "Samsung". One parameterised SQL query (`$queryRaw` with bound parameters, so no injection risk).
3. **Search in brand, category and SKU too**, not just the product name.
4. **Caching:** results cached for 60 s in memory and at the edge, keyed by the normalised query plus filters. Suggestions cached for 10 min (already).
5. **Client:** 300 ms debounce (already in `MainHeader.tsx`), minimum 2 characters, cancel in-flight requests when the user keeps typing (TanStack Query abort signal), keep previous results visible while loading.
6. **Admin search** (customers by name, phone or email; orders by number or phone) uses the same trigram indexes on `customers` and an exact index on `orders.order_id`. 1,000 customers is tiny, so this is instant.
7. **When to outgrow it:** more than ~50,000 products, or a need for facets and synonyms. Then a self-hosted Meilisearch or Typesense. Not needed now.

**Bug fixed along the way:** price filtering and sorting use `products.sale_price`, which is stored as **text**, so "999" sorts above "1500" and price-range filters return wrong results. New `min_price` and `max_price` **numeric** columns on `products` (kept up to date by `recalcProductAggregates`, see 6.4) are used for filtering and sorting, with an index on `(isVisible, min_price)`. The old text columns stay for compatibility.

**Indexes added** (in addition to those in 6.1): trigram indexes above; `products(isVisible, created_at)`, `products(isVisible, ispopular)`, `image_entity(entity_category, entity_id)`, `cart(customer_id)`, `wishlist(customer_id)`, `reviews(product_id)`, `addresses(customer_id)`, `collection_items(collection_id)`. Each is checked with `EXPLAIN` on the dev copy.

### 4.11 Reliability: "no production issues"

| Concern | Today | Plan |
|---|---|---|
| **Rate limiting behind a proxy** | `express-rate-limit` keyed by `req.ip` with `trust proxy = 1` | Behind Cloudflare **and** Fly, `req.ip` can become Cloudflare's address, so every shopper would share one limit and get blocked together. The client IP is taken from `Fly-Client-IP` / `CF-Connecting-IP`, trusted only when the request really came through those proxies. A test confirms two different client IPs get separate limits |
| **Edge protection** | None | Cloudflare proxy on `api.<domain>`: free DDoS protection, plus one free Cloudflare rate-limiting rule for login and checkout paths |
| **Timeouts** | None set | `statement_timeout = 10s` on the `app_rw` role; 15 s request timeout in Express; 20 s for AI calls |
| **Database briefly unavailable** | Requests fail | Retry wrapper (4.2), stale-on-error caches (4.8), and the storefront shows a friendly "please retry" message instead of a blank page |
| **Double-submitted orders** | Idempotency key on checkout (already) | Kept, plus idempotency on the admin actions listed in 5.3 |
| **Deploys** | n/a | Fly rolling deploy with the `/health` check; Prisma migrations run as a separate release step before the new code starts, and are always additive (expand → contract), so old and new code both work during a deploy |
| **Graceful shutdown** | Partial | On SIGTERM: stop accepting requests, finish in-flight ones (up to 10 s), close the database connection |
| **Memory** | 256 MB machine | Watched via Fly metrics; alert above 80%; move to 512 MB if needed |

### 4.12 Performance targets and monitoring

**Targets** (measured from Pakistan):

| Request | Target (p95) |
|---|---|
| Catalog page data served from the edge | < 100 ms |
| Catalog data from the API, database awake | < 300 ms |
| Search | < 400 ms |
| Add to cart | < 500 ms |
| Checkout | < 1.5 s |
| First request after the database slept | < 3 s (never an error) |
| Error rate | < 0.5% of requests |
| Monthly availability | 99.5% (realistic for this stack) |

**Frontend speed** (storefront and admin):
- Product lists use the 400 px thumbnails, `loading="lazy"`, and fixed width/height so the page doesn't jump while images load.
- Routes are split into separate JS bundles (`React.lazy`), with a budget of < 200 KB gzipped for the first load.
- Hovering a product card prefetches its details, so opening it feels instant.

**Monitoring (all free tiers):**
- **Errors:** Sentry on the API, storefront and admin, with personal data masked.
- **Uptime:** an external monitor (UptimeRobot or Better Stack free plan) calls `/health` every 5 min. It never calls `/health/db`, so it doesn't wake the database.
- **Metrics:** Fly's built-in dashboard (CPU, memory, response times), plus an `X-Response-Time` header and a slow-request log for anything over 1 s.
- **Usage:** the daily usage check (4.5) and the Settings → Usage page.

**Load test before cutover** (Phase 10): a **k6** script (free, open source) runs against staging with **100 virtual users for 15 minutes**: 70% browsing, 20% searching, 8% cart actions, 2% checkouts. It passes only if the targets above hold and no request is rate-limited by mistake.

### 4.13 Monthly cost summary

| Item | Cost |
|---|---|
| Neon Postgres (free plan) | $0 (→ roughly $10–20 if the busy scenario in 4.9 is reached) |
| Cloudflare R2 (free, 10 GB) | $0 |
| Cloudflare CDN, DNS, Pages (storefront + admin) | $0 |
| Fly.io API, one always-on machine | ~$2 (or $0 with cold starts) |
| GitHub Actions (CI, backups, jobs) | $0 |
| Sentry, uptime monitor (free plans) | $0 |
| OpenAI `gpt-4o-mini` | Pay per use: a fraction of a cent per description |
| Domain | ~$10–15 per year |
| **Total** | **~$2/month + domain** |

---

## 5. Security design

### 5.1 Admin authentication (fixed accounts, no third party)

Decision of 2026-11-07: no Better Auth, no Resend, no 2FA for now. Admins sign in with **fixed accounts** that live in the server's environment, not in the database and not in the code.

- **Where the accounts live:** one environment variable, `ADMIN_ACCOUNTS`, a JSON list such as `[{"email":"owner@kks","name":"Owner","role":"owner","passwordHash":"$2b$12$..."}]`. Passwords are stored only as **bcrypt hashes** (`npm run admin:hash` makes one). Nothing secret is committed to git. To add, remove or change an account you edit the variable and restart the API. Roles are `owner`, `manager` or `staff`, so the permission map in 5.2 keeps working.
- **Sign-in:** `POST /api/v1/admin/auth/login` (email + password). On success the API sets a signed session cookie: an HTTP-only, `Secure`, `SameSite=Lax` JWT signed with `ADMIN_SESSION_SECRET` (a different value from the storefront `JWT_SECRET`), 12 h lifetime. The cookie holds only the account's email and role. `POST /admin/auth/logout` clears it. The admin app also logs out after 30 minutes of inactivity.
- **Brute-force protection:** a strict rate limit on the login route (5 attempts per 15 minutes per IP and per email), a constant-time password check, a generic error message, and a short artificial delay on failures.
- **CSRF:** `SameSite=Lax`, an `Origin` header allowlist check on every non-GET admin request, JSON-only bodies, CORS restricted to `ADMIN_ORIGIN` with credentials.
- **Backend check (`requireAdmin`):** read and verify the cookie → 401 if missing or invalid. Make sure the account still exists in `ADMIN_ACCOUNTS` (so removing an account locks it out at once; the session is valid only while the account exists and its role matches) → attach `req.admin = { email, role }` → check the role against the route's permission (5.2).
- **Customer and admin identity never overlap.** Customers keep Google sign-in and the backend-issued JWT; admins use this cookie. Each middleware ignores the other's credential.
- **Audit:** every admin write records the acting email in `admin_audit_log.actor_admin_id` (a string).
- **Honest trade-off:** a fixed shared password has no per-person history unless each person has their own account, and no second factor. That is acceptable for a small team; use one account per person, long passwords, and rotate by editing the variable. The upgrade path to Better Auth with 2FA is kept open: the `requireAdmin` interface stays the same.

### 5.2 Roles and permissions

| Permission | owner | manager | staff |
|---|:-:|:-:|:-:|
| View dashboard (revenue) | ✅ | ✅ | ❌ (order counts only) |
| View cost / profit / buy price | ✅ | ✅ | ❌ (stripped from responses) |
| Orders: view, change status (non-cancel) | ✅ | ✅ | ✅ |
| Orders: cancel, edit items, record payment | ✅ | ✅ | ❌ |
| Products/catalog: create, edit, delete, bulk ops | ✅ | ✅ | ❌ |
| Inventory: create/receive stock receipts | ✅ | ✅ | ✅ |
| Inventory: manual adjustments | ✅ | ✅ | ❌ |
| Customers, reviews: view | ✅ | ✅ | ✅ |
| Reviews: hide/delete | ✅ | ✅ | ❌ |
| Reports and CSV export | ✅ | ✅ | ❌ |
| AI descriptions | ✅ | ✅ | ❌ |
| Shop settings, app versions, usage report | ✅ | ❌ | ❌ |
| Admin users and roles | ✅ | ❌ | ❌ |
| Audit log | ✅ | ❌ | ❌ |

Permissions live in one map in `packages/contracts/src/permissions.ts`, for example `orders.cancel: ['owner','manager']`. The backend middleware and the frontend's `<Can>` component both read that map.

### 5.3 Hardening checklist

**API**
- [ ] Every `/admin/*` route goes through `requireAdmin`. A test lists every registered admin route and checks it returns 401 without a session and 403 for an under-privileged role (see Phase 10).
- [ ] Remove the `X-Customer-Id` fallback from `customer.middleware.ts` (and update `cart.integration.test.ts` to use real tokens).
- [ ] Strict CORS allowlist: storefront origin plus admin origin, nothing else.
- [ ] Rate limits: AI endpoints 20/min and 300/day per admin; general admin routes 300/min per admin; `/internal/jobs/*` requires the secret and a constant-time comparison.
- [ ] zod validation on every body, query and param. Unknown keys are rejected (`.strict()`).
- [ ] Pagination: `pageSize` capped at 100. Sort fields allowlisted.
- [ ] Optimistic concurrency on orders, products, variants and receipts: the client sends `updatedAt`, and a mismatch returns **409**.
- [ ] `Idempotency-Key` header on stock-receipt receive, order cancel and payment recording.
- [ ] Uploads: 10 MB limit, type checked by content (not the client's MIME type), re-encoded with `sharp` (strips EXIF, neutralises malicious files), random file names.
- [ ] Errors: no stack traces or Prisma messages reach clients in production. A request ID is returned for support.
- [ ] Logs: no tokens, passwords or full addresses/phone numbers (masked).

**Database and storage**
- [ ] API runs as `app_rw` (no DDL). Backups use `backup_ro`. The owner connection string is used only by migrations and never deployed with the API.
- [ ] Neon Data API stays off. `sslmode=require`.
- [ ] R2 API tokens scoped to the two buckets. The backup token can only write under `backups/`.
- [ ] `kks-private` has no public access. Receipts viewed through signed URLs expiring in ≤ 5 min.
- [ ] After cutover, the Supabase project is deleted (after the 90-day hold) and any keys it issued are dead, so no key rotation is needed.
- [ ] Drop the `extras` table (shared admin key).

**Admin frontend**
- [ ] Strict Content Security Policy via Cloudflare Pages `_headers`: `default-src 'self'`; `connect-src` the API only; `img-src` self + `cdn.<domain>` + `data:`; `frame-ancestors 'none'`.
- [ ] Only public values in `VITE_*` env vars (API URL, CDN URL). No keys at all in the admin bundle.
- [ ] No `dangerouslySetInnerHTML`. Product descriptions are rendered as text or sanitised markdown.
- [ ] `X-Robots-Tag: noindex` on the admin domain.

**Audit**
- [ ] `admin_audit_log` row for every change: actor, action, entity, entity ID, before/after diff (JSON), IP, user agent, request ID. Written in the same transaction as the change.

---

## 6. Database changes

### 6.0 Groundwork: Prisma migration history

There's currently no migration history in `prisma/migrations` (only `create_enums.sql`). Before any change, using the Neon `dev` branch loaded from a sanitized dump:

1. `prisma db pull` into a scratch schema to capture tables Prisma doesn't model yet: `collections`, `collection_items`, `collection_cart`, `refunds`, plus triggers and functions.
2. Merge those into `schema.prisma` (collections become first-class Prisma models, replacing the `$queryRaw` calls in `collection.repository.ts` over time).
3. Create a baseline migration `0_baseline` with `prisma migrate diff --from-empty --to-schema-datamodel` and mark it applied with `prisma migrate resolve --applied 0_baseline`.
4. List all DB functions, triggers and extensions (`notify_low_stock`, `product_variant_stock_trigger`, admin checkout functions, installment and P&L reports) and record which stay. Anything depending on Supabase-only features (`auth.*`, `pg_net`, `pg_cron`, realtime) is rewritten or dropped (gate G3).
5. From now on, all changes go through `prisma migrate dev` / `prisma migrate deploy`. No more `db push` in shared environments.

### 6.1 Expand (additive, safe while OMGx still runs)

Admin identities are the fixed accounts' emails (strings), so the audit and ledger columns refer to them as `actor_admin_id String`.

```prisma
// No admin user tables: admin accounts come from the ADMIN_ACCOUNTS environment variable (5.1).

enum AdminRole { owner manager staff }

enum MovementReason {
  initial           // opening balance during migration
  order_placed      // checkout
  order_cancelled   // restock on cancel
  order_edited      // qty change on admin edit
  stock_receipt     // receiving a stock receipt
  receipt_reversed  // cancelling an already-received receipt
  adjustment        // manual correction (damage, count, loss, found)
}

model InventoryMovement {
  movement_id    BigInt         @id @default(autoincrement())
  variant_id     Int
  quantity_delta Int            // +in / -out
  stock_after    Int
  reason         MovementReason
  reference_type String?        // 'order' | 'stock_receipt' | 'adjustment'
  reference_id   String?
  unit_cost      Decimal?       @db.Decimal
  note           String?
  actor_admin_id String?        // null = system/customer checkout
  created_at     DateTime       @default(now()) @db.Timestamptz()
  @@index([variant_id, created_at])
  @@index([reference_type, reference_id])
  @@map("inventory_movements")
}

enum ReceiptStatus { draft received cancelled }

// Reuse the purchases tables, reshaped into "stock receipts"
model Purchase {
  purchase_id    BigInt        @id @default(autoincrement())
  reference      String?       // supplier invoice no. / free text
  supplier_name  String?       // free text, replaces vendor_id
  purchase_date  DateTime      @db.Date
  receipt_status ReceiptStatus @default(draft)
  notes          String?
  shipping_fee   Decimal       @default(0) @db.Decimal
  other_costs    Decimal       @default(0) @db.Decimal
  sub_total      Decimal       @default(0) @db.Decimal
  created_by     String?       // admin user id
  received_by    String?
  received_at    DateTime?     @db.Timestamptz()
  updated_at     DateTime      @updatedAt @db.Timestamptz()
  // legacy columns (vendor_id, address_id, status, paid_amount, discount, tax, user_id) kept until contract phase
}

model PurchaseItem {
  // variant_id becomes NOT NULL after backfill; unit cost lives in "price"
}

model OrderStatusHistory {
  id             BigInt      @id @default(autoincrement())
  order_id       Int
  from_status    OrderStatus?
  to_status      OrderStatus
  note           String?
  actor_admin_id String?
  created_at     DateTime    @default(now()) @db.Timestamptz()
  @@index([order_id])
  @@map("order_status_history")
}

model OrderPayment {               // replaces ad-hoc edits to orders.paid_amount
  payment_id     BigInt   @id @default(autoincrement())
  order_id       Int
  amount         Decimal  @db.Decimal
  method         PaymentMethod
  reference      String?
  received_at    DateTime @db.Timestamptz()
  actor_admin_id String?
  created_at     DateTime @default(now()) @db.Timestamptz()
  @@map("order_payments")
}

model AdminAuditLog {
  id             BigInt   @id @default(autoincrement())
  actor_admin_id String
  action         String   // e.g. 'product.update', 'order.cancel'
  entity_type    String
  entity_id      String
  changes        Json?
  ip_address     String?  @db.Inet
  user_agent     String?
  request_id     String?
  created_at     DateTime @default(now()) @db.Timestamptz()
  @@index([entity_type, entity_id])
  @@index([actor_admin_id, created_at])
  @@map("admin_audit_log")
}
```

Also in this step:
- `products.min_price` and `products.max_price` as **numeric** columns (see 4.10), plus the `pg_trgm` extension and the search indexes listed there.
- `orders.updated_at` and `orders.cancelled_at`, plus `product_variants.updated_at` maintenance (`@updatedAt`), for optimistic concurrency.
- An `is_hidden` flag on `reviews` if moderation should hide rather than delete (Q8).
- Indexes: `orders(status, order_date)`, `orders(customer_id)`, `order_items(order_id)`, `product_variants(product_id)`, `products(category_id)`, `products(brandID)`.

### 6.2 Migrate (backfill)

- Nothing to seed: admin accounts come from `ADMIN_ACCOUNTS` (5.1).
- Opening balance: insert one `inventory_movements` row per variant with reason `initial` and `stock_after = current stock`, so the ledger starts out matching reality.
- Backfill `purchases.receipt_status` from the legacy `status` (`received` → `received`, `cancelled` → `cancelled`, everything else → `draft`). Copy vendor names into `supplier_name` before vendors are archived.
- Backfill `purchase_items.variant_id` where null (map single-variant products). List anything that can't be mapped for manual fixing.
- Backfill `order_payments` with one row per order where `paid_amount > 0` (method = the order's `payment_method`).
- Backfill `products.min_price` / `max_price` from visible variants.

### 6.3 Contract (only after OMGx is retired, Phase 11)

- Archive (dump file in R2, and the `archive` schema if it fits the free storage limit): `salesman`, `guarantors`, `installment_plans`, `installment_payments`, `refunds`, `account_book`, `expenses`, `vendors`, `extras`, `kiosk_cart`.
- Drop columns: `orders.salesman_id`, `orders.salesman_comission`, `orders.saletype`; `addresses.vendor_id/salesman_id`; `order_addresses.vendor_id/salesman_id`; `notifications.installment_plan_id`; `purchases.vendor_id/address_id/status/paid_amount/discount/tax`.
- Drop enums `EntityType` and `TransactionType`, and the ERP-only SQL functions.
- Make `purchase_items.variant_id` NOT NULL.
- Remove `vendors` and `salesman` from the backend's storage config and image service.

### 6.4 Type and data-quality fixes (coordinate with the storefront)

These touch fields the storefront reads, so each needs a check of every consumer:

| Issue | Fix |
|---|---|
| `products.base_price`, `sale_price` are `String` (price filters and sorting are wrong today, see 4.10) | Turn into derived fields: the backend computes them from visible variants (min/max) whenever a variant changes, and the API keeps returning the same shape. Filtering and sorting switch to the new numeric `min_price`/`max_price` columns. Change the text columns' type only once all consumers are confirmed. |
| `products.price_range` and `stock_quantity` duplicate variant data | Keep them as denormalised caches, updated in the same transaction as variant changes, in one helper `recalcProductAggregates(productId)` (which also maintains `min_price`/`max_price`). Remove the old DB trigger if it does the same job, so it isn't done twice. |
| `products.category_id @default(11)`, `brandID @default(20)` | Remove the hidden defaults. Category and brand become required fields in the admin form. |
| `variants.alert_stock` is `BigInt`, `products.alert_stock` is `Int` | Standardise on `Int` on the variant. The product-level alert level becomes a default for new variants. |
| `OrderStatus` has 7 values but OMGx used 5 | The admin uses all 7, with the state machine in 7.5. |
| OMGx `PaymentMethods` enum (paypal, razorPay, …) | The admin uses the DB enum only: `cod`, `credit_card`, `bank_transfer`, `pickup`, `jazzcash`. |

---

## 7. Backend: admin API

### 7.1 Code layout

```
kksonline-backend-express/src/
  config/           database.config.ts (Neon + retry), storage.config.ts (R2), admin-accounts.ts (fixed accounts)
  modules/admin/
    _shared/        requireAdmin.ts, can.ts, audit.ts, concurrency.ts, idempotency.ts, serializers.ts
    auth/           login, logout, GET /me
    users/          list, role change, deactivate
    products/       routes.ts · service.ts · product-aggregates.ts · *.test.ts
    variants/
    images/         upload pipeline (sharp → R2), reorder, delete
    categories/  brands/  collections/
    orders/         routes.ts · service.ts · state-machine.ts · invoice-pdf.ts
    inventory/      receipts.service.ts · adjustments.service.ts · movements.service.ts · stock.ts
    customers/  reviews/
    dashboard/  reports/
    settings/       shop config, app versions, usage report
    notifications/
    ai/             openai.client.ts · description.service.ts · prompts.ts
    audit/
  internal/jobs/    reservation sweep, retention (secret-protected)
  routes/admin/index.ts   → becomes a thin mounter of modules/admin/*
```

- Delete `routes/admin/product.admin.routes.ts`: it isn't mounted anywhere (dead code).
- Replace `supabase-image.service.ts` and `supabase.config.ts` with one `storage.service.ts` (R2). Remove the unused Cloudinary config too, after checking nothing imports it.
- `middleware/http-cache.ts`: sets `Cache-Control` per route (public catalog vs `private, no-store`), see 4.8. `utils/cache.ts` gains single-flight and stale-on-error. `services/cdn-purge.service.ts` purges Cloudflare URLs after admin catalog changes.
- `middleware/client-ip.ts`: derives the real client IP for rate limiting (4.11).
- Services own the business rules and transactions. Routes only parse, authorize and serialize.
- `serializers.ts` converts snake_case DB rows to camelCase API objects and removes cost fields for the `staff` role.

### 7.2 API conventions

- Base path `/api/v1/admin`, JSON, camelCase.
- List responses use the existing `sendPaginated` envelope. Query: `page`, `pageSize` (≤100), `sort` (allowlisted, e.g. `-createdAt`), `q`, and filters.
- Money is a string decimal. Dates are ISO-8601 UTC. IDs are numbers, except BigInt IDs, which are strings.
- Errors: `{ success: false, error: { code, message, details?, requestId } }`. Codes: `VALIDATION`, `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `INSUFFICIENT_STOCK`, `INVALID_TRANSITION`, `RATE_LIMITED`.
- Updates send `updatedAt` from the last read, and a stale value returns 409 `CONFLICT`.

### 7.3 Endpoint catalogue

**Auth** (fixed accounts, 5.1)
| Method | Path | Role |
|---|---|---|
| POST | `/auth/login` | public (rate limited) |
| POST | `/auth/logout` | any admin |
| GET | `/auth/me` | any admin |

**Products, variants, images**
| Method | Path | Role |
|---|---|---|
| GET | `/products` (filters: q, categoryId, brandId, visible, stock=`in|low|out`, tag) | any |
| GET | `/products/:id` (includes variants, images, aggregates) | any |
| POST | `/products` | manager+ |
| PUT | `/products/:id` | manager+ |
| DELETE | `/products/:id` (soft delete if the product has orders: hide and archive) | manager+ |
| POST | `/products/bulk` (`{ ids, action: hide|show|setCategory|setBrand|delete }`) | manager+ |
| POST/PUT/DELETE | `/products/:id/variants[/:variantId]` | manager+ (stock is **not** editable here, only through inventory) |
| POST | `/products/:id/images` (multipart) | manager+ |
| PATCH | `/products/:id/images/order` (`[imageEntityId]`) | manager+ |
| PATCH | `/images/:id/featured` · DELETE `/images/:id` | manager+ |

**Catalog**: CRUD plus an image endpoint for `/categories`, `/brands` and `/collections`, and `/collections/:id/items` (add/remove/reorder products). All manager+ for writes.

**Orders**
| Method | Path | Role |
|---|---|---|
| GET | `/orders` (status, from, to, paymentMethod, customerId, q = id/name/phone) | any |
| GET | `/orders/:id` (items, customer, address, payments, status history, receipt signed URL) | any |
| POST | `/orders/:id/transition` `{ to, note, updatedAt }` | staff for forward moves; manager+ for `cancelled` |
| PUT | `/orders/:id/items` `{ items[], updatedAt }` (pending/confirmed only) | manager+ |
| POST | `/orders/:id/payments` | manager+ |
| GET | `/orders/:id/invoice.pdf` | any |
| GET | `/orders/statistics` | any (revenue hidden for staff) |

**Inventory**
| Method | Path | Role |
|---|---|---|
| GET | `/inventory/stock` (variant list: stock, alert, cost, value; filter low/out) | any (cost hidden for staff) |
| GET | `/inventory/movements` (variantId, reason, from, to) | any |
| GET/POST | `/inventory/receipts` | staff+ |
| GET/PUT/DELETE | `/inventory/receipts/:id` (draft only for PUT/DELETE) | staff+ |
| POST | `/inventory/receipts/:id/receive` (Idempotency-Key) | staff+ |
| POST | `/inventory/receipts/:id/cancel` (if received: reversal, fails if stock would go negative) | manager+ |
| POST | `/inventory/adjustments` `{ variantId, delta, reason, note }` | manager+ |

**Customers**: `GET /customers`, `GET /customers/:id` (orders, addresses, LTV, reviews).
**Reviews**: `GET /reviews`, `DELETE /reviews/:id`, `PATCH /reviews/:id` (`isHidden`).
**Dashboard**: `GET /dashboard/overview` (order counts by status, low stock, recent orders; Phase 9). Later (Phase 12): `GET /dashboard/summary?from&to`, `/dashboard/sales-series?from&to&interval=day|week|month`, `/dashboard/top-products`.
**Reports** (Phase 12): `GET /reports/sales`, `/reports/products`, `/reports/profit`, `/reports/stock-valuation`. Each takes `?format=csv`.
**Settings**: `GET/PUT /settings/shop`, `GET/POST/PATCH /settings/app-versions`, `GET /settings/usage` (owner).
**Notifications**: `GET /notifications`, `POST /notifications/read` (`ids` or `all`), `GET /notifications/latest` (cheap check).

No realtime service is used (not Neon's, not Supabase's, no WebSockets). The admin checks `GET /notifications/latest` every 30 s, only while the tab is visible, and pauses after 15 minutes without mouse or keyboard activity. That endpoint answers from an in-memory "latest notification id" on the API (updated by the checkout and stock services, and loaded from the database once at startup), so polling never wakes Neon. The admin fetches the full list only when the id changes. Edits made by two staff at the same time are caught by the `updatedAt` 409 check, not by live updates.
**AI**: `POST /ai/product-description`.
**Audit**: `GET /audit-log` (owner).
**Internal (secret header, not admin-session)**: `POST /internal/jobs/release-reservations`, `POST /internal/jobs/retention`.

### 7.4 Inventory rules (the most important correctness area)

All stock changes go through one function:

```ts
// modules/admin/inventory/stock.ts
async function applyStockChanges(
  tx: Prisma.TransactionClient,
  changes: { variantId: number; delta: number; unitCost?: Decimal }[],
  ctx: { reason: MovementReason; referenceType?: string; referenceId?: string;
         actorAdminId?: string; note?: string; allowNegative?: false }
): Promise<void>
```

1. Sort changes by `variantId` (consistent lock order prevents deadlocks).
2. `SELECT variant_id, stock, buy_price FROM product_variants WHERE variant_id = ANY($1) FOR UPDATE`.
3. For each change: `newStock = stock + delta`. If `newStock < 0`, throw `INSUFFICIENT_STOCK`.
4. For `stock_receipt`, set the new cost by **weighted average** (decision Q5): `newCost = (stock*oldCost + qty*unitCost) / (stock + qty)`. If `stock <= 0`, use `unitCost`.
5. Update the variant, insert an `inventory_movements` row, call `recalcProductAggregates` for each affected product, and fire the low-stock notification if the new stock crossed below the alert level.

**Callers:**
- Receive a stock receipt (positive deltas).
- Cancel an order (positive deltas from `order_items`).
- Edit order items (difference between old and new quantities).
- Manual adjustment.
- **Storefront checkout:** `checkout.service.ts` `reserveInventory` is refactored to use the same function (reason `order_placed`), so customer orders show up in the ledger too. Today its reserve and rollback loops are separate per-item updates, and the rollback isn't transactional, so moving them into one transaction also fixes that.

### 7.5 Order state machine

Proposed transitions (confirm meanings in Q7):

```
pending ──► confirmed ──► processing ──► ready ──► delivered ──► completed
   │            │             │            │
   └────────────┴─────────────┴────────────┴──► cancelled   (restock all items)
ready ──► completed   (pickup orders: skip delivered)
```

- `completed` and `cancelled` are final. Un-cancelling isn't allowed; create a new order instead. This removes OMGx's fragile re-decrement logic.
- Every transition writes `order_status_history` and the audit log in the same transaction.
- `cancelled` calls `applyStockChanges` with `reason: order_cancelled` and sets `cancelled_at`.
- Editing items is allowed only in `pending`/`confirmed`. The new subtotal is recalculated on the server, and the cost snapshot (`total_buy_price`) is taken from the current variant cost.
- `paid_amount` is derived as the sum of `order_payments` and kept as a cached column on `orders`.

### 7.6 AI product descriptions (OpenAI gpt-4o-mini)

- **Env:** `OPENAI_API_KEY`, `OPENAI_MODEL=gpt-4o-mini` (configurable), `AI_DAILY_LIMIT_PER_ADMIN=300`. Set a monthly budget cap in the OpenAI dashboard as a second guard.
- **Endpoint:** `POST /admin/ai/product-description`
  ```json
  // request
  { "productId": 42,                       // optional: backend loads name/category/brand/variants
    "name": "…", "category": "…", "brand": "…",
    "keyFeatures": ["…"], "variants": ["…"],
    "tone": "professional|friendly|premium", "length": "short|medium|long",
    "language": "en" }
  // response
  { "description": "…", "highlights": ["…","…","…"], "model": "gpt-4o-mini",
    "usage": { "inputTokens": 0, "outputTokens": 0 } }
  ```
- **Implementation:** official `openai` Node SDK with structured outputs (JSON schema matching the response). 20 s timeout, 1 retry on 5xx/timeout, `max_output_tokens` around 600.
- **Prompt:** a fixed system prompt (store voice, no made-up specs, no prices, no medical/safety claims, plain text or markdown matching what the storefront renders; Q9). Product facts go in as data fields, never as part of the instructions.
- **Draft only:** the result fills the editor for the admin to review and change. It's never saved automatically.
- **Controls:** per-admin rate limit and daily cap. Each call is logged to the audit log with token counts. Errors return a friendly message, and the editor keeps working without AI.
- **Cleanup:** delete the OMGx Gemini code. No AI keys ever reach the browser.

---

## 8. Admin frontend

### 8.1 Code layout

```
admin-frontend/
  src/
    app/            router.tsx, providers.tsx (QueryClient, Auth, Theme), layouts/
    lib/            api-client.ts, auth.ts (session helpers), money.ts, dates.ts, permissions.ts, query-keys.ts
    components/
      ui/           shadcn components
      data-table/   DataTable (TanStack Table + URL-synced filters/sort/pagination), column helpers
      forms/        MoneyInput, ImageUploader, SearchSelect, DateRangePicker, ConfirmDialog
      layout/       Sidebar, Topbar, CommandPalette (cmdk), NotificationsDrawer, Can
    features/
      auth/ dashboard/ orders/ products/ catalog/ inventory/ customers/ reviews/
      reports/ settings/ users/ notifications/ audit/
        └─ each: api.ts (typed calls + zod parse), hooks.ts (useQuery/useMutation), components/, pages/
  e2e/              Playwright specs
  public/_headers   security headers (CSP etc.)   public/_redirects   SPA fallback
```

### 8.2 Screens

| Route | Screen | Key UX |
|---|---|---|
| `/login` | Auth | Clear errors, rate-limit message, no password reset (change the account in the server settings) |
| `/` | Home | Order counts by status, low stock, recent orders (full revenue dashboard in Phase 12) |
| `/orders` | Orders list | Status tabs with counts, filters in the URL, quick status change, unread highlight |
| `/orders/:id` | Order detail | Timeline (status history), items, totals, payments, customer card, address + map link, receipt viewer, actions bar with only valid transitions, print invoice, WhatsApp |
| `/products` | Products list | Thumbnail, price range, total stock with low/out badges, visibility toggle, bulk actions |
| `/products/new`, `/products/:id` | Product editor | Tabs: Details (with **Generate with AI**), Variants (inline grid), Images (drag to reorder, set featured), Visibility. Leave-page guard for unsaved changes |
| `/categories`, `/brands` | Catalog | Table + side-sheet editor, image upload |
| `/collections`, `/collections/new`, `/collections/:id` | Collections (bundles) | Card list with reorder and show/hide; editor with product picker, quantities, live bundle price, picture upload, main-banner and featured switches (14.6) |
| `/inventory` | Stock overview | Variant table: stock, alert, cost, value; filter low/out; "Adjust" action |
| `/inventory/receipts[/new\|/:id]` | Stock receipts | Line-item grid with variant search (SKU/name), qty, unit cost, totals; **Receive** with confirmation |
| `/inventory/movements` | Movement history | Filter by variant/reason/date; links to the source order/receipt |
| `/customers[/:id]` | Customers | Search by name/phone/email; detail with orders, LTV, addresses, reviews |
| `/reviews` | Reviews | Filter by rating/product, hide/delete |
| `/reports` | Reports | Report picker, date range, table + chart, CSV export (Phase 12) |
| `/settings/shop`, `/settings/app-versions`, `/settings/users`, `/settings/audit`, `/settings/usage` | Settings | Owner-only sections hidden for others |

### 8.3 UX standards (what OMGx lacked)

- Every list keeps its filters, sort and page in the URL, so links and the back button work.
- Optimistic UI only for simple toggles (visibility, mark read). Everything else waits for the server and shows a clear pending state.
- 409 conflicts show "This record was changed by someone else. Reload to see the latest" with a reload button.
- Destructive actions use a confirmation dialog that names the record. Bulk deletes require typing the count.
- Loading uses skeletons (no full-page spinners), and empty states say what to do next. Because the free-tier database can be slow on its first request after idle, pages show a "waking up the database" hint after 3 s instead of an error.
- Keyboard: `/` focuses search, `⌘K` opens the command palette (jump to order #, product, customer).
- Accessibility: Radix primitives, visible focus, labels on all inputs, colour contrast AA.
- Responsive: designed for 1280 px+ desktop, works on tablets, and order status changes are usable on a phone.
- Light and dark theme.
- Money is formatted as PKR with `Intl.NumberFormat` and calculated with `decimal.js`.

### 8.3a Look and feel: same as OMGx

The new admin keeps the previous admin's identity (taken from `OMGx/lib/utils/constants/colors.dart` and the theme files):

| Token | Value |
|---|---|
| Primary | `#4B68FF` (buttons, links, active menu) |
| Secondary | `#FFE24B` (highlights, badges) |
| Accent | `#B0C7FF` (soft backgrounds, focus rings) |
| Page background | `#F5F5F5` · cards white · soft grey `#F4F4F4` |
| Text | `#272727` primary · `#656565` secondary |
| Border | `#D9D9D9` |
| Status | error `#D32F2F` · success `#388E3C` · warning `#F57C00` · info `#1976D2` |
| Font | **Urbanist** (Google Fonts), title weight 600 |
| Shape | 10 px corner radius on buttons, inputs and cards; spacing steps 4 / 8 / 16 / 24 / 32 px |
| Dark mode | background is the primary colour at 10% over dark; follows the system setting, with a toggle |

### 8.4 Data and state rules

- Server state lives only in TanStack Query. There's no global store, except auth/session in context.
- Query keys come from one factory (`query-keys.ts`). Mutations invalidate exact keys (for example, cancelling an order invalidates `orders.detail(id)`, `orders.list`, `inventory.*` and `dashboard.*`).
- The API client checks responses against the shared zod schemas in development, which catches contract drift early.

---

## 9. Phased delivery

Sizes: **S** ≈ 1–3 days, **M** ≈ 1 week, **L** ≈ 2 weeks, for one developer.

### Phase 0: Emergency fixes on the live system (S), *do now*

**Status (2026-11-07):** code done on branch `feat/admin-rebuild` and as a stand-alone hotfix branch `hotfix/phase0-security` (deploy that one now). Still needs you: Supabase sign-ups off, key check ([runbooks/11](runbooks/11-supabase-steps.md)).

Independent of the rebuild. The live storefront is exposed today.

- [ ] Add auth to `/api/v1/admin`. Short-term: **unmount the router**, since OMGx doesn't use it. Phase 3 brings it back behind `requireAdmin`.
- [ ] Remove the `X-Customer-Id` header fallback in `customer.middleware.ts`. Update tests to use signed tokens.
- [ ] Disable public sign-ups in the Supabase Auth settings (OMGx's self-signup relied on a shared key in `extras`).
- [ ] Review Row Level Security on `extras`, `users` and all tables OMGx writes to. Make sure an ordinary authenticated *customer* can't write admin tables.
- [ ] Confirm no build of OMGx was ever shipped with `SUPABASE_SERVICE_KEY` in `.env`. If unsure, rotate it.
- [ ] Delete the unmounted `product.admin.routes.ts`.
- [ ] Remove Cloudinary completely (it is disabled and unused): `config/cloudinary.config.ts`, the `CLOUDINARY_*` entries in `env.config.ts`, the `cloudinary` npm package, and the comments in `image.service.ts`. Images use only Supabase now, then R2.
- [ ] Split the health check: `/health` (no database) for Fly and uptime monitors, `/health/db` (runs `SELECT 1`) for deploy checks (4.7).
- [ ] **Interim keep-alive (optional):** a GitHub Actions job that calls `/health/db` every 3 days, so the free Supabase project isn't paused before cutover. Removed in Phase 11. This is a stopgap; tell me if you'd rather not do it.
- [ ] Set Fly `min_machines_running = 1` (if you accept the ~$2/month, see 0.3).
- [x] Mobile app: none (answered), so gate G1 is closed and Supabase can be removed completely.

**Exit:** unauthenticated `curl` calls to any `/admin/*` route return 401/404, and a request with `X-Customer-Id` alone returns 401.

### Phase 1: Setup check (S), *starts when checklist 0.2 is filled in*

**Status:** done. `npm run preflight` exists and runs.

- [ ] `npm run preflight`: checks every variable from 0.2 is present, connects to Neon (both branches, pooled and direct), writes and deletes a test object in both R2 buckets, loads `cdn.<domain>`, calls OpenAI with a one-token request, and prints database and bucket sizes. Never prints secret values.
- [ ] Add all new variables to `.env.example`.
- [ ] Confirm gate G2 from real numbers (Supabase database size and Storage size, including the PNG total).
- [ ] Create the `app_rw` and `backup_ro` roles on Neon.

**Exit:** `npm run preflight` is green for items 1 to 3 and 7 to 9.

### Phase 2: Infrastructure on Neon `dev` and R2 (M)

**Status:** code done (R2 storage, image pipeline, Node 22, Fly always-on, edge-cache headers, jobs, backup workflow, migration scripts, Cloudflare Pages headers). Not yet possible without you: copy real data (needs Supabase access), Cloudflare proxy and cache rule on `api.`, Sentry key, moving the storefront to Pages.

> **Approach changed while building.** Neon starts empty and the new schema is applied from migrations, so the old "dump, restore, expand, contract" plan became simpler and safer: `scripts/migrate-from-supabase.mjs` copies the **Keep** tables table by table, copying only columns that exist in the new schema (so ERP columns drop away by themselves), keeps every id, resets the sequences, writes the opening-balance stock ledger, and marks finished orders as paid. It is a dry run by default, can be repeated for the dress rehearsal, and never touches Supabase. `scripts/migrate-images.mjs` does the same for pictures. The ERP/POS tables are archived with a plain `pg_dump` of those tables into R2. The Prisma history starts at `0_init`, which is the new schema (not a baseline of the old one).

Production stays on Supabase. Everything here is built and proven on the dev side.

- [ ] **Table triage (scope-creep clean-up).** The old Supabase schema also carries the ERP/POS tables, so nothing is migrated blindly. I list every table, view, function, trigger and enum in the Supabase `public` schema and classify each as **Keep** (used by the storefront or the new admin, judged from `schema.prisma`, the backend code and the admin plan), **Archive** (ERP/POS data: dumped to a file in R2, not restored into Neon) or **Drop** (unused). The result goes to `docs/db-triage.md` in the PR. I ask you only about a table I can't classify. Only **Keep** tables go into Neon, which also keeps us far below the 0.5 GB limit.
- [ ] Take a `pg_dump` of the public schema from Supabase (excluding Supabase-internal schemas such as `auth`, `storage`, `realtime` and `graphql`). Use the **Postgres 18 client tools** (`pg_dump`/`pg_restore` 18, matching Neon): a newer `pg_dump` can read an older server (15.8), but not the other way round. Restore with `--no-owner --no-acl`, since Supabase roles don't exist on Neon. Check extensions, functions and triggers against G3.
- [ ] Sanitize (mask personal data) and restore the **Keep** tables only into the Neon `dev` branch. The Archive tables stay in the R2 dump (2.2).
- [ ] Prisma changes for Neon: `directUrl`, pooled URL parameters, retry wrapper for cold starts (4.2). Prisma baseline (6.0).
- [ ] `storage.service.ts` for R2 with the `sharp` upload pipeline and `assetUrl(key)`. Replace `supabase-image.service.ts` and `supabase.config.ts`. The R2 key is `folderType/filename`, which is already stored, so no new column is needed.
- [ ] **Image migration script** (idempotent, resumable, dry-run by default): copy every image from Supabase Storage to `kks-public` under the same folder structure (re-encoded per 4.3 only for new uploads; existing files copied as they are unless over the size budget), build the old-URL → key map, (no database column is added). The size check from Phase 1 decides whether PNGs are copied as they are or converted to WebP (4.3; converted files get new names, applied at cutover together with the URL rewriting). URL rewriting in the database is done at cutover, not now.
- [ ] Update storefront image handling so it works with both old Supabase URLs and the new CDN URLs during the transition.
- [ ] Backup workflow (4.4) and jobs endpoints (4.5).
- [ ] Usage report command and the daily usage check (4.5, 4.9).

Performance and edge (4.7–4.12)
- [ ] Docker image to **Node 22 LTS**; graceful shutdown; request timeouts.
- [ ] Cloudflare proxy on `api.<domain>`, a Cache Rule for the public catalog paths, and one rate-limiting rule for login and checkout.
- [ ] `http-cache` middleware (`Cache-Control` per route), single-flight and stale-on-error in `utils/cache.ts`, Cloudflare purge after catalog writes.
- [ ] Audit that public catalog responses are identical for every visitor before turning on edge caching (4.8).
- [ ] Real client IP for rate limiting behind Cloudflare and Fly, with a test (4.11).
- [ ] Image `Cache-Control` set to 1 year `immutable` on R2 uploads.
- [ ] Sentry (free) on API and storefront, uptime monitor on `/health`, slow-request log.
- [ ] Move the storefront from Vercel to Cloudflare Pages (`_redirects` for SPA routing, security headers), keeping the old deployment until DNS is switched.

**Exit:** the storefront and the API run end to end against Neon `dev` and R2 on a staging deployment, with images loading from `cdn.<domain>`. Backup and restore work on a throwaway branch. A repeated catalog request shows `cf-cache-status: HIT`, and a request with a customer token is never cached. With no traffic for 10 minutes, Neon's dashboard shows the database suspended.

### Phase 3: Foundations (M)

**Status:** done (independent installs instead of npm workspaces; fixed-account sign-in instead of Better Auth).

Backend
- [ ] Turn the root `package.json` into npm workspaces: `kksonline-backend-express`, `react-frontend`, `admin-frontend`, `packages/contracts`.
- [ ] `packages/contracts`: zod schemas for shared shapes (pagination, money, error envelope, admin role, permissions map).
- [ ] Fixed-account admin auth: `ADMIN_ACCOUNTS` parser, bcrypt check, signed session cookie, login/logout/me, `npm run admin:hash`, login rate limit (5.1).
- [ ] `requireAdmin`, `can(permission)`, request IDs, audit helper, admin rate limiter, CORS allowlist, Origin check.
- [ ] Expand migration for the audit log (6.1).
- [ ] `GET /admin/me`.
- [ ] Rebuild `routes/admin/index.ts` as a module mounter. Port the existing admin endpoints into modules behind `requireAdmin`.
- [ ] Route-coverage authz test (started here, completed in Phase 10).

Frontend
- [ ] Scaffold `admin-frontend` (Vite, TS strict, Tailwind, shadcn, ESLint, Prettier, Vitest).
- [ ] Auth flow: login, session handling, idle logout.
- [ ] App shell: sidebar, topbar, `<Can>`, error boundary, 404, theme.
- [ ] Typed `api-client` with error mapping, request ID shown in error toasts.
- [ ] `DataTable` component with URL state.

DevOps
- [ ] GitHub Actions: backend (typecheck, lint, unit, integration with Docker Postgres) and admin (typecheck, lint, unit, build).
- [ ] Cloudflare Pages project for the admin (preview deploys per PR) with security headers.

**Exit:** an owner can log in on staging and see an empty shell. Every `/admin` route rejects missing or under-privileged sessions in CI.

### Phase 4: Database groundwork (M)

**Status:** done in the new schema (numeric prices, trigram search indexes, ledger, payments, audit log). Search ranking by similarity is not built (the indexes make the existing partial-name search fast).

- [ ] Expand migration (6.1): `inventory_movements`, receipt columns, `order_status_history`, `order_payments`, `updated_at` columns, indexes.
- [ ] Backfill scripts (6.2), each idempotent and run first on the Neon `dev` copy.
- [ ] Collections modelled in Prisma.
- [ ] `applyStockChanges` and `recalcProductAggregates` with unit and concurrency tests (parallel receive vs checkout on the same variant must never oversell or lose updates).
- [ ] Refactor storefront checkout `reserveInventory`/rollback to use `applyStockChanges`; expired reservations are released lazily at checkout time (4.5).
- [ ] Search and indexes (4.10): `pg_trgm`, trigram and supporting indexes, numeric `min_price`/`max_price` with backfill, the new ranked search query across name/brand/category/SKU, cached results. Storefront price filter and sort switched to the numeric columns.

**Exit:** the ledger opening balance matches current stock for 100% of variants. The storefront checkout regression tests pass. The concurrency test passes 100 runs. Searching a 5,000-product copy returns in under 50 ms at the database (`EXPLAIN ANALYZE` shows the index in use), and sorting by price returns products in true numeric order.

### Phase 5: Catalog (L)

**Status:** done (products, variants, images, categories, brands, bulk actions). **Collections (bundles) admin screens added 2026-11-07**, see 14.6.

- [ ] Backend: products, variants, images (R2, reorder, featured), categories, brands, collections, bulk actions, soft delete.
- [ ] Frontend: products list, product editor (details, variants grid, images), category/brand/collection screens.
- [ ] Variant stock is shown but read-only in the editor, with a link to "Adjust" or "Receive stock".
- [ ] Storefront check: changed products appear correctly on the storefront (price range, images, visibility).

**Exit:** full catalog management works on staging, and the storefront renders admin-created products correctly.

### Phase 6: AI descriptions (S)

**Status:** done; needs `OPENAI_API_KEY` to try it for real (the no-key case is tested).

- [ ] `ai` module: OpenAI client, prompt, structured output, rate limit, daily cap, usage logging.
- [ ] "Generate with AI" in the product editor: options popover (tone, length), preview, Insert or Replace, regenerate.
- [ ] Tests with a mocked OpenAI client (success, timeout, rate-limited, bad output).

**Exit:** an admin can generate, edit and save a description, and the OpenAI key never appears in any browser request.

### Phase 7: Orders (L)

**Status:** done (list, detail, state machine, payments, item edits, cancel with restock, printable invoice).

- [ ] Backend: list/detail, state machine with history, cancel with restock, edit items, payments, signed receipt URLs (R2 private bucket), invoice PDF (`pdfkit` or `@react-pdf/renderer` on the server), statistics.
- [ ] Notifications: a new order creates an admin notification (hook in the checkout service). In-memory latest id plus `GET /notifications/latest`, and polling only while the admin tab is visible and active (7, Notifications).
- [ ] Frontend: orders list (status tabs + counts), order detail (timeline, actions, payments, map link, WhatsApp, print).
- [ ] Tests: every allowed and forbidden transition; cancel restocks exactly once even if the request is retried (idempotency); a stale edit gets 409.

**Exit:** a staging order can go from placed to completed, and a cancelled order restores stock exactly once with ledger rows.

### Phase 8: Inventory (M)

**Status:** done (stock levels, ledger, adjustments, receipts with weighted-average cost).

- [ ] Backend: stock overview, receipts CRUD, receive (weighted-average cost), cancel/reverse, adjustments, movements query.
- [ ] Frontend: stock overview, receipt editor with variant search, receive confirmation, adjustment dialog (reason required), movement history with links.
- [ ] Low-stock notifications, plus a home-page tile.

**Exit:** receiving a 3-line receipt updates stock and cost correctly, the movement history explains every change to a variant's stock, and reversing a receipt works or is refused if the stock has already been sold.

### Phase 9: Customers, reviews, settings, home (M)

**Status:** done (customers, reviews with hide, shop settings, app versions, notifications bell, activity log, usage).

- [ ] Customers list/detail. Reviews list/hide/delete.
- [ ] Shop settings form (validated ranges), app versions management, notifications drawer, audit log viewer with filters, usage page.
- [ ] Home page: order counts by status, low stock, recent orders.

**Exit:** the owner can do every daily task that OMGx was used for (orders, products, stock, customers, settings) in the new admin, and a `staff` account sees only staff permissions in both the UI and the API.

### Phase 10: Hardening and QA (M)

**Status:** partly done: unit, integration and end-to-end smoke tests pass; k6 load script written (`loadtest/`), not run (needs a staging deployment). Playwright tests not written.

- [ ] Authz matrix test: every admin route × each role (plus no session) gives the expected 2xx/401/403. Fails CI if a new route isn't classified.
- [ ] Playwright end-to-end tests on staging: login, create product with variants and image, AI generate (mocked), receive stock, place a storefront order, process and cancel it, check stock.
- [ ] Load sanity check: orders list with 50k orders and products list with 5k variants respond in under 500 ms p95 on a warm database.
- [ ] **k6 load test** (4.12): 100 virtual users for 15 minutes with the realistic mix, against staging. All targets in 4.12 met, no false rate-limits, API memory under 80%.
- [ ] Cold-start behaviour checked: first request after the database slept succeeds in under 3 s (slow, not failing) on storefront and admin.
- [ ] Compute budget check: replay a typical day's traffic pattern on staging and confirm the projected CU-hours land in the "quiet" or "moderate" row of 4.9.
- [ ] Security pass: CSP verified, cookie flags verified, role separation of customer vs admin tokens, `npm audit` clean or exceptions noted, secrets scan of the git history, rate limits checked.
- [ ] Error monitoring on the API and admin (a free tier of Sentry or similar), with masking of personal data.
- [ ] Backup restore test done and documented.

**Exit:** all checks green, no open high-severity findings.

### Phase 11: Production cutover and retirement (M), *needs your explicit go*

**Status:** not started, by design: needs your explicit go. Scripts and runbook are ready.

Do this in a low-traffic window you choose. Until step 4, Supabase remains the production system and everything can be rolled back by doing nothing.

1. **Dress rehearsal:** repeat the whole procedure on a fresh Neon branch from a new production dump, with timings written down.
2. **Pre-sync images** to R2 again (only new files since Phase 2).
3. **Freeze:** announce the OMGx freeze, then put the storefront in maintenance mode (~30 min).
4. **Final copy** with `scripts/migrate-from-supabase.mjs --apply` into the empty Neon `production` database (the schema is already there from `npm run db:migrate`), then `scripts/migrate-images.mjs --apply` for new pictures, then run checks (row counts per table, sums of stock and order totals, a sample of images).
5. **Switch:** set production `DATABASE_URL`/`DATABASE_URL_UNPOOLED` and the R2 variables, deploy the API, deploy the admin, point `admin.<domain>`.
6. **Verify:** place a test order end to end, change its status in the admin, cancel it, check stock and images in the storefront. Then lift maintenance mode.
7. **Rollback rule:** within the first hour, if no real order has been placed on Neon, revert the variables to Supabase. After that, rolling back would lose Neon-side writes, so we fix forward instead.
8. **Retire:** remove the interim keep-alive job, delete the 3 Supabase edge functions, stop using OMGx, remove Supabase code and env vars from the backend, and archive the `OMGx` repo (read-only) with a pointer README.
9. **Contract migration (6.3):** archive the ERP tables (dump to R2), drop the dead columns.
10. **After 90 days without problems:** delete the Supabase project and old archives.

**Exit:** the store runs on Neon and R2, OMGx is unused, and nothing in the code or env references Supabase.

### Phase 12: Dashboard and reports (M)

**Status:** done (sales, products, stock valuation, orders CSV; dashboard).

- [ ] Revenue dashboard: KPI tiles, revenue chart, date-range picker, top products (SQL aggregates, indexed).
- [ ] Reports: sales, products, profit (from `order_items.total_buy_price`), stock valuation, CSV export (streamed).
- [ ] Profit numbers exclude cancelled orders. Document the definitions on the reports page.

**Exit:** dashboard totals match a manual SQL check for 3 date ranges.

### Summary timeline

| Phase | Size | Cumulative (1 dev) |
|---|---|---|
| 0 Emergency fixes | S | week 1 |
| 1 Setup check | S | week 1–2 |
| 2 Infrastructure + performance foundations (Neon dev, R2, Cloudflare edge) | L | week 4 |
| 3 Foundations + admin sign-in | M | week 5 |
| 4 Database groundwork + search | M | week 6 |
| 5 Catalog | L | week 8 |
| 6 AI descriptions | S | week 8–9 |
| 7 Orders | L | week 11 |
| 8 Inventory | M | week 12 |
| 9 Customers/Reviews/Settings/Home | M | week 13 |
| 10 Hardening + load test | M | week 14 |
| 11 Cutover | M | week 15 |
| 12 Dashboard and reports | M | week 16 |

Phases 3 to 9 are built against Neon `dev`. Production keeps running on Supabase with OMGx until Phase 11. Phase 4's expand-only migrations are applied to production at cutover, and not before.

---

## 10. OMGx to new admin parity map

| OMGx screen | New home | Notes |
|---|---|---|
| Dashboard | `/` (Home), full version in Phase 12 | Rebuilt around e-commerce numbers |
| Orders / Order detail | `/orders`, `/orders/:id` | + state machine, payments, history |
| Purchases / Purchase detail | `/inventory/receipts` | Vendors removed; free-text supplier |
| Products / Product detail / Variants | `/products/:id` | Stock editing moves to inventory |
| Brands, Categories, Collections | `/brands`, `/categories`, `/collections` | |
| Media | Inside the product/catalog editors | No standalone media library in v1 |
| Customers | `/customers` | Read-mostly |
| Reviews | `/reviews` | |
| Notifications | Drawer | |
| Store | `/settings/shop` | |
| Profile | User menu (who am I, sign out) | |
| Reports | `/reports` (Phase 12) | E-commerce reports only |
| Sales, Purchase-sales, Installments, Salesman, Vendors, Account book, Expenses, Signup | **removed** | |

---

## 11. Environment variables

**Backend**
```
# Database (Neon)
DATABASE_URL=...            # pooled, runtime (role app_rw)
DATABASE_URL_UNPOOLED=...    # direct, migrations only (Neon's own name for it)
# Object storage (Cloudflare R2)
R2_ACCOUNT_ID=...  R2_ACCESS_KEY_ID=...  R2_SECRET_ACCESS_KEY=...
R2_PUBLIC_BUCKET=kks-public   R2_PRIVATE_BUCKET=kks-private
ASSET_BASE_URL=https://cdn.<domain>
# Admin auth (fixed accounts, 5.1)
ADMIN_ACCOUNTS=[{"email":"...","name":"...","role":"owner","passwordHash":"..."}]
ADMIN_SESSION_SECRET=...    # long random; different from JWT_SECRET
ADMIN_ORIGIN=https://admin.<domain>
COOKIE_DOMAIN=.<domain>
# AI
OPENAI_API_KEY=...  OPENAI_MODEL=gpt-4o-mini  AI_DAILY_LIMIT_PER_ADMIN=300
# Jobs
JOBS_SECRET=...            # also a GitHub secret, together with API_URL and BACKUP_PASSPHRASE (runbook 12)
# Edge cache (Cloudflare)
CLOUDFLARE_ZONE_ID=...  CLOUDFLARE_API_TOKEN=...            # cache purge only
# Monitoring
SENTRY_DSN=...                                              # optional, free plan
NEON_API_KEY=...                                            # read-only, for the daily usage check
# Removed after cutover: SUPABASE_*. CLOUDINARY_* is removed in Phase 0 (unused)
```

**Admin frontend**
```
VITE_API_BASE_URL=https://api.<domain>/api/v1
VITE_ASSET_BASE_URL=https://cdn.<domain>
```
(No keys at all.)

---

## 12. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| ~~The customer mobile app reads Supabase directly~~ | | Closed: there is no mobile app |
| Neon free plan sleeps and has limited storage | Slow first request; limit exceeded | Retry wrapper, "waking up" hint in the UI, retention jobs, usage report, upgrade triggers (4.1) |
| Neon compute-hours run out mid-month | Database unavailable until the month resets | Fixed 0.25 CU, health-check split, edge and memory caching, daily usage check with an 80% warning, a planned switch to Launch (4.9) |
| API machine scaled to zero | 2–4 s cold start, empty cache | One always-on machine (~$2/mo), decision in 0.3 |
| Edge cache serves one customer's data to another | Privacy incident | Cache Rule only on public catalog paths, `private, no-store` everywhere else, audit before enabling, test that token-bearing requests are never cached (4.8) |
| Rate limiter sees the proxy's IP instead of the shopper's | Everyone blocked at once during busy periods | Real client IP middleware plus a test (4.11) |
| R2 has no hard spending cap | Surprise bill if storage passes 10 GB | WebP re-encoding, usage report, alert at 8 GB |
| Products' string prices and derived fields used by the storefront/app | Display regressions | Keep the API shape, recompute server-side, check each consumer (6.4) |
| OMGx still writes to Supabase until cutover | Dev data drifts from production | Dev is for building only; the final dump at cutover is the source of truth, and backfills are re-run then |
| Image URLs stored as full Supabase URLs | Broken images after cutover | Store keys, support both hosts during the transition, test the mobile app in Phase 11 |
| A shared fixed password (no 2FA) is weaker than per-person accounts | Account takeover | One account per person, bcrypt, rate-limited login, 12 h sessions, audit log, rotate by editing the variable; Better Auth + 2FA stays a later option |
| No migration history today | Risky schema changes | Baseline first (6.0). Run every migration on the dev copy first |
| Weighted-average cost wrong on legacy data | Profit reports off | Opening cost = current `buy_price`. Profit is reported from per-order cost snapshots, so history is unaffected |
| Solo developer bandwidth | Delays | Strict scope (2.3 deferred list), release phase by phase |

---

## 13. Open questions

| # | Question | Default if unanswered |
|---|---|---|
| Q1 | Do you need **admin-created orders** (phone/WhatsApp orders entered by staff)? OMGx had this through admin checkout. | Deferred to after v1 |
| Q2 | Does the **customer Flutter mobile app** read or write Supabase directly, or only through the Express API? (= checklist #10 / gate G1) | ✅ **Answered: there is no mobile app.** Supabase can be removed completely |
| Q3 | Should admins manage **product discounts and coupons**? (Tables exist; the storefront doesn't use them.) | Deferred, tables left untouched |
| Q4 | How many admin users, and are three roles (owner/manager/staff) right? | Three roles as in 5.2 |
| Q5 | Cost method on restock: **weighted average** (recommended) or **last purchase cost**? | Weighted average |
| Q6 | Is an **A4 invoice / packing slip PDF** enough, or do you still need thermal receipts? | A4 PDF only |
| Q7 | What do `confirmed`, `processing` and `ready` mean in your workflow (e.g. ready = packed for courier or pickup)? Should all 7 statuses stay? | State machine in 7.5 |
| Q8 | Reviews: delete only, or hide/unhide too? | Add `is_hidden`, support both |
| Q9 | Does the storefront render product descriptions as plain text, markdown or HTML? (Decides the AI output format.) | Plain text with line breaks |
| Q10 | Is there **historical POS/installment data** in this database you'll need to look up later? | Dumped to R2 and kept indefinitely; dropped from the live database at the contract step. ✅ **Answered in part:** the ERP data is scope creep; only the necessary store tables are kept (Phase 2 triage). The ERP tables are dumped to R2, not restored |
| Q11 | Email for admin invites/resets. | ✅ **Answered 2026-11-07: skip email.** Fixed admin accounts instead (5.1) |
| Q12 | Do admins need **email/WhatsApp alerts** for new orders and low stock, or is the in-app panel enough for v1? | In-app only |
| Q13 | Are the admin **and the storefront** OK on **Cloudflare Pages** instead of Vercel? (Vercel's free Hobby plan is meant for non-commercial use; check their terms if you stay on it.) | ✅ **Answered: yes**, Cloudflare Pages for both |
| Q14 | OK to pay **~$2/month** for one always-on API machine, instead of $0 with a 2–4 s cold start after idle periods? | ✅ **Answered: yes**, always on |
| Q15 | Is it acceptable that catalog changes (price, stock shown, new products) take **up to ~60 seconds** to appear on the storefront? Checkout always uses live stock and prices. | Yes, 60 s (not answered explicitly, so the default stands) |

---

## 14. Build status (2026-11-07)

Everything below was built on the branch `feat/admin-rebuild` and tested **locally against the Neon `dev` branch and the real R2 buckets**. Nothing has been deployed, and no real shop data has been copied yet.

### 14.1 What exists

| Area | What was built |
|---|---|
| Database | New Prisma schema with migrations `0_init` and `1_collections_and_history`: ERP tables removed; numeric `min_price`/`max_price`; `pg_trgm` search indexes; a constraint so stock can never go negative; `inventory_movements` (ledger), `order_payments`, `order_status_history`, `purchases`/`purchase_items` (stock receipts, no vendors), `admin_audit_log`, `reviews.is_hidden`; the collections tables the live shop was already using |
| Storefront API fixes | Open `/admin` routes removed; `X-Customer-Id` impersonation removed; collection-cart routes now need the customer's own token; health split into `/health` (no database) and `/health/db`; real visitor IP for rate limits; `Cache-Control` for public catalog reads (edge-cacheable) and `no-store` for everything else; checkout stock changes go through the ledger with row locks; low-stock and new-order notifications; hidden reviews are not shown; price filter and sort use real numbers |
| Storage | Cloudflare R2 service: type check by content, WebP at 1600 px plus a 400 px thumbnail, 1-year immutable cache, signed URLs for receipts, orphan clean-up. Supabase and Cloudinary code removed |
| Admin API (`/api/v1/admin`) | Fixed-account sign-in (bcrypt, signed cookie, rate limit, Origin check); roles and permissions; catalog (categories, brands, products, variants, images, bulk); orders (state machine, payments, item edits, cancel with restock); inventory (levels, ledger, adjustments, receipts with weighted-average cost); customers; reviews; shop settings; app versions; notifications (answered from memory); activity log; usage; dashboard; reports and CSV; AI descriptions |
| Admin app (`admin-frontend/`) | React + Vite + TypeScript with the OMGx look (colours, Urbanist font, 10 px corners, light and dark). All screens above, plus a printable A4 invoice |
| Operations | Node 22 Dockerfile; Fly always-on config; GitHub Actions for CI, nightly encrypted backup to R2, and scheduled jobs; job endpoints with a secret header; migration scripts (database and pictures); `npm run preflight`; `npm run admin:hash`; k6 load script; Cloudflare Pages header files |

### 14.2 What was verified

- **106 backend tests pass** (unit and integration), including the order state machine, the stock ledger rules, the image pipeline, sign-in tokens, the permission map kept identical in the admin app, and "no admin route answers without a session".
- **13 admin app tests pass**; typecheck and lint are clean; the production build succeeds.
- **End-to-end smoke test (`npm run smoke:admin`) passed all ~50 checks** against the real server, Neon `dev` and R2: login and roles, creating products with variants, derived price range and stock, stale-edit rejection, image upload to R2 and fake-image rejection, stock adjustment, never below zero, receipts with weighted-average cost, order transitions, payments, cancel returning stock, staff seeing no costs, reports, audit, usage.
- **The real admin app was driven in a headless browser** against that server: every page loads without errors (only the pictures are broken, because `cdn.kks-online.com` does not exist yet).

### 14.3 Not done, and why

| Item | Why | What unblocks it |
|---|---|---|
| Deploy anything | Needs the live Fly app, secrets and your go | You: runbooks 09 and 12, then me |
| Copy real data and pictures | Needs read access to the old Supabase | You: runbook 11 (Part C) |
| `cdn.kks-online.com` | The custom domain is not connected to `kks-public` | You: runbook 05, step 2 |
| Cloudflare proxy, cache rule and rate-limit rule on `api.` | The API hostname does not exist until the Fly app has a certificate for it | After deploy (I can do it with your Cloudflare token) |
| Real AI test | No `OPENAI_API_KEY` yet | You: runbook 07 |
| Sentry, uptime monitor | Need accounts | Optional |
| Storefront on Cloudflare Pages | Needs you to connect the repo | You: runbook 06 |
| Gate checks G2, G3, G4 | Need the real Supabase database and image sizes | Same as "copy real data" |
| Load test | Needs a staging deployment | After deploy |
| Similarity-ranked search, Playwright tests | Left out to finish the core; none blocks go-live | Later |

### 14.4 Decisions made while building (and why)

- **Independent installs, not npm workspaces.** Three apps with their own `package-lock.json` are simpler to deploy. The one shared thing, the permission map, is copied and a test fails if the copies differ.
- **Copy scripts, not dump/restore with expand and contract.** Neon starts empty, so a table-by-table copy of the needed columns is simpler and repeatable (see Phase 2).
- **Money is never a float.** The API sends exact decimal strings; the admin uses `decimal.js`.
- **Database timeouts.** Prisma's 5-second transaction limit is raised to 30 s; a silent connection fails after 20 s and is retried; the retry also covers a sleeping Neon database.
- **The pooled Neon endpoint is slower from your PC** (about 500 ms per query versus 130 ms direct). That is the path from Pakistan to Singapore; on Fly in the same region it should not matter. Measure after the first deploy; if the pooled endpoint is still slow there, switch the API to the direct URL with the app's own small pool.
- **The Fly machine is 512 MB, not 256 MB**, because image processing needs headroom. About $3.2 a month instead of about $2.
- **Stock is changed in one place only** (`applyStockChanges`). The admin product form cannot edit stock of an existing variant, so every change is in the ledger.

### 14.5 Re-verified after moving the project folder (2026-11-07)

Checked again from the new folder location. Nothing was deployed or changed in any live system.

| Check | Result |
|---|---|
| `npm run preflight` | 10 ok, 2 warnings, 3 problems (below) |
| Neon pooled and direct connections | ✅ Postgres 18.6, 32 tables, 9.5 MB |
| R2 `kks-public` and `kks-private` | ✅ write and delete work |
| Cloudflare zone and token | ✅ `kks-online.com` active |
| Old Supabase read access | ✅ database 24 MB |
| Backend typecheck and tests | ✅ clean; 106 of 106 tests pass |
| Admin app typecheck and tests | ✅ clean; 13 of 13 tests pass |
| Admin app screens | Dashboard, Orders (list, detail, invoice), Products (list, editor, categories/brands), Inventory (stock, receipts, receipt editor), Customers (list, detail), Reviews, Reports, Audit, Settings, Login |
| Phase 0 on the live Supabase project | Code side done. The dashboard steps (sign-ups off, key check, closing open image buckets and functions) are **not confirmed done** |

**Open problems (all need you, none are code):**

1. `ADMIN_ACCOUNTS` and `ADMIN_SESSION_SECRET` missing from `kksonline-backend-express/.env` ([runbook 10](runbooks/10-admin-accounts.md)). Without them nobody can sign in to the admin.
2. `JOBS_SECRET` missing (a long random string; also a GitHub secret).
3. `cdn.kks-online.com` is not connected to `kks-public` ([runbook 05](runbooks/05-cloudflare-r2.md), step 2), so admin pictures are broken.
4. Optional: `OPENAI_API_KEY` (AI descriptions), `NEON_API_KEY` (usage report).
5. Supabase security steps A1 to A3 in [runbook 11](runbooks/11-supabase-steps.md). Also answer: is `jazzcash-webhook` still used?

**Next code steps (me):** dry run of `scripts/migrate-from-supabase.mjs` and `scripts/migrate-images.mjs` against Neon `dev` (needs only what is already in `.env`); then, once 1 and 2 are done, run `npm run smoke:admin` again. Deploy waits for runbooks 09 and 12.

**Housekeeping:** `docs/db-triage.md` and `runbooks/11-supabase-steps.md` have uncommitted edits from the earlier session (live-database findings). `.mcp.json`, `OMGx/` and `image/` are untracked.

**Update later the same day:** the shop data is copied into Neon `dev` (1,991 rows, counts match the triage). The picture copy failed: Supabase has restricted the project (`exceed_egress_quota`, HTTP 402 on Storage), so nothing could be downloaded. It needs a Supabase Pro month or the billing reset; then re-run `node scripts/migrate-images.mjs --apply` (safe to repeat). The live storefront's Supabase pictures are probably broken for the same reason.

### 14.6 Collections in the admin (added 2026-11-07)

A **collection** is a bundle of product options (variants) with a default quantity each, sold together. The storefront shows them on the home page (one "main banner" collection plus featured cards) and on `/collections/:id`. This is a store feature, not ERP, so it stays. One shop: there is no tenant or owner column.

| Part | What |
|---|---|
| API (`modules/admin/catalog/collections.routes.ts`) | `GET /collections` (cards: picture, counts, bundle price, warnings), `GET /collections/:id` (with products), `POST`, `PATCH`, `DELETE`, `PUT /collections/:id/items` (whole list in one go, array order = display order), `PUT /collections-order`, `POST /collections/:id/image` (to R2), `GET /collections/variant-search` (the picker). Reads need `catalog.view`, writes `catalog.write` (manager and owner). Every change is audited and clears the catalog caches |
| Rules kept | Only one collection can be the main banner (setting one clears the others, in one transaction). A hidden product or option shows as a warning and is not counted in the bundle price, matching the storefront |
| Admin screens | `/collections`: cards with picture, badges (main banner, featured, hidden), product count and price, warnings (empty, out of stock, hidden items), shown/hidden switch, move earlier/later, search. `/collections/:id`: product list with quantity steppers, reorder, remove and a live bundle price; an "Add products" picker that searches by name, option or SKU; details, a picture drop zone and three switches with plain explanations; a save bar that appears only when something changed, and a warning when leaving with unsaved changes |
| Verified | Typecheck, lint, build, 13 admin tests and 64 backend unit tests pass. A live run on the dev database passed 28 of 29 checks (the one "failure" was my test expecting 400 where the API correctly answers 422 for an empty name): list and detail of the 6 real collections, create, the one-main-banner rule, items replace and reorder, duplicate and unknown product rejected, image upload and fake-image rejection, storefront shows an active one and hides an inactive one, staff cannot write, no session is refused, delete. The test removed everything it created |
| Not done | Dragging cards to reorder (arrows are used instead). Collection pictures that live only in Supabase Storage still need the picture copy (blocked, see above) |

### 14.7 Dev deployment (2026-11-07) — superseded by 14.8; the `kks-api-dev` app and `fly.dev.toml` are gone

| Part | Where |
|---|---|
| Admin | Vercel, `https://admin.kks-online.com` (also `kks-web-ten.vercel.app`). `/api/*` is forwarded by `admin-frontend/vercel.json`, so the login cookie is first-party |
| API (dev) | Fly app **`kks-api-dev`** (Singapore, `kks-api-dev.fly.dev`), config `kksonline-backend-express/fly.dev.toml`, on the Neon **dev** branch with the copied shop data. **Sleeps when idle** (`auto_stop_machines = 'stop'`, `min_machines_running = 0`); first request after a pause takes about 6 s. Deploy with `fly deploy -c fly.dev.toml --remote-only --ha=false` from `kksonline-backend-express` |
| Live shop API | **Untouched.** Fly app `kksonline-backend` (behind `api.kks-online.com`, Supabase) keeps serving the storefront |
| Cloudflare keys | Deliberately **not** set on the dev app: the cache purge clears the whole `kks-online.com` zone, which would flush the live shop on every admin edit. `DEPLOY_TIER=dev` lets the app start without them |
| At cutover | Switch to `fly.toml` (always on), set the production Neon branch and the Cloudflare keys, and point `api.kks-online.com` at it |

### 14.8 Production cutover done (2026-11-07)

The owner gave the go; Phase 11 was carried out in one session.

| Step | Result |
|---|---|
| Neon `production` branch | Was empty. Migrations `0_init` and `1_collections_and_history` applied |
| Data copy (`scripts/migrate-from-supabase.mjs --apply`) | 1,991 rows in 23 tables. Verified in Neon: 153 products, 335 variants, 83 orders, 193 order items, 44 customers, 6 collections, 304 ledger rows, 12 payments; stock total 40,878 and order total 148,974.00 match the dev copy. Supabase had no new orders or customers during the copy (83 orders, max id 148, 44 customers before and after). Both connections use full TLS verification (Neon: public CA; Supabase: pinned `scripts/certs/supabase-root-2021-ca.crt`) |
| API | Fly app **`kksonline-backend`** (the same app that serves `api.kks-online.com`), release **v10**, one always-on 512 MB machine in Singapore, `fly.toml`. Secrets set with `scripts/fly-set-secrets.cjs` (values never printed). `JWT_SECRET`, `GOOGLE_CLIENT_ID` and `ALLOWED_ORIGINS` were left as they were, so signed-in customers stay signed in |
| Checks on `api.kks-online.com` | Health and database connected; products (139 visible), categories (18), brands (27), collections (5 active), premium banner, shop config, price sort and filter, search; admin routes answer 401 without a session; `X-Customer-Id` impersonation refused; catalog responses are cacheable, private ones `no-store` |
| Storefront | `www.kks-online.com` (Vercel) already calls `api.kks-online.com`, so it now uses the new backend with no change |
| Admin | `admin.kks-online.com` (Vercel); `/api` is forwarded to `kksonline-backend.fly.dev` by `admin-frontend/vercel.json` |
| Rollback | The previous release is v9 (`registry.fly.io/kksonline-backend:deployment-01KVZA70FE5B3PQ6DH4QXD2ZDX`). To go back: `fly deploy --image <that image> -a kksonline-backend`, then set `DATABASE_URL` to the Supabase pooled URL. Supabase was only read, so it still holds everything up to the cutover. After real orders exist on Neon, fix forward instead |

**Known gaps after cutover:**
- Pictures: Supabase Storage is blocked by `exceed_egress_quota`, so the 249 images are not in R2, and `cdn.kks-online.com` is not connected. Until both are done, product pictures are missing on the storefront and admin. Then run `node scripts/migrate-images.mjs --apply` (safe to repeat)
- Admin password: the production admin still uses the 6-character password; change it with `make admin-hash`, then `fly secrets set ADMIN_ACCOUNTS=...`
- A second, stopped machine exists in the app (`9080d703c59768`); remove it with `fly machine destroy 9080d703c59768 -a kksonline-backend`
- `kks-online.com` (without `www`) returns a Cloudflare "Not Found"; add a redirect to `www`
- No Cloudflare cache rule yet, so the edge does not cache catalog calls; GitHub Actions is locked by a billing flag (CI, backups, jobs do not run)
- Supabase security steps A1 to A3 and "is `jazzcash-webhook` still used" are still open; the old project stays idle for 90 days
