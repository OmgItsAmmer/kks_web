// Copies the store's data from the OLD Supabase database into the NEW Neon database (plan Phases 2 and 11).
//
//   Dry run (default, reads only):   node scripts/migrate-from-supabase.mjs
//   Really copy into an EMPTY target: node scripts/migrate-from-supabase.mjs --apply
//   Wipe the target tables first:     node scripts/migrate-from-supabase.mjs --apply --reset   (dev branches only)
//
// Source: SUPABASE_DATABASE_URL (read-only is enough).  Target: DATABASE_URL_UNPOOLED.
// Only the tables the store needs are copied ("Keep" in docs/db-triage.md). The ERP/POS tables are left behind;
// archive them with `pg_dump` (see runbooks/13). Columns that no longer exist in the new schema are dropped
// automatically because only columns present on BOTH sides are copied.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const path = require('node:path');
const { loadEnv } = require('./load-env.cjs');

const envInfo = loadEnv();
console.log(`[Migrate From Supabase] Active environment: ${envInfo.env}${envInfo.neonBranch ? ` (Neon branch: ${envInfo.neonBranch})` : ''}`);

const isProd = envInfo.env === 'production' || process.env.APP_ENV === 'production' || envInfo.neonBranch === 'production';
const hasConfirmedProd = process.env.CONFIRM_PRODUCTION === 'yes';

if (isProd && process.argv.includes('--reset')) {
  console.error('❌ [SAFETY GUARD] --reset is prohibited against production or production Neon branch!');
  process.exit(1);
}

if (isProd && process.argv.includes('--apply') && !hasConfirmedProd) {
  console.error('❌ [SAFETY GUARD] Applying migrations against production requires explicit confirmation.');
  console.error('To proceed, run with CONFIRM_PRODUCTION=yes');
  process.exit(1);
}

const { Client } = require('pg');

const APPLY = process.argv.includes('--apply');
const RESET = process.argv.includes('--reset');

const sourceUrl = process.env.SUPABASE_DATABASE_URL;
const targetUrl = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!sourceUrl) throw new Error('SUPABASE_DATABASE_URL is not set');
if (!targetUrl) throw new Error('DATABASE_URL_UNPOOLED is not set');

const clean = (u) => {
  const x = new URL(u);
  x.searchParams.delete('channel_binding');
  return x.toString();
};
const src = new Client({ connectionString: clean(sourceUrl), ssl: { rejectUnauthorized: false } });
const dst = new Client({ connectionString: clean(targetUrl), ssl: { rejectUnauthorized: false } });

/** Copy order matters: parents before children. `serial` is the primary-key column to re-sync. */
const TABLES = [
  { name: 'shop', serial: 'shop_id' },
  { name: 'app_versions', serial: 'id' },
  { name: 'customers', serial: 'customer_id' },
  { name: 'categories', serial: 'category_id' },
  { name: 'brands', serial: 'brandID' },
  { name: 'products', serial: 'product_id' },
  { name: 'product_variants', serial: 'variant_id', fix: (r) => ({ ...r, stock: Math.max(r.stock ?? 0, 0) }) },
  { name: 'images', serial: 'image_id' },
  { name: 'image_entity', serial: 'image_entity_id' },
  { name: 'addresses', serial: 'address_id' },
  { name: 'order_addresses', serial: 'order_address_id' },
  { name: 'orders', serial: 'order_id', fix: (r) => ({ ...r, created_at: r.order_date ?? new Date(), updated_at: r.updated_at ?? new Date() }) },
  { name: 'order_items' },
  { name: 'cart', serial: 'cart_id' },
  { name: 'wishlist', serial: 'wishlist_id' },
  { name: 'reviews', serial: 'review_id' },
  { name: 'product_discounts', serial: 'discount_id' },
  { name: 'invoice_coupons', serial: 'coupon_id' },
  { name: 'notifications', serial: 'notification_id', skipOptionalColumns: ['installment_plan_id'] },
  { name: 'collections', serial: 'collection_id', optional: true },
  { name: 'collection_items', serial: 'collection_item_id', optional: true },
  { name: 'collection_cart', serial: 'collection_cart_id', optional: true },
  { name: 'collection_cart_items', serial: 'collection_cart_item_id', optional: true },
];

const q = (id) => `"${id.replace(/"/g, '""')}"`;
const columnsOf = async (client, table) => {
  const r = await client.query(
    `select column_name from information_schema.columns where table_schema = 'public' and table_name = $1 order by ordinal_position`,
    [table]
  );
  return r.rows.map((x) => x.column_name);
};
const exists = async (client, table) => {
  const r = await client.query(`select 1 from information_schema.tables where table_schema = 'public' and table_name = $1`, [table]);
  return r.rowCount > 0;
};

const report = [];
const log = (m) => console.log(m);

try {
  await src.connect();
  await dst.connect();
  log(`${APPLY ? 'APPLY' : 'DRY RUN'}${RESET ? ' with RESET' : ''}: copying ${TABLES.length} tables\n`);

  const targetHasData = (await dst.query('select (select count(*) from orders) as o, (select count(*) from products) as p')).rows[0];
  if (APPLY && !RESET && (Number(targetHasData.o) > 0 || Number(targetHasData.p) > 0)) {
    throw new Error('The target already has products or orders. Use --reset only on a dev branch, or start from an empty database.');
  }
  if (APPLY && RESET) {
    log('Wiping target tables...');
    await dst.query(
      `truncate table ${[...TABLES.map((t) => t.name), 'inventory_movements', 'order_payments', 'order_status_history', 'purchase_items', 'purchases', 'inventory_reservations', 'admin_audit_log'].map(q).join(', ')} restart identity cascade`
    );
  }

  if (APPLY) await dst.query('begin');

  for (const t of TABLES) {
    if (!(await exists(src, t.name))) {
      log(`- ${t.name}: not in the source${t.optional ? ' (optional), skipped' : ' !!'}`);
      report.push({ table: t.name, copied: 0, note: 'missing in source' });
      continue;
    }
    const srcCols = await columnsOf(src, t.name);
    const dstCols = await columnsOf(dst, t.name);
    const cols = srcCols.filter((c) => dstCols.includes(c));
    const dropped = srcCols.filter((c) => !dstCols.includes(c));
    const rows = (await src.query(`select ${cols.map(q).join(', ')} from ${q(t.name)}`)).rows;
    log(`- ${t.name}: ${rows.length} rows${dropped.length ? `   (dropping old columns: ${dropped.join(', ')})` : ''}`);
    report.push({ table: t.name, copied: rows.length, dropped });
    if (!APPLY || rows.length === 0) continue;

    const finalCols = [...new Set([...cols, ...(t.fix ? Object.keys(t.fix(Object.fromEntries(cols.map((c) => [c, null])))) : [])])].filter((c) => dstCols.includes(c));
    for (let i = 0; i < rows.length; i += 400) {
      const chunk = rows.slice(i, i + 400).map((r) => (t.fix ? t.fix(r) : r));
      const params = [];
      const tuples = chunk.map((r) => `(${finalCols.map((c) => { params.push(r[c] === undefined ? null : r[c]); return `$${params.length}`; }).join(', ')})`);
      await dst.query(`insert into ${q(t.name)} (${finalCols.map(q).join(', ')}) values ${tuples.join(', ')}`, params);
    }
    if (t.serial) {
      await dst.query(`select setval(pg_get_serial_sequence('${q(t.name)}', '${t.serial}'), greatest(coalesce((select max(${q(t.serial)}) from ${q(t.name)}), 1), 1))`);
    }
  }

  if (APPLY) {
    log('\nBuilding derived data...');
    // Numeric price range for sorting and filtering, and totals (plan 4.10 and 6.2)
    await dst.query(`
      update products p set
        min_price = s.min_p, max_price = s.max_p,
        stock_quantity = s.total_stock,
        price_range = case when s.min_p is null then '--' when s.min_p = s.max_p then trim(to_char(s.min_p, 'FM999999990.00'), '.0') else trim(to_char(s.min_p,'FM999999990.00'),'.0') || ' - ' || trim(to_char(s.max_p,'FM999999990.00'),'.0') end
      from (select product_id, min(sell_price) filter (where is_visible is not false) as min_p, max(sell_price) filter (where is_visible is not false) as max_p, coalesce(sum(stock),0) as total_stock
            from product_variants group by product_id) s
      where s.product_id = p.product_id`);
    // Opening balance: one ledger row per variant that has stock, so the ledger starts out matching reality
    await dst.query(`
      insert into inventory_movements (variant_id, product_id, delta, stock_after, reason, ref_type, note, actor)
      select variant_id, product_id, stock, stock, 'initial', 'migration', 'Opening balance at migration', 'migration'
      from product_variants where coalesce(stock,0) > 0`);
    // Finished orders are treated as paid in full so they do not show a balance due
    await dst.query(`
      insert into order_payments (order_id, amount, method, note, received_by)
      select order_id, sub_total + coalesce(tax,0) + coalesce(shipping_fee,0) - coalesce(discount,0), coalesce(payment_method, 'cod'), 'Migrated: completed order treated as paid', 'migration'
      from orders where status in ('completed','delivered')`);
    await dst.query('commit');
    log('Committed.');
  } else {
    log('\nDry run only: nothing was written. Re-run with --apply to copy.');
  }

  const total = report.reduce((s, r) => s + r.copied, 0);
  log(`\n${total} rows ${APPLY ? 'copied' : 'would be copied'}.`);
} catch (e) {
  if (APPLY) await dst.query('rollback').catch(() => undefined);
  console.error('\nFAILED:', e.message);
  process.exitCode = 1;
} finally {
  await src.end().catch(() => undefined);
  await dst.end().catch(() => undefined);
}
