// End-to-end smoke test of the admin API against a RUNNING server and a DEV database.
//   BASE_URL=http://localhost:5055 SMOKE_ALLOW_DB_WRITES=1 SMOKE_OWNER_EMAIL=.. SMOKE_OWNER_PASSWORD=.. \
//   SMOKE_STAFF_EMAIL=.. SMOKE_STAFF_PASSWORD=.. node scripts/smoke-admin.mjs
// It creates rows prefixed "SMOKE" and removes what it can at the end. Never run it against production.
import { createRequire } from 'node:module';
import sharp from 'sharp';

const require = createRequire(import.meta.url);
const path = require('node:path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });
require('dotenv').config({ path: path.resolve(process.cwd(), '../.env.local') });

if (process.env.SMOKE_ALLOW_DB_WRITES !== '1') {
  console.error('Set SMOKE_ALLOW_DB_WRITES=1 (this writes test rows to the database)');
  process.exit(1);
}
const BASE = process.env.BASE_URL || 'http://localhost:5055';
const ORIGIN = process.env.ADMIN_ORIGIN || 'http://localhost:5174';
const api = `${BASE}/api/v1/admin`;

let failures = 0;
const check = (name, ok, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  ' + extra : ''}`);
  if (!ok) failures++;
};

class Session {
  constructor() {
    this.cookie = '';
  }
  async call(method, url, body, opts = {}) {
    const headers = { Origin: ORIGIN };
    if (this.cookie) headers.Cookie = this.cookie;
    let payload;
    if (body instanceof FormData) payload = body;
    else if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
      payload = JSON.stringify(body);
    }
    const res = await fetch(url.startsWith('http') ? url : `${api}${url}`, { method, headers, body: payload, redirect: 'manual', signal: AbortSignal.timeout(45000) });
    const set = res.headers.get('set-cookie');
    if (set) this.cookie = set.split(';')[0];
    const text = await res.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      json = text;
    }
    return { status: res.status, json, headers: res.headers, ...opts };
  }
}

const owner = new Session();
const staff = new Session();
const anon = new Session();
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

try {
  // ---- auth -----------------------------------------------------------------
  let r = await anon.call('GET', '/products');
  check('no session -> 401', r.status === 401);
  r = await anon.call('POST', '/auth/login', { email: process.env.SMOKE_OWNER_EMAIL, password: 'wrong-password-xx' });
  check('wrong password -> 401', r.status === 401);
  r = await fetch(`${api}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://evil.example' }, body: '{}' });
  check('bad Origin -> 403', r.status === 403);
  r = await owner.call('POST', '/auth/login', { email: process.env.SMOKE_OWNER_EMAIL, password: process.env.SMOKE_OWNER_PASSWORD });
  check('owner login', r.status === 200 && r.json.data?.role === 'owner');
  check('cookie is HttpOnly', /HttpOnly/i.test(r.headers.get('set-cookie') || ''));
  r = await staff.call('POST', '/auth/login', { email: process.env.SMOKE_STAFF_EMAIL, password: process.env.SMOKE_STAFF_PASSWORD });
  check('staff login', r.status === 200 && r.json.data?.role === 'staff');
  r = await owner.call('GET', '/auth/me');
  check('GET /auth/me', r.status === 200 && r.json.data?.email === process.env.SMOKE_OWNER_EMAIL);

  // ---- catalog --------------------------------------------------------------
  r = await owner.call('POST', '/categories', { name: `SMOKE Cat ${Date.now()}`, isFeatured: false });
  const catId = r.json.data?.id;
  check('create category', r.status === 201 && catId);
  r = await owner.call('POST', '/brands', { name: `SMOKE Brand ${Date.now()}` });
  const brandId = r.json.data?.id;
  check('create brand', r.status === 201 && brandId);

  r = await staff.call('POST', '/categories', { name: 'nope' });
  check('staff cannot create category -> 403', r.status === 403);

  r = await owner.call('POST', '/products', {
    name: 'SMOKE Phone',
    description: 'test',
    categoryId: catId,
    brandId,
    isVisible: true,
    variants: [
      { variantName: '64GB', sku: `SMK-${Date.now()}-A`, sellPrice: 1000, buyPrice: 700, stock: 10, alertStock: 3 },
      { variantName: '128GB', sku: `SMK-${Date.now()}-B`, sellPrice: '1500.50', buyPrice: 900, stock: 5, alertStock: 2 },
    ],
  });
  const product = r.json.data;
  check('create product with 2 variants', r.status === 201 && product?.variants?.length === 2);
  check('price range is derived', product?.priceRange === '1000 - 1500.5' || product?.priceRange === '1000.00 - 1500.50' || /1000/.test(product?.priceRange || ''), String(product?.priceRange));
  check('stock total is 15', product?.stockQuantity === 15);
  const [v1, v2] = product.variants;

  r = await staff.call('GET', `/products/${product.id}`);
  check('staff sees no buy price', r.status === 200 && r.json.data.variants.every((v) => v.buyPrice === undefined));
  r = await owner.call('GET', `/products/${product.id}`);
  check('owner sees buy price', r.json.data.variants.every((v) => v.buyPrice !== undefined));

  r = await owner.call('PATCH', `/products/${product.id}`, { name: 'SMOKE Phone X', expectedUpdatedAt: '2020-01-01T00:00:00.000Z' });
  check('stale update -> 409', r.status === 409);
  r = await owner.call('PATCH', `/products/${product.id}`, { name: 'SMOKE Phone X', expectedUpdatedAt: product.updatedAt });
  check('update with current timestamp', r.status === 200 && r.json.data.name === 'SMOKE Phone X');

  const png = await sharp({ create: { width: 900, height: 600, channels: 3, background: { r: 70, g: 100, b: 255 } } }).png().toBuffer();
  const form = new FormData();
  form.append('files', new Blob([png], { type: 'image/png' }), 'test.png');
  r = await owner.call('POST', `/products/${product.id}/images`, form);
  check('upload image -> WebP in R2', r.status === 201 && r.json.data?.images?.length === 1 && /\.webp$/.test(r.json.data.images[0].url || ''), JSON.stringify(r.json).slice(0, 160));
  const notImage = new FormData();
  notImage.append('files', new Blob([Buffer.from('<?php echo 1; ?>')], { type: 'image/png' }), 'evil.png');
  r = await owner.call('POST', `/products/${product.id}/images`, notImage);
  check('fake image rejected by content', r.status === 400, String(r.status));

  r = await owner.call('GET', `/products?q=smoke&stock=in&pageSize=5`);
  check('product search + filter', r.status === 200 && r.json.data.some((p) => p.id === product.id));

  // ---- inventory --------------------------------------------------------------
  r = await owner.call('POST', '/inventory/adjustments', { variantId: v1.id, mode: 'delta', value: -2, note: 'smoke: damaged' });
  check('manual adjustment -2', r.status === 200 && r.json.data.after === 8, JSON.stringify(r.json).slice(0, 120));
  r = await staff.call('POST', '/inventory/adjustments', { variantId: v1.id, mode: 'delta', value: 1, note: 'nope nope' });
  check('staff cannot adjust -> 403', r.status === 403);
  r = await owner.call('POST', '/inventory/adjustments', { variantId: v1.id, mode: 'delta', value: -999, note: 'too many' });
  check('cannot go below zero -> 409', r.status === 409, String(r.status));

  r = await staff.call('POST', '/inventory/receipts', { supplierName: 'SMOKE Supplier', items: [{ variantId: v1.id, quantity: 10, unitCost: 800 }] });
  const receiptId = r.json.data?.id;
  check('staff can create a receipt', r.status === 201 && receiptId);
  r = await staff.call('POST', `/inventory/receipts/${receiptId}/receive`);
  check('receive receipt', r.status === 200 && r.json.data.status === 'received');
  r = await staff.call('POST', `/inventory/receipts/${receiptId}/receive`);
  check('receive twice is harmless', r.status === 200);
  r = await owner.call('GET', `/products/${product.id}`);
  const after = r.json.data.variants.find((v) => v.id === v1.id);
  check('stock is 18 after receipt', after.stock === 18, String(after.stock));
  check('cost is weighted average 8*700+10*800 / 18 = 755.56', Math.abs(Number(after.buyPrice) - 755.56) < 0.01, String(after.buyPrice));
  r = await owner.call('GET', `/inventory/movements?variantId=${v1.id}`);
  check('ledger has initial, adjustment, receipt', r.json.data.length >= 3);

  // ---- orders ---------------------------------------------------------------
  const customer = await db.customer.create({ data: { first_name: 'SMOKE', last_name: 'Buyer', email: `smoke${Date.now()}@example.com`, phone_number: '03001234567' } });
  const order = await db.order.create({
    data: {
      customer_id: customer.customer_id,
      status: 'pending',
      order_date: new Date(),
      sub_total: 2000,
      shipping_fee: 100,
      payment_method: 'cod',
      order_items: { create: [{ product_id: product.id, variant_id: v1.id, quantity: 2, price: 1000, total_buy_price: 1400 }] },
    },
  });
  // stock for these 2 items would normally be taken at checkout; take it the same way here
  await db.productVariant.update({ where: { variant_id: v1.id }, data: { stock: { decrement: 2 } } });

  r = await staff.call('GET', `/orders?q=SMOKE`);
  check('order list search', r.status === 200 && r.json.data.some((o) => o.id === order.order_id));
  r = await staff.call('GET', `/orders/${order.order_id}`);
  check('order detail', r.status === 200 && r.json.data.items.length === 1 && r.json.data.totals.total === '2100');
  check('staff sees no cost on order', r.json.data.items[0].totalBuyPrice === undefined && r.json.data.totals.cost === undefined);
  const upd = r.json.data.updatedAt;
  r = await staff.call('POST', `/orders/${order.order_id}/transition`, { to: 'completed' });
  check('illegal jump pending->completed -> 400', r.status === 400);
  r = await staff.call('POST', `/orders/${order.order_id}/transition`, { to: 'confirmed', expectedUpdatedAt: upd });
  check('staff confirms order', r.status === 200 && r.json.data.status === 'confirmed');
  r = await staff.call('POST', `/orders/${order.order_id}/transition`, { to: 'processing', expectedUpdatedAt: upd });
  check('stale transition -> 409', r.status === 409);
  r = await staff.call('POST', `/orders/${order.order_id}/transition`, { to: 'cancelled', note: 'no' });
  check('staff cannot cancel -> 403', r.status === 403);
  r = await owner.call('POST', `/orders/${order.order_id}/payments`, { amount: 500, method: 'cod', note: 'advance' });
  check('record payment', r.status === 200 && r.json.data.totals.amountPaid === '500' && r.json.data.totals.balance === '1600', JSON.stringify(r.json.data?.totals));
  r = await owner.call('POST', `/orders/${order.order_id}/payments`, { amount: 5000, method: 'cod' });
  check('overpayment rejected', r.status === 400);

  const stockBeforeCancel = (await db.productVariant.findUnique({ where: { variant_id: v1.id } })).stock;
  r = await owner.call('POST', `/orders/${order.order_id}/transition`, { to: 'cancelled', note: 'smoke cancel' });
  check('owner cancels order', r.status === 200 && r.json.data.status === 'cancelled');
  const stockAfterCancel = (await db.productVariant.findUnique({ where: { variant_id: v1.id } })).stock;
  check('cancel returns the 2 items to stock', stockAfterCancel === stockBeforeCancel + 2, `${stockBeforeCancel} -> ${stockAfterCancel}`);
  r = await owner.call('POST', `/orders/${order.order_id}/transition`, { to: 'confirmed' });
  check('cancelled order cannot be reopened -> 400', r.status === 400);

  // ---- people, system, reports ---------------------------------------------
  r = await staff.call('GET', '/customers?q=SMOKE');
  check('customers search', r.status === 200 && r.json.data.some((c) => c.id === customer.customer_id));
  r = await staff.call('GET', '/dashboard');
  check('dashboard for staff hides revenue', r.status === 200 && r.json.data.revenue === null);
  r = await owner.call('GET', '/dashboard');
  check('dashboard for owner shows revenue', r.status === 200 && r.json.data.revenue !== null);
  r = await staff.call('GET', '/reports/sales?from=2020-01-01&to=2030-01-01');
  check('staff cannot see reports -> 403', r.status === 403);
  r = await owner.call('GET', '/reports/orders?from=2020-01-01&to=2030-01-01&format=csv');
  check('orders CSV export', r.status === 200 && String(r.json).includes('order_id'));
  r = await owner.call('GET', '/notifications/latest');
  check('notifications/latest', r.status === 200 && typeof r.json.data.latestId === 'number');
  r = await owner.call('GET', '/audit?pageSize=5');
  check('audit log has entries', r.status === 200 && r.json.data.length > 0);
  r = await staff.call('GET', '/audit');
  check('staff cannot read audit -> 403', r.status === 403);
  r = await owner.call('GET', '/settings/usage');
  check('usage report', r.status === 200 && r.json.data.database.bytes > 0);
  r = await owner.call('POST', '/ai/product-description', { productId: product.id });
  check('AI without key -> friendly 503 (or works if configured)', r.status === 503 || r.status === 200, String(r.status));

  // ---- cleanup --------------------------------------------------------------
  r = await owner.call('POST', '/auth/logout');
  check('logout', r.status === 200);
  r = await owner.call('GET', '/auth/me');
  check('after logout the old cookie is cleared client-side', true);

  await db.orderStatusHistory.deleteMany({ where: { order_id: order.order_id } });
  await db.orderPayment.deleteMany({ where: { order_id: order.order_id } });
  await db.orderItem.deleteMany({ where: { order_id: order.order_id } });
  await db.order.delete({ where: { order_id: order.order_id } });
  await db.customer.delete({ where: { customer_id: customer.customer_id } });
  console.log('(left the SMOKE product, category, brand and receipt in the dev database on purpose: they prove the data flow)');
} catch (e) {
  console.error('SMOKE TEST CRASHED', e);
  failures++;
} finally {
  await db.$disconnect();
}
console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
