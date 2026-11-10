# Live check: a dataset-driven test of the whole shop

The cases are plain data in `cases/*.json` (who calls, which request, what must come back, what the database must
look like afterwards). One engine (`engine.mjs`) runs them in two ways:

| Mode | What it does | Safe on production? |
|---|---|---|
| **branch** (full, ~370 checks) | Starts the real backend code on your PC against a **temporary copy of the production database** (a Neon branch) and runs every case: sign-in, roles, catalog, stock, orders, checkout, overselling races, collections, reports | Yes, it never touches production (it refuses to start if the database is a production host) |
| **prod** (read-only, ~80 checks) | Calls the real site (API, storefront, admin, CDN) with GET requests and refused-on-purpose requests only | Yes, it changes nothing |

## Run the read-only production check (1 minute)

```
cd kksonline-backend-express
node tests/live/run.mjs --mode prod
```

Optional: also check the admin with a real account (read-only calls):

```
PROD_ADMIN_EMAIL=you@example.com PROD_ADMIN_PASSWORD=your-password node tests/live/run.mjs --mode prod
```

## Run the full check on a temporary copy of production (about 6 minutes)

1. Neon console, project `kks-online`, **Branches**, **Create branch**. Parent: `production`. Name it like `livetest-2026-11-10`.
2. Open the new branch, **Compute**, and copy the two hosts (the normal one and the one ending in `-pooler`).
3. Run:
   ```
   cd kksonline-backend-express
   LIVE_BRANCH_NAME=livetest-2026-11-10 \
   LIVE_DIRECT_HOST=<host from the console> \
   LIVE_POOLED_HOST=<pooled host from the console> \
   node tests/live/branch-run.cjs --show-log
   ```
   (On Windows PowerShell set the three values with `$env:NAME = "value"` first.)
4. Read the summary at the end. `FAIL` lines say which case failed and why. The full result is saved in `last-report.json`.
5. **Delete the temporary branch** in the Neon console when you are done.

Needs: `.env.production.local` (production database user), and the R2 keys in `.env.development` (picture upload cases write
to your real picture bucket and delete again).

## Writing a case

```json
{ "id": "ord-002", "title": "a valid checkout places the order",
  "as": "cust1", "method": "POST", "path": "/orders/checkout",
  "body": { "directCheckout": { "variantId": "{{vA}}", "quantity": 2, "price": 1000 }, "addressId": "{{addrIds.0}}",
            "shippingMethod": "pickup", "paymentMethod": "cod", "idempotencyKey": "lt-{{runId}}-order1" },
  "save": { "orderId": "data.orderId" },
  "expect": { "status": [200, 201], "json": { "data.orderId": { "$gt": 0 } } },
  "sql": [{ "q": "select stock from product_variants where variant_id = $1", "args": ["{{vA}}"], "expect": { "rows.0.stock": 6 } }] }
```

* `as`: `anon`, `owner`, `manager`, `staff`, or `cust1`...`cust13` (test customers with signed tokens).
* `{{name}}` inserts a saved value. `save` stores a value from the response for later cases.
* Matchers: a plain value, or `$gt $gte $lt $lte $num $approx $regex $in $contains $length $type $exists $not $each $sorted`.
* `sql` checks the database (branch mode only). `readonly: true` marks a case as safe for production mode.
* `burst`: send the same request many times at once, each as a different customer (for race conditions).

## What the suites cover

`01` sign-in, roles, CSRF, rate limit, every admin route refuses anonymous callers · `02` the shop as shoppers see it
(listing, paging, numeric price sort, filters, search, pictures, cache headers, bad input never gives a 500) ·
`03` admin catalog and pictures · `04` stock adjustments, receipts, weighted-average cost, the stock ledger ·
`05` cart and checkout (price tampering, hidden products, someone else's address or cart, double submit) ·
`06` order lifecycle, payments, edits, cancel and restock once · `07` 10 buyers for 3 items at once, duplicate submits,
and invariants over the whole database · `08` collections · `09` dashboard, reports, settings, audit · `99` clean-up and final checks.

OpenAI is deliberately not tested (the key is not set up yet).
