// npm run preflight: checks that every account and key from plan section 0 works. Never prints a secret.
const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../../.env.local') });

const results = [];
const add = (name, status, detail = '') => {
  results.push({ name, status, detail });
  const icon = status === 'ok' ? '✅' : status === 'warn' ? '⚠️ ' : status === 'skip' ? '⏭️ ' : '❌';
  console.log(`${icon} ${name}${detail ? `  ${detail}` : ''}`);
};
const has = (k) => Boolean((process.env[k] || '').trim());
const withTimeout = (p, ms, label) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(`${label} timed out after ${ms / 1000}s`)), ms))]);

const checkEnvPresence = () => {
  const groups = {
    'Neon database': ['DATABASE_URL', 'DATABASE_URL_UNPOOLED'],
    'R2 storage': ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_PUBLIC_BUCKET', 'R2_PRIVATE_BUCKET', 'ASSET_BASE_URL'],
    'Cloudflare cache': ['CLOUDFLARE_ZONE_ID', 'CLOUDFLARE_API_TOKEN'],
    'Customer sign-in (existing app)': ['JWT_SECRET', 'GOOGLE_CLIENT_ID'],
    'Admin sign-in': ['ADMIN_ACCOUNTS', 'ADMIN_SESSION_SECRET'],
    'Scheduled jobs': ['JOBS_SECRET'],
  };
  for (const [name, keys] of Object.entries(groups)) {
    const missing = keys.filter((k) => !has(k));
    add(`Settings: ${name}`, missing.length === 0 ? 'ok' : 'fail', missing.length ? `missing ${missing.join(', ')}` : '');
  }
  add('Settings: OpenAI (needed from Phase 6)', has('OPENAI_API_KEY') ? 'ok' : 'warn', has('OPENAI_API_KEY') ? '' : 'OPENAI_API_KEY not set yet');
  add('Settings: Neon usage key (optional)', has('NEON_API_KEY') ? 'ok' : 'warn', has('NEON_API_KEY') ? '' : 'NEON_API_KEY not set');
};

const checkAdminAccounts = () => {
  if (!has('ADMIN_ACCOUNTS')) return;
  try {
    const list = JSON.parse(process.env.ADMIN_ACCOUNTS);
    const ok = Array.isArray(list) && list.length > 0 && list.every((a) => a.email && a.name && ['owner', 'manager', 'staff'].includes(a.role) && /^\$2[aby]\$/.test(a.passwordHash || ''));
    add('Admin accounts format', ok ? 'ok' : 'fail', ok ? `${list.length} account(s), roles: ${list.map((a) => a.role).join(', ')}` : 'each account needs email, name, role and a bcrypt passwordHash (npm run admin:hash)');
    if (ok && !list.some((a) => a.role === 'owner')) add('Admin accounts: at least one owner', 'fail', 'no owner account');
  } catch {
    add('Admin accounts format', 'fail', 'ADMIN_ACCOUNTS is not valid JSON (it must be on one line)');
  }
  if (has('ADMIN_SESSION_SECRET') && process.env.ADMIN_SESSION_SECRET.length < 32) add('Admin session secret length', 'fail', 'use at least 32 characters');
};

const checkDatabase = async () => {
  if (!has('DATABASE_URL')) return;
  const { PrismaClient } = require('@prisma/client');
  const variants = [
    ['Neon pooled connection', process.env.DATABASE_URL, true],
    ['Neon direct connection', process.env.DATABASE_URL_UNPOOLED, false],
  ];
  for (const [name, raw, pooled] of variants) {
    if (!raw) continue;
    const u = new URL(raw);
    u.searchParams.delete('channel_binding');
    if (pooled && u.hostname.includes('-pooler')) u.searchParams.set('pgbouncer', 'true');
    const prisma = new PrismaClient({ datasources: { db: { url: u.toString() } } });
    try {
      const started = Date.now();
      const rows = await withTimeout(prisma.$queryRaw`select version() as v, pg_database_size(current_database()) as bytes`, 40000, name);
      const tables = await prisma.$queryRaw`select count(*)::int as n from information_schema.tables where table_schema = 'public'`;
      add(name, 'ok', `${String(rows[0].v).split(',')[0]} · ${(Number(rows[0].bytes) / 1048576).toFixed(1)} MB · ${tables[0].n} tables · ${Date.now() - started} ms`);
    } catch (e) {
      add(name, 'fail', String(e.message).split('\n').filter(Boolean).pop());
    } finally {
      await prisma.$disconnect();
    }
  }
};

const checkR2 = async () => {
  if (!(has('R2_ACCOUNT_ID') && has('R2_ACCESS_KEY_ID') && has('R2_SECRET_ACCESS_KEY'))) return;
  const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
  if (!/^[0-9a-f]{32}$/.test(process.env.R2_ACCOUNT_ID)) add('R2 account id shape', 'fail', 'should be 32 hex characters');
  if (!/^[0-9a-f]{32}$/.test(process.env.R2_ACCESS_KEY_ID)) add('R2 access key id shape', 'fail', 'should be 32 hex characters (is it swapped with the secret?)');
  const client = new S3Client({ region: 'auto', endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`, credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY } });
  for (const bucket of [process.env.R2_PUBLIC_BUCKET || 'kks-public', process.env.R2_PRIVATE_BUCKET || 'kks-private']) {
    try {
      await withTimeout(client.send(new PutObjectCommand({ Bucket: bucket, Key: '_preflight.txt', Body: 'ok' })), 20000, bucket);
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: '_preflight.txt' }));
      add(`R2 bucket ${bucket}: write and delete`, 'ok');
    } catch (e) {
      add(`R2 bucket ${bucket}: write and delete`, 'fail', `${e.name}: ${String(e.message).slice(0, 90)}`);
    }
  }
};

const checkCdn = async () => {
  if (!has('ASSET_BASE_URL')) return;
  const base = process.env.ASSET_BASE_URL.replace(/\/+$/, '');
  try {
    const key = `_cdn-check-${Date.now()}.txt`;
    const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
    const client = new S3Client({ region: 'auto', endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`, credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY } });
    const bucket = process.env.R2_PUBLIC_BUCKET || 'kks-public';
    await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: 'cdn-ok', ContentType: 'text/plain' }));
    try {
      const res = await withTimeout(fetch(`${base}/${key}`), 20000, 'CDN');
      const body = res.ok ? await res.text() : '';
      add(`CDN ${base}`, body === 'cdn-ok' ? 'ok' : 'fail', body === 'cdn-ok' ? `serves files (cache: ${res.headers.get('cf-cache-status') || 'n/a'})` : `HTTP ${res.status}: connect the custom domain to ${bucket} (runbooks/05, step 2)`);
    } finally {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    }
  } catch (e) {
    add(`CDN ${base}`, 'fail', /ENOTFOUND|fetch failed/.test(String(e.message) + String(e.cause?.code)) ? 'address does not exist yet: connect the custom domain to the public bucket (runbooks/05, step 2)' : String(e.message).slice(0, 100));
  }
};

const checkCloudflare = async () => {
  if (!(has('CLOUDFLARE_API_TOKEN') && has('CLOUDFLARE_ZONE_ID'))) return;
  try {
    const res = await withTimeout(fetch(`https://api.cloudflare.com/client/v4/zones/${process.env.CLOUDFLARE_ZONE_ID}`, { headers: { Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}` } }), 20000, 'Cloudflare');
    const j = await res.json();
    add('Cloudflare zone and token', j.success && j.result?.status === 'active' ? 'ok' : 'fail', j.success ? `${j.result.name} is ${j.result.status}` : (j.errors?.[0]?.message ?? `HTTP ${res.status}`));
  } catch (e) {
    add('Cloudflare zone and token', 'fail', String(e.message).slice(0, 100));
  }
};

const checkOpenAI = async () => {
  if (!has('OPENAI_API_KEY')) return;
  try {
    const OpenAI = require('openai');
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 20000, maxRetries: 0 });
    const r = await client.chat.completions.create({ model: process.env.OPENAI_MODEL || 'gpt-4o-mini', max_tokens: 1, messages: [{ role: 'user', content: 'Say OK' }] });
    add('OpenAI key', 'ok', `model ${r.model}`);
  } catch (e) {
    add('OpenAI key', 'fail', String(e.message).slice(0, 100));
  }
};

const checkSupabase = async () => {
  if (!has('SUPABASE_DATABASE_URL')) {
    add('Old Supabase read access (migration)', 'skip', 'SUPABASE_DATABASE_URL not set (only needed in Phase 2)');
    return;
  }
  try {
    const { Client } = require('pg');
    const c = new Client({ connectionString: process.env.SUPABASE_DATABASE_URL, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 20000 });
    await c.connect();
    const r = await c.query('select pg_size_pretty(pg_database_size(current_database())) as size');
    await c.end();
    add('Old Supabase read access (migration)', 'ok', `database size ${r.rows[0].size}`);
  } catch (e) {
    add('Old Supabase read access (migration)', 'fail', String(e.message).slice(0, 100));
  }
};

(async () => {
  console.log('KKS preflight (values are never printed)\n');
  checkEnvPresence();
  checkAdminAccounts();
  await checkDatabase();
  await checkR2();
  await checkCdn();
  await checkCloudflare();
  await checkOpenAI();
  await checkSupabase();
  const failed = results.filter((r) => r.status === 'fail');
  console.log(`\n${failed.length === 0 ? '✅ Ready.' : `❌ ${failed.length} problem(s) to fix.`}  (${results.filter((r) => r.status === 'ok').length} ok, ${results.filter((r) => r.status === 'warn').length} warnings)`);
  process.exitCode = failed.length === 0 ? 0 : 1;
})();
