# KKS Online: Architecture Diagrams

Companion to [plan.md](plan.md). Target: **~1,000 registered users, 50–100 active at once, ~$2/month + domain.**

**How to view:** these are Mermaid diagrams.
- **GitHub** draws them automatically when you open this file.
- **VS Code:** install the extension *Markdown Preview Mermaid Support* (`bierner.markdown-mermaid`), then open the preview (`Ctrl+Shift+V`).
- **Any browser:** paste one diagram block into [mermaid.live](https://mermaid.live) to zoom, pan and export as PNG/SVG.

Diagrams render at full size (not shrunk to the page width), so scroll sideways on the wide ones.

| # | Diagram | Shows |
|---|---|---|
| 1 | [System overview](#1-system-overview) | Every component, provider and connection |
| 2 | [Four cache layers](#2-how-a-request-is-answered-four-cache-layers) | Why browsing almost never touches the database |
| 3 | [First visitor of the morning](#3-first-visitor-of-the-morning-database-asleep) | What happens when the free database is asleep |
| 4 | [Product search](#4-product-search) | Debounce, caching, trigram index, typo tolerance |
| 5 | [Checkout](#5-checkout-no-overselling) | Transaction, row locks, stock ledger, idempotency |
| 6 | [Admin login](#6-admin-login-and-an-admin-request) | fixed accounts, session cookie, roles |
| 7 | [Stock changes](#7-every-stock-change-goes-through-one-function) | All stock changes through one function |
| 8 | [Order state machine](#8-order-state-machine) | Allowed status changes |
| 9 | [Data model](#9-core-data-model) | Core tables after the cleanup |
| 10 | [Security layers](#10-security-layers-of-one-request) | Every check one request passes |
| 11 | [What wakes the database](#11-what-wakes-the-database-free-compute-budget) | The Neon free compute budget |
| 12 | [Environments and deployment](#12-environments-ci-and-deployment) | Dev, staging, production, CI, backups |
| 13 | [Production cutover](#13-production-cutover-day) | The switch from Supabase, with rollback |
| 14 | [Delivery timeline](#14-delivery-timeline) | The 13 phases over ~16 weeks |

---

## 1. System overview

```mermaid
%%{init: {"theme": "default", "themeVariables": {"fontSize": "20px"}, "flowchart": {"useMaxWidth": false, "wrappingWidth": 340, "nodeSpacing": 55, "rankSpacing": 85, "curve": "basis", "htmlLabels": true}}}%%
flowchart TB
    subgraph USERS["USERS: ~1,000 registered, 50–100 active at the same time"]
        direction LR
        SHOP["🛒 <b>Shoppers (web)</b><br/>browser<br/>browse · search · cart · checkout"]
        ADM["🧑‍💼 <b>Admins</b><br/>owner · manager · staff<br/>orders · catalog · stock"]
    end

    subgraph CF["CLOUDFLARE (free plan)"]
        direction TB
        DNS["🌐 <b>DNS + TLS + DDoS protection</b><br/>yourdomain · api. · admin. · cdn.<br/>1 free rate-limit rule (login, checkout)"]
        EDGE["⚡ <b>Edge cache for the API</b><br/>only public catalog GETs<br/>fresh 60 s · stale up to 10 min<br/>never caches cart / orders / auth / admin"]
        PAGES_S["🖥️ <b>Cloudflare Pages: Storefront</b><br/>React 18 + Vite (static files)<br/>moved from Vercel"]
        PAGES_A["🛠️ <b>Cloudflare Pages: Admin dashboard</b><br/>React 18 + Vite + shadcn/ui<br/>TanStack Query + Table"]
        R2PUB["🖼️ <b>R2 bucket: kks-public</b><br/>served at cdn.yourdomain<br/>product, brand, category images<br/>WebP · cached for 1 year"]
        R2PRIV["🔒 <b>R2 bucket: kks-private</b><br/>payment receipts (signed URLs, 5 min)<br/>encrypted nightly DB backups"]
    end

    subgraph FLY["FLY.IO: Singapore (sin) · 1 always-on machine · shared CPU, 256 MB · ~$2/month"]
        direction TB
        MW["🧱 <b>Middleware</b><br/>helmet · CORS allowlist · real client IP<br/>rate limits · Cache-Control headers<br/>request ID · 15 s timeout"]
        PUB["🛍️ <b>Public + customer routes</b><br/>products · search · categories · brands<br/>collections · cart · checkout · orders<br/>customer login = Google + backend JWT"]
        AUTH["🔑 <b>Admin sign-in</b><br/>/api/v1/admin/auth<br/>fixed accounts from server settings<br/>bcrypt · HTTP-only session cookie"]
        ADMIN["📋 <b>Admin modules</b><br/>requireAdmin(role) · zod validation<br/>products · orders · inventory · customers<br/>reviews · settings · AI · audit log"]
        CACHE["🧠 <b>In-memory cache</b><br/>node-cache · catalog 30 min · search 60 s<br/>single-flight · stale-on-error"]
        STOCK["📦 <b>applyStockChanges()</b><br/>one transaction · row locks<br/>writes the inventory ledger"]
        JOBS["⏱️ <b>/internal/jobs</b><br/>protected by X-Jobs-Secret<br/>reservations · retention · usage"]
    end

    subgraph NEON["NEON POSTGRES: Singapore · free plan"]
        direction LR
        PGMAIN[("🗄️ <b>Branch main = PRODUCTION</b><br/>0.25 CU fixed · 0.5 GB<br/>sleeps after ~5 min idle<br/>pooled connections · role app_rw")]
        PGDEV[("🧪 <b>Branch dev</b><br/>sanitized copy of production<br/>for building and testing")]
    end

    subgraph EXT["EXTERNAL SERVICES"]
        direction TB
        OAI["🤖 <b>OpenAI gpt-4o-mini</b><br/>product description drafts<br/>key only on the server"]
        GOOG["🔐 <b>Google Sign-In</b><br/>customer login"]
        SENTRY["🚨 <b>Sentry (free)</b><br/>errors from API, storefront, admin"]
        UPT["📈 <b>Uptime monitor (free)</b><br/>calls /health every 5 min<br/>never touches the database"]
    end

    subgraph GH["GITHUB"]
        direction TB
        CI["⚙️ <b>GitHub Actions: CI/CD</b><br/>typecheck · lint · tests · build · deploy"]
        CRON["🕒 <b>GitHub Actions: schedules</b><br/>nightly backup · reservations every 10 min<br/>daily usage check · monthly retention"]
    end

    subgraph LEGACY["LEGACY: only until cutover (Phase 11)"]
        direction LR
        OMGX["🗑️ <b>OMGx Flutter admin</b><br/>retired at cutover"]
        SUPA[("🗑️ <b>Supabase</b><br/>current database + storage<br/>deleted 90 days after cutover")]
    end

    SHOP --> DNS
    ADM --> DNS
    DNS --> PAGES_S
    DNS --> PAGES_A
    DNS --> R2PUB
    DNS --> EDGE
    EDGE -->|"cache miss or<br/>personal request"| MW
    MW --> PUB
    MW --> AUTH
    MW --> ADMIN
    PUB --> CACHE
    ADMIN --> CACHE
    CACHE -->|"only on a miss"| PGMAIN
    PUB -->|"checkout"| STOCK
    ADMIN -->|"receive · cancel · adjust"| STOCK
    STOCK --> PGMAIN
    ADMIN --> PGMAIN
    JOBS --> PGMAIN
    ADMIN -->|"upload → sharp → WebP"| R2PUB
    PUB -->|"payment receipt"| R2PRIV
    ADMIN -->|"purge changed URLs"| EDGE
    ADMIN -->|"draft description"| OAI
    PUB --> GOOG
    MW -.->|"errors"| SENTRY
    UPT -->|"/health"| MW
    CRON -->|"X-Jobs-Secret"| JOBS
    CRON -->|"pg_dump, read-only role"| PGMAIN
    CRON -->|"encrypted dump"| R2PRIV
    CI -->|"deploy API"| FLY
    CI -->|"deploy sites"| PAGES_S
    CI --> PAGES_A
    CI -->|"tests"| PGDEV
    OMGX -.->|"writes directly, until cutover"| SUPA
    SUPA -.->|"final dump at cutover"| PGMAIN

    classDef user fill:#E8F1FF,stroke:#2F6FDB,stroke-width:2px,color:#0B2A5B
    classDef cf fill:#FFF1E0,stroke:#F38020,stroke-width:2px,color:#5A2D00
    classDef fly fill:#F1ECFF,stroke:#7B5CF5,stroke-width:2px,color:#2A1A66
    classDef db fill:#E6F8F0,stroke:#0F9D6B,stroke-width:2px,color:#063D29
    classDef ext fill:#F4F4F5,stroke:#71717A,stroke-width:2px,color:#18181B
    classDef legacy fill:#FDECEC,stroke:#D64545,stroke-width:2px,stroke-dasharray:6 4,color:#5B1111
    class SHOP,ADM user
    class DNS,EDGE,PAGES_S,PAGES_A,R2PUB,R2PRIV cf
    class MW,PUB,AUTH,ADMIN,CACHE,STOCK,JOBS fly
    class PGMAIN,PGDEV db
    class OAI,GOOG,SENTRY,UPT,CI,CRON ext
    class OMGX,SUPA legacy
```

**Reading it:** everything a shopper or admin does enters through Cloudflare. Static sites and images never reach the API. Public catalog data is usually answered by the edge cache or the API's memory. Postgres is touched only for cache misses, personal data (cart, orders, account) and admin work.

---

## 2. How a request is answered: four cache layers

```mermaid
%%{init: {"theme": "default", "themeVariables": {"fontSize": "20px"}, "flowchart": {"useMaxWidth": false, "wrappingWidth": 340, "nodeSpacing": 50, "rankSpacing": 70, "curve": "basis"}}}%%
flowchart LR
    REQ(["👤 <b>Shopper opens a<br/>product list or product page</b>"])

    REQ --> L0{"<b>L0: Browser</b><br/>TanStack Query cache<br/>fetched less than 5–10 min ago?"}
    L0 -->|"yes"| D0["✅ <b>Shown instantly</b><br/>no network at all<br/>≈ 0 ms"]
    L0 -->|"no"| L1{"<b>L1: Cloudflare edge</b><br/>same URL cached<br/>less than 60 s ago?"}

    L1 -->|"yes"| D1["✅ <b>Served from the edge</b><br/>API and database untouched<br/>≈ 20–80 ms"]
    L1 -->|"older than 60 s,<br/>younger than 10 min"| SWR["✅ <b>Stale copy served now</b><br/>one background request<br/>refreshes it"]
    L1 -->|"not cached"| L2{"<b>L2: API memory</b><br/>node-cache has this key?"}
    SWR -.->|"background refresh"| L2

    L2 -->|"yes"| D2["✅ <b>Answered by the API</b><br/>database untouched<br/>≈ 5 ms inside the API"]
    L2 -->|"no, but the same key<br/>is already being fetched"| SF["⏳ <b>Single-flight</b><br/>wait for that one query<br/>instead of starting another"]
    L2 -->|"no"| L3[("<b>L3: Neon Postgres</b><br/>indexed query")]
    SF --> D2

    L3 -->|"database awake"| OK["✅ <b>Result</b><br/>≈ 5–30 ms query<br/>saved into L2, edge caches it"]
    L3 -->|"database asleep"| WAKE["⏰ <b>Wake up</b><br/>≈ 1 s · retry wrapper<br/>turns it into a delay, not an error"]
    WAKE --> OK
    L3 -->|"database error"| STALE["🛟 <b>Stale-on-error</b><br/>return the last good copy<br/>shopper sees no failure"]

    PRIV(["🔒 <b>Personal requests</b><br/>cart · checkout · orders<br/>account · admin"]) -->|"Cache-Control: private, no-store<br/>never cached at the edge"| API2["<b>API</b><br/>auth check"]
    API2 --> L3

    classDef q fill:#FFF8E1,stroke:#E0A800,stroke-width:2px,color:#4A3800
    classDef good fill:#E6F8F0,stroke:#0F9D6B,stroke-width:2px,color:#063D29
    classDef warn fill:#FFF1E0,stroke:#F38020,stroke-width:2px,color:#5A2D00
    classDef db fill:#E8F1FF,stroke:#2F6FDB,stroke-width:2px,color:#0B2A5B
    classDef priv fill:#FDECEC,stroke:#D64545,stroke-width:2px,color:#5B1111
    class L0,L1,L2 q
    class D0,D1,D2,SWR,OK good
    class SF,WAKE,STALE warn
    class L3 db
    class PRIV,API2 priv
```

**Effect at peak (100 active shoppers):** ~15 requests/s reach Cloudflare, ~3–5/s reach the API, and only ~1–2/s reach Postgres.

---

## 3. First visitor of the morning (database asleep)

```mermaid
%%{init: {"theme": "default", "themeVariables": {"fontSize": "18px"}, "sequence": {"useMaxWidth": false, "actorFontSize": 18, "messageFontSize": 17, "noteFontSize": 16, "boxMargin": 12, "messageMargin": 40, "mirrorActors": false}}}%%
sequenceDiagram
    autonumber
    actor U as Shopper
    participant B as Storefront<br/>(browser)
    participant CF as Cloudflare<br/>edge
    participant API as Express API<br/>(always on)
    participant C as API memory<br/>cache
    participant DB as Neon Postgres<br/>(asleep)

    Note over DB: No queries for 5+ minutes,<br/>so compute is suspended (costs nothing)
    U->>B: Opens the home page
    B->>CF: Static files (HTML, JS, CSS)
    CF-->>B: Served from Cloudflare Pages, never reaches the API
    B->>CF: GET /api/v1/products/popular
    alt Edge still has a copy (fresh, or stale under 10 min)
        CF-->>B: Products returned immediately
    else Edge has nothing
        CF->>API: Forward request
        API->>C: Look up "popular_products"
        alt In memory (catalog lasts 30 min)
            C-->>API: Products
        else Not in memory
            API->>DB: SELECT … (connect_timeout 15 s)
            Note over DB: Wakes up in about a second
            DB-->>API: Rows
            API->>C: Save for 30 min
        end
        API-->>CF: JSON + Cache-Control: public, s-maxage=60
        CF-->>B: Products (now cached at the edge too)
    end
    B-->>U: Page shown. Images come from cdn.yourdomain (R2), cached 1 year
    Note over U,DB: Only the very first uncached request of the day waits for the wake-up.<br/>Everyone after that is served from the caches.
```

---

## 4. Product search

```mermaid
%%{init: {"theme": "default", "themeVariables": {"fontSize": "18px"}, "sequence": {"useMaxWidth": false, "actorFontSize": 18, "messageFontSize": 17, "noteFontSize": 16, "messageMargin": 40, "mirrorActors": false}}}%%
sequenceDiagram
    autonumber
    actor U as Shopper
    participant B as Storefront<br/>search box
    participant CF as Cloudflare<br/>edge
    participant API as Express API
    participant C as API memory<br/>cache
    participant DB as Postgres<br/>pg_trgm indexes

    U->>B: Types "s", "sa", "sam", "samsng"
    Note over B: Waits 300 ms after the last keystroke<br/>minimum 2 characters<br/>cancels any older search still in flight<br/>keeps previous results on screen
    B->>CF: GET /products/search?q=samsng&sort=price
    alt Same search in the last 60 s
        CF-->>B: Cached results
    else Not cached at the edge
        CF->>API: Forward
        API->>C: Key: search · "samsng" · filters
        alt Same search in the last 60 s on this server
            C-->>API: Results
        else Not cached
            API->>DB: One ranked query (bound parameters)
            Note over DB: Trigram GIN indexes on product name,<br/>brand, category and variant SKU<br/>rank = word_similarity("samsng", name)<br/>so the typo still matches "Samsung"<br/>sort by numeric min_price (not text)
            DB-->>API: Top 20 + total count, in under 50 ms
            API->>C: Save for 60 s
        end
        API-->>CF: JSON + Cache-Control: public, s-maxage=60
        CF-->>B: Results
    end
    B-->>U: "Samsung Galaxy …" results, cheapest first
```

---

## 5. Checkout (no overselling)

```mermaid
%%{init: {"theme": "default", "themeVariables": {"fontSize": "18px"}, "sequence": {"useMaxWidth": false, "actorFontSize": 18, "messageFontSize": 17, "noteFontSize": 16, "messageMargin": 38, "mirrorActors": false}}}%%
sequenceDiagram
    autonumber
    actor U as Shopper
    participant B as Storefront
    participant API as Express API
    participant DB as Neon Postgres
    participant CF as Cloudflare edge

    U->>B: Presses "Place order"
    B->>API: POST /orders/checkout<br/>Authorization: customer JWT<br/>Idempotency-Key: unique per attempt
    Note over API: Checks: JWT valid · rate limit by real client IP<br/>· request body validated with zod
    API->>DB: Was this Idempotency-Key already used?
    alt Already processed (double click, retry)
        DB-->>API: Existing order
        API-->>B: 200, the same order again (never a duplicate)
    else New request
        API->>DB: BEGIN transaction
        API->>DB: SELECT variants … FOR UPDATE<br/>(locked in variant_id order, no deadlocks)
        API->>DB: Re-check live price, stock and visibility
        alt Not enough stock
            API->>DB: ROLLBACK
            API-->>B: 409 INSUFFICIENT_STOCK with the available quantity
        else All good
            API->>DB: Decrease stock + inventory_movements rows (reason: order_placed)
            API->>DB: Insert order + order_items (cost snapshot for profit reports)
            API->>DB: Insert admin notification "New order"
            API->>DB: COMMIT
            API->>API: Clear cached product data in memory
            API->>CF: Purge the affected product URLs
            API-->>B: 201 Created, order number
        end
    end
    B-->>U: Confirmation page
    Note over U,CF: A product page cached for up to 60 s can show stale stock,<br/>but this transaction always uses live stock, so it can never oversell.
```

---

## 6. Admin login and an admin request

```mermaid
%%{init: {"theme": "default", "themeVariables": {"fontSize": "18px"}, "sequence": {"useMaxWidth": false, "actorFontSize": 18, "messageFontSize": 17, "noteFontSize": 16, "messageMargin": 38, "mirrorActors": false}}}%%
sequenceDiagram
    autonumber
    actor A as Admin (owner)
    participant AD as Admin dashboard<br/>admin.yourdomain
    participant BA as Admin sign-in<br/>api.yourdomain/api/v1/admin/auth
    participant MW as requireAdmin<br/>middleware
    participant SVC as Admin service
    participant DB as Neon Postgres

    A->>AD: Email + password
    AD->>BA: POST /login
    Note over BA: 5 tries per 15 min per email and IP<br/>Accounts live in the server settings (ADMIN_ACCOUNTS), not in the database
    BA->>BA: bcrypt check against the stored hash<br/>(same time for unknown emails)
    BA-->>AD: Set-Cookie: kks_admin_session (HttpOnly, Secure, SameSite=Lax, Domain=.yourdomain)
    Note over AD: The cookie is never readable by JavaScript.<br/>The admin app logs out after 30 min idle.

    A->>AD: Cancel order 1042
    AD->>MW: POST /api/v1/admin/orders/1042/transition<br/>cookie + Origin: admin.yourdomain + Idempotency-Key
    MW->>MW: Origin allowed? (CSRF check)
    MW->>MW: Verify the signed cookie, and check the account still exists with the same role
    MW->>MW: Permission "orders.cancel" allowed for owner?
    alt Not allowed (for example, staff)
        MW-->>AD: 403 FORBIDDEN
    else Allowed
        MW->>SVC: cancelOrder(1042, updatedAt)
        SVC->>DB: Transaction (row locks): status → cancelled, restock items,<br/>stock ledger, status history, audit log row
        SVC-->>AD: 200, updated order
    end
```

---

## 7. Every stock change goes through one function

```mermaid
%%{init: {"theme": "default", "themeVariables": {"fontSize": "20px"}, "flowchart": {"useMaxWidth": false, "wrappingWidth": 340, "nodeSpacing": 45, "rankSpacing": 70, "curve": "basis"}}}%%
flowchart TB
    subgraph CALLERS["WHO CHANGES STOCK"]
        direction LR
        C1["🛒 <b>Storefront checkout</b><br/>reason: order_placed<br/>delta: minus quantity"]
        C2["❌ <b>Admin cancels an order</b><br/>reason: order_cancelled<br/>delta: plus quantity"]
        C3["✏️ <b>Admin edits order items</b><br/>(pending / confirmed only)<br/>reason: order_edited<br/>delta: difference"]
        C4["📥 <b>Admin receives a stock receipt</b><br/>reason: stock_receipt<br/>delta: plus quantity, with unit cost"]
        C5["↩️ <b>Admin reverses a receipt</b><br/>reason: receipt_reversed<br/>delta: minus quantity"]
        C6["🔧 <b>Manual adjustment</b><br/>(damage, count, loss, found)<br/>reason: adjustment · note required"]
    end

    F["📦 <b>applyStockChanges(changes, reason, reference, actor)</b><br/>always inside one database transaction"]

    C1 --> F
    C2 --> F
    C3 --> F
    C4 --> F
    C5 --> F
    C6 --> F

    F --> S1["1️⃣ Sort changes by variant_id<br/>(same lock order everywhere, so no deadlocks)"]
    S1 --> S2["2️⃣ SELECT stock, buy_price<br/>FROM product_variants … FOR UPDATE"]
    S2 --> S3{"3️⃣ new stock = stock + delta<br/>below zero?"}
    S3 -->|"yes"| ERR["⛔ Throw INSUFFICIENT_STOCK<br/>whole transaction rolls back"]
    S3 -->|"no"| S4["4️⃣ For stock receipts: weighted-average cost<br/>(stock × old cost + qty × unit cost) ÷ (stock + qty)"]
    S4 --> S5["5️⃣ Update the variant's stock and cost"]
    S5 --> S6["6️⃣ Insert inventory_movements row<br/>delta · stock_after · reason · reference · who · when"]
    S6 --> S7["7️⃣ recalcProductAggregates(product)<br/>total stock · price range · numeric min/max price"]
    S7 --> S8{"8️⃣ stock fell below<br/>the alert level?"}
    S8 -->|"yes"| N["🔔 Low-stock notification for admins"]
    S8 -->|"no"| DONE["✅ Done (committed together with the order / receipt)"]
    N --> DONE

    classDef caller fill:#E8F1FF,stroke:#2F6FDB,stroke-width:2px,color:#0B2A5B
    classDef fn fill:#F1ECFF,stroke:#7B5CF5,stroke-width:3px,color:#2A1A66
    classDef step fill:#FFFFFF,stroke:#A1A1AA,stroke-width:2px,color:#18181B
    classDef bad fill:#FDECEC,stroke:#D64545,stroke-width:2px,color:#5B1111
    classDef good fill:#E6F8F0,stroke:#0F9D6B,stroke-width:2px,color:#063D29
    class C1,C2,C3,C4,C5,C6 caller
    class F fn
    class S1,S2,S3,S4,S5,S6,S7,S8 step
    class ERR bad
    class DONE,N good
```

---

## 8. Order state machine

```mermaid
%%{init: {"theme": "default", "themeVariables": {"fontSize": "20px"}}}%%
stateDiagram-v2
    direction LR
    [*] --> pending: Customer places order<br/>(stock already reserved)

    pending --> confirmed: Admin confirms<br/>(staff and above)
    confirmed --> processing: Being packed
    processing --> ready: Packed, ready for courier or pickup
    ready --> delivered: Courier delivered
    delivered --> completed: Payment settled
    ready --> completed: Picked up in store

    pending --> cancelled: Cancel (manager and above)
    confirmed --> cancelled: Cancel
    processing --> cancelled: Cancel
    ready --> cancelled: Cancel

    completed --> [*]
    cancelled --> [*]

    note right of cancelled
        Final. All items are restocked in the same
        transaction, with ledger rows (order_cancelled).
        Un-cancelling is not allowed: create a new order.
    end note

    note left of pending
        Items can be edited only while
        pending or confirmed.
        Every change writes order_status_history
        and the admin audit log.
    end note
```

---

## 9. Core data model

Tables after the cleanup. ERP tables (salesman, vendors, installments, account book, expenses) are archived and gone.

```mermaid
%%{init: {"theme": "default", "themeVariables": {"fontSize": "18px"}, "er": {"useMaxWidth": false, "entityPadding": 18}}}%%
erDiagram
    CATEGORIES ||--o{ PRODUCTS : "groups"
    BRANDS ||--o{ PRODUCTS : "makes"
    PRODUCTS ||--|{ PRODUCT_VARIANTS : "has"
    PRODUCTS ||--o{ COLLECTION_ITEMS : "featured in"
    COLLECTIONS ||--o{ COLLECTION_ITEMS : "contains"
    IMAGES ||--o{ IMAGE_ENTITY : "attached via"
    PRODUCTS ||--o{ REVIEWS : "receives"

    CUSTOMERS ||--o{ ORDERS : "places"
    CUSTOMERS ||--o{ ADDRESSES : "saves"
    CUSTOMERS ||--o{ CART : "fills"
    CUSTOMERS ||--o{ WISHLIST : "keeps"
    CUSTOMERS ||--o{ REVIEWS : "writes"
    PRODUCT_VARIANTS ||--o{ CART : "added as"

    ORDERS ||--|{ ORDER_ITEMS : "contains"
    PRODUCT_VARIANTS ||--o{ ORDER_ITEMS : "sold as"
    ORDERS ||--o{ ORDER_STATUS_HISTORY : "moves through"
    ORDERS ||--o{ ORDER_PAYMENTS : "paid by"
    ORDERS ||--o| ORDER_ADDRESSES : "ships to"
    ORDERS ||--o{ NOTIFICATIONS : "triggers"

    PURCHASES ||--|{ PURCHASE_ITEMS : "stock receipt lines"
    PRODUCT_VARIANTS ||--o{ PURCHASE_ITEMS : "restocked as"
    PRODUCT_VARIANTS ||--o{ INVENTORY_MOVEMENTS : "every stock change"


    PRODUCTS {
        int product_id PK
        string name "trigram index"
        int category_id FK
        int brandID FK
        bool isVisible
        numeric min_price "NEW numeric, for filter and sort"
        numeric max_price "NEW"
        string sale_price "old text, kept for compatibility"
        int stock_quantity "cache of variant stock"
    }
    PRODUCT_VARIANTS {
        int variant_id PK
        int product_id FK
        string sku "unique, trigram index"
        string variant_name
        numeric sell_price
        numeric buy_price "weighted-average cost"
        int stock
        int alert_stock
        datetime updated_at "optimistic locking"
    }
    ORDERS {
        int order_id PK
        int customer_id FK
        enum status "7 states, see diagram 8"
        enum payment_method "cod, credit_card, bank_transfer, pickup, jazzcash"
        numeric sub_total
        numeric paid_amount "sum of order_payments"
        string idempotency_key "unique"
        datetime updated_at "NEW"
        datetime cancelled_at "NEW"
    }
    ORDER_ITEMS {
        int order_id FK
        int variant_id FK
        int quantity
        numeric price
        numeric total_buy_price "cost snapshot"
    }
    INVENTORY_MOVEMENTS {
        bigint movement_id PK "NEW"
        int variant_id FK
        int quantity_delta
        int stock_after
        enum reason
        string reference_type
        string reference_id
        string actor_admin_id
    }
    PURCHASES {
        bigint purchase_id PK "stock receipt"
        string supplier_name "free text, no vendors"
        string reference
        enum receipt_status "draft, received, cancelled"
        datetime received_at
    }
    ADMIN_AUDIT_LOG {
        bigint id PK "NEW"
        string actor_admin_id FK
        string action
        string entity_type
        string entity_id
        json changes
    }
    IMAGES {
        int image_id PK
        string folderType "R2 key prefix"
        string filename "R2 key = folderType/filename"
    }
    CUSTOMERS {
        int customer_id PK
        string first_name "trigram index for admin search"
        string phone_number
        string email
        string auth_uid "Google sign-in"
    }
```

---

## 10. Security layers of one request

```mermaid
%%{init: {"theme": "default", "themeVariables": {"fontSize": "20px"}, "flowchart": {"useMaxWidth": false, "wrappingWidth": 340, "nodeSpacing": 40, "rankSpacing": 55}}}%%
flowchart TB
    R(["📨 <b>Incoming request</b>"]) --> L1

    L1["🛡️ <b>1. Cloudflare</b><br/>TLS only · DDoS protection · rate-limit rule on login and checkout<br/>edge cache only for public catalog paths"]
    L1 --> L2["🔐 <b>2. Fly.io</b><br/>HTTPS forced · only port 8080 exposed"]
    L2 --> L3["🧱 <b>3. Express base middleware</b><br/>helmet security headers · CORS allowlist (storefront + admin only)<br/>JSON body limit · request ID · 15 s timeout"]
    L3 --> L4["🚦 <b>4. Rate limiter</b><br/>keyed by the real client IP (Fly-Client-IP / CF-Connecting-IP)<br/>AI: 20/min and 300/day per admin · admin: 300/min"]
    L4 --> L5{"🪪 <b>5. Who is calling?</b>"}

    L5 -->|"public catalog"| P["No login needed<br/>read-only, cacheable"]
    L5 -->|"customer route"| CJ["Customer JWT (backend-signed, JWT_SECRET)<br/>X-Customer-Id fallback removed"]
    L5 -->|"admin route"| AS["Signed session cookie<br/>+ Origin check (CSRF)<br/>+ account still exists, role checked"]
    L5 -->|"/internal/jobs"| JS["X-Jobs-Secret<br/>constant-time comparison"]

    AS --> L6["👮 <b>6. Permission check</b><br/>one shared map: packages/contracts/permissions.ts<br/>403 if the role is not allowed"]
    CJ --> L7
    P --> L7
    JS --> L7
    L6 --> L7["✅ <b>7. Validation</b><br/>zod on body, query and params · unknown keys rejected<br/>pageSize ≤ 100 · sort fields allowlisted"]
    L7 --> L8["⚙️ <b>8. Service + transaction</b><br/>optimistic locking (updatedAt → 409) · Idempotency-Key<br/>cost fields removed for staff"]
    L8 --> L9["📝 <b>9. Audit log</b><br/>who · what · before/after · IP · request ID<br/>same transaction as the change"]
    L9 --> L10[("🗄️ <b>10. Database</b><br/>role app_rw: no schema changes allowed<br/>statement_timeout 10 s · SSL required<br/>no public data API")]

    subgraph SECRETS["🔑 WHERE SECRETS LIVE"]
        direction LR
        SE1["Server only (Fly env)<br/>DATABASE_URL · R2 keys · OPENAI_API_KEY<br/>ADMIN_SESSION_SECRET · ADMIN_ACCOUNTS · JWT_SECRET · CLOUDFLARE token"]
        SE2["GitHub Actions secrets<br/>backup DB URL (read-only) · backup R2 key · JOBS_SECRET"]
        SE3["Browser bundles<br/>NO secrets at all<br/>only API URL and CDN URL"]
    end

    classDef layer fill:#F1ECFF,stroke:#7B5CF5,stroke-width:2px,color:#2A1A66
    classDef auth fill:#FFF8E1,stroke:#E0A800,stroke-width:2px,color:#4A3800
    classDef db fill:#E6F8F0,stroke:#0F9D6B,stroke-width:2px,color:#063D29
    classDef sec fill:#FDECEC,stroke:#D64545,stroke-width:2px,color:#5B1111
    class L1,L2,L3,L4,L6,L7,L8,L9 layer
    class L5,P,CJ,AS,JS auth
    class L10 db
    class SE1,SE2,SE3 sec
```

---

## 11. What wakes the database (free compute budget)

Neon free ≈ 100 compute-hours/month. At a fixed 0.25 CU that is **~400 awake hours ≈ 13 hours a day**. The database sleeps after ~5 minutes without queries.

```mermaid
%%{init: {"theme": "default", "themeVariables": {"fontSize": "20px"}, "flowchart": {"useMaxWidth": false, "wrappingWidth": 340, "nodeSpacing": 45, "rankSpacing": 80}}}%%
flowchart LR
    subgraph ASLEEP["😴 DOES NOT WAKE THE DATABASE"]
        direction TB
        A1["Opening the storefront<br/>(static files from Cloudflare Pages)"]
        A2["Product images<br/>(R2 via cdn., cached 1 year)"]
        A3["Browsing products, categories, brands,<br/>collections (edge or API memory cache)"]
        A4["Repeated searches<br/>(cached 60 s)"]
        A5["Uptime monitor and Fly health check<br/>(/health has no database query)"]
        A6["Admin dashboard files<br/>(Cloudflare Pages)"]
    end

    subgraph AWAKE["⏰ WAKES THE DATABASE (keeps it awake ~5 more minutes)"]
        direction TB
        W1["Cart: add, update, view"]
        W2["Checkout and order history"]
        W3["Customer login and account pages"]
        W4["New, uncached searches"]
        W5["Any admin work"]
        W6["Catalog cache refresh<br/>(at most once a minute per URL)"]
        W7["Scheduled jobs<br/>(grouped into one daily run where possible)"]
    end

    ASLEEP --> BUDGET
    AWAKE --> BUDGET

    BUDGET{{"📊 <b>Monthly budget ≈ 400 awake hours</b><br/>Quiet ≈ 6 h/day → ~45 CU-h ✅<br/>Moderate ≈ 10 h/day → ~75 CU-h ✅<br/>Busy ≈ 16 h/day → ~120 CU-h ❌"}}

    BUDGET --> WATCH["🔔 <b>Daily usage check</b><br/>warns in the admin at 80%<br/>of the monthly allowance"]
    WATCH --> UP["⬆️ <b>Planned upgrade</b><br/>Neon Launch, roughly $10–20/month<br/>(no code changes, same connection)"]

    BAD["⚠️ <b>Fixed in Phase 0</b><br/>today's health check runs SELECT 1 every 30 s,<br/>which would keep the database awake 24/7<br/>and use the whole budget in ~2 weeks"]
    BAD -.-> A5

    classDef sleep fill:#E6F8F0,stroke:#0F9D6B,stroke-width:2px,color:#063D29
    classDef wake fill:#FFF1E0,stroke:#F38020,stroke-width:2px,color:#5A2D00
    classDef budget fill:#E8F1FF,stroke:#2F6FDB,stroke-width:3px,color:#0B2A5B
    classDef bad fill:#FDECEC,stroke:#D64545,stroke-width:2px,stroke-dasharray:6 4,color:#5B1111
    class A1,A2,A3,A4,A5,A6 sleep
    class W1,W2,W3,W4,W5,W6,W7 wake
    class BUDGET,WATCH,UP budget
    class BAD bad
```

---

## 12. Environments, CI and deployment

```mermaid
%%{init: {"theme": "default", "themeVariables": {"fontSize": "20px"}, "flowchart": {"useMaxWidth": false, "wrappingWidth": 340, "nodeSpacing": 50, "rankSpacing": 75, "curve": "basis"}}}%%
flowchart LR
    DEV["👨‍💻 <b>Developer</b><br/>feature branch<br/>local API + Neon dev branch"]
    DEV -->|"push, open PR"| PR["📝 <b>Pull request</b>"]

    PR --> CI["⚙️ <b>GitHub Actions CI</b><br/>backend: typecheck · lint · unit tests<br/>integration tests on Docker Postgres<br/>authz matrix: every admin route × role<br/>admin + storefront: typecheck · lint · build"]

    CI -->|"pass"| PREV["🔍 <b>Preview deploys</b><br/>Cloudflare Pages preview URL per PR<br/>(storefront + admin)"]
    CI -->|"pass"| STG["🧪 <b>Staging</b><br/>Fly staging app (scales to zero, ~$0)<br/>Neon dev branch · R2 test prefix"]
    STG --> E2E["🎭 <b>Playwright end-to-end tests</b><br/>+ k6 load test before cutover<br/>(100 virtual users, 15 min)"]

    PR -->|"you merge"| MAIN["🌳 <b>main branch</b>"]
    MAIN --> MIG["🗃️ <b>Release step</b><br/>prisma migrate deploy<br/>(additive changes only: expand → contract)"]
    MIG --> FLYP["🚀 <b>Fly production</b><br/>rolling deploy · /health check<br/>1 always-on machine, Singapore"]
    MAIN --> PAGESP["🌍 <b>Cloudflare Pages production</b><br/>storefront + admin"]
    FLYP --> NEONP[("🗄️ <b>Neon production</b><br/>production data")]

    subgraph SAFETY["🛟 SAFETY NET"]
        direction TB
        BK["🌙 Nightly pg_dump<br/>read-only role → encrypted → R2 kks-private<br/>keep 30 daily + 12 monthly"]
        RT["🔁 Restore test<br/>into a throwaway Neon branch<br/>every quarter"]
        MON["📈 Sentry errors · uptime monitor<br/>Fly metrics · daily usage check"]
    end

    NEONP -.-> BK
    BK -.-> RT
    FLYP -.-> MON

    classDef step fill:#E8F1FF,stroke:#2F6FDB,stroke-width:2px,color:#0B2A5B
    classDef test fill:#FFF8E1,stroke:#E0A800,stroke-width:2px,color:#4A3800
    classDef prod fill:#E6F8F0,stroke:#0F9D6B,stroke-width:2px,color:#063D29
    classDef safe fill:#F4F4F5,stroke:#71717A,stroke-width:2px,color:#18181B
    class DEV,PR,MAIN,MIG step
    class CI,PREV,STG,E2E test
    class FLYP,PAGESP,NEONP prod
    class BK,RT,MON safe
```

---

## 13. Production cutover day

```mermaid
%%{init: {"theme": "default", "themeVariables": {"fontSize": "20px"}, "flowchart": {"useMaxWidth": false, "wrappingWidth": 340, "nodeSpacing": 45, "rankSpacing": 60}}}%%
flowchart TB
    START(["✅ <b>Your explicit go</b><br/>Phases 0–10 complete · rehearsal timings known"]) --> S1

    S1["1️⃣ <b>Dress rehearsal done earlier</b><br/>full procedure on a fresh Neon branch"] --> S2
    S2["2️⃣ <b>Pre-sync images</b><br/>copy new files from Supabase Storage to R2"] --> S3
    S3["3️⃣ <b>Freeze</b><br/>OMGx stops · storefront maintenance mode<br/>(about 30 min, low-traffic hour)"] --> S4
    S4["4️⃣ <b>Final dump → restore into Neon production</b><br/>run backfills · rewrite stored image URLs to keys"] --> S5
    S5{"5️⃣ <b>Checks pass?</b><br/>row counts per table<br/>stock and order totals match<br/>sample images load"}
    S5 -->|"no"| ABORT["↩️ <b>Abort</b><br/>leave env vars on Supabase<br/>lift maintenance mode<br/>nothing lost"]
    S5 -->|"yes"| S6["6️⃣ <b>Switch</b><br/>set production DATABASE_URL + R2 vars<br/>deploy API · deploy admin · point admin. DNS"]
    S6 --> S7["7️⃣ <b>Verify live</b><br/>test order end to end · change status in admin<br/>cancel it · check stock and storefront"]
    S7 --> S8{"8️⃣ <b>Healthy?</b>"}
    S8 -->|"no, and no real order yet<br/>(first hour)"| RB["↩️ <b>Roll back</b><br/>env vars back to Supabase"]
    S8 -->|"no, real orders exist"| FIX["🔧 <b>Fix forward</b><br/>(rolling back would lose new orders)"]
    S8 -->|"yes"| S9["9️⃣ <b>Lift maintenance mode</b><br/>store is live on Neon + R2"]
    S9 --> S10["🔟 <b>Retire</b><br/>remove keep-alive job · delete edge functions<br/>remove Supabase code · archive OMGx repo"]
    S10 --> S11["🧹 <b>Contract migration</b><br/>ERP tables dumped to R2, dropped from Neon<br/>dead columns removed"]
    S11 --> S12(["🗓️ <b>After 90 quiet days</b><br/>delete the Supabase project"])

    classDef step fill:#E8F1FF,stroke:#2F6FDB,stroke-width:2px,color:#0B2A5B
    classDef check fill:#FFF8E1,stroke:#E0A800,stroke-width:2px,color:#4A3800
    classDef bad fill:#FDECEC,stroke:#D64545,stroke-width:2px,color:#5B1111
    classDef good fill:#E6F8F0,stroke:#0F9D6B,stroke-width:2px,color:#063D29
    class S1,S2,S3,S4,S6,S7,S10,S11 step
    class S5,S8 check
    class ABORT,RB,FIX bad
    class START,S9,S12 good
```

---

## 14. Delivery timeline

The start date is a placeholder: Phase 1 begins when the checklist in [plan.md section 0](plan.md) is done.

```mermaid
%%{init: {"theme": "default", "themeVariables": {"fontSize": "18px"}, "gantt": {"useMaxWidth": false, "barHeight": 34, "barGap": 8, "fontSize": 16, "sectionFontSize": 18, "leftPadding": 260, "gridLineStartPadding": 40}}}%%
gantt
    title KKS Online admin rebuild — one developer, about 16 weeks
    dateFormat YYYY-MM-DD
    axisFormat %d %b

    section Safety first
    P0 Emergency security fixes + health-check split :p0, 2026-11-09, 5d
    P1 Setup check (after your checklist)           :p1, after p0, 5d

    section Infrastructure
    P2 Neon dev, R2, Cloudflare edge, performance    :p2, after p1, 14d
    P3 Foundations + admin sign-in + admin shell        :p3, after p2, 7d
    P4 Database groundwork + search indexes           :p4, after p3, 7d

    section Admin features
    P5 Catalog (products, variants, images)           :p5, after p4, 14d
    P6 AI descriptions (gpt-4o-mini)                  :p6, after p5, 4d
    P7 Orders (state machine, payments, invoice)      :p7, after p6, 14d
    P8 Inventory (receipts, adjustments, ledger)      :p8, after p7, 7d
    P9 Customers, reviews, settings, home             :p9, after p8, 7d

    section Go live
    P10 Hardening + k6 load test                      :p10, after p9, 7d
    Cutover go / no-go                                :milestone, m1, after p10, 0d
    P11 Production cutover (Supabase → Neon + R2)     :crit, p11, after p10, 7d

    section After go-live
    P12 Revenue dashboard + reports                   :p12, after p11, 7d
```
