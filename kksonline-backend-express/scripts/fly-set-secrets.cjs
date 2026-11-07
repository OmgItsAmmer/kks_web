// Sets the production secrets on the Fly app from the local env files. Values are never printed.
//
//   node scripts/fly-set-secrets.cjs <fly-app> [--apply] [--admin-origin https://admin.kks-online.com]
//
// Reads APP_ENV=production files (.env.production.local, .env.local, .env.production, .env), so put the
// production Neon URLs in `.env.production.local` (gitignored, never copied into the Docker image).
// Dry run by default: lists the names that would be set. Secrets are staged; `fly deploy` applies them.
//
// JWT_SECRET, GOOGLE_CLIENT_ID and ALLOWED_ORIGINS are NOT overwritten when the app already has them, so
// customers who are signed in on the live shop stay signed in.
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');

process.env.APP_ENV = 'production';
const { loadEnv } = require('./load-env.cjs');
const info = loadEnv();

const app = process.argv[2];
const APPLY = process.argv.includes('--apply');
const oi = process.argv.indexOf('--admin-origin');
const ADMIN_ORIGIN = oi > -1 ? process.argv[oi + 1] : 'https://admin.kks-online.com';
if (!app || app.startsWith('--')) {
  console.error('Usage: node scripts/fly-set-secrets.cjs <fly-app> [--apply] [--admin-origin <url>]');
  process.exit(1);
}

const e = process.env;
// Keys that are the same in every environment may come from .env.development when production lacks them.
// Database URLs and the NEON branch are never borrowed.
try {
  const dev = require('dotenv').parse(require('node:fs').readFileSync(path.resolve(__dirname, '..', '.env.development')));
  for (const k of ['JWT_SECRET', 'GOOGLE_CLIENT_ID', 'R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_PUBLIC_BUCKET', 'R2_PRIVATE_BUCKET', 'ASSET_BASE_URL', 'CLOUDFLARE_ZONE_ID', 'CLOUDFLARE_API_TOKEN', 'ADMIN_ACCOUNTS', 'OPENAI_API_KEY', 'NEON_API_KEY']) {
    if (!e[k] && dev[k]) e[k] = dev[k];
  }
} catch {}
if (info.neonBranch === 'dev' && !e.ALLOW_DEV_BRANCH_IN_PRODUCTION) {
  // .env.local at the repo root is written by `neon init` for the dev branch.
  console.error('Refusing: the database URLs in the loaded env files belong to the Neon dev branch.');
  console.error('Put the production branch URLs in kksonline-backend-express/.env.production.local (NEON_BRANCH=production).');
  process.exit(1);
}

const run = (args) => spawnSync('fly', args, { encoding: 'utf8' });
const existing = new Set(
  run(['secrets', 'list', '-a', app, '--json']).stdout
    ? JSON.parse(run(['secrets', 'list', '-a', app, '--json']).stdout || '[]').map((s) => s.name ?? s.Name)
    : [],
);

const keepIfPresent = ['JWT_SECRET', 'GOOGLE_CLIENT_ID', 'ALLOWED_ORIGINS'];
const fresh = { ADMIN_SESSION_SECRET: () => crypto.randomBytes(48).toString('hex'), JOBS_SECRET: () => crypto.randomBytes(32).toString('hex') };

const wanted = {
  DATABASE_URL: e.DATABASE_URL,
  DATABASE_URL_UNPOOLED: e.DATABASE_URL_UNPOOLED,
  JWT_SECRET: e.JWT_SECRET,
  GOOGLE_CLIENT_ID: e.GOOGLE_CLIENT_ID,
  ALLOWED_ORIGINS: e.ALLOWED_ORIGINS,
  R2_ACCOUNT_ID: e.R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID: e.R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY: e.R2_SECRET_ACCESS_KEY,
  R2_PUBLIC_BUCKET: e.R2_PUBLIC_BUCKET,
  R2_PRIVATE_BUCKET: e.R2_PRIVATE_BUCKET,
  ASSET_BASE_URL: e.ASSET_BASE_URL,
  CLOUDFLARE_ZONE_ID: e.CLOUDFLARE_ZONE_ID,
  CLOUDFLARE_API_TOKEN: e.CLOUDFLARE_API_TOKEN,
  ADMIN_ACCOUNTS: e.ADMIN_ACCOUNTS,
  ADMIN_ORIGIN,
  OPENAI_API_KEY: e.OPENAI_API_KEY,
  NEON_API_KEY: e.NEON_API_KEY,
};

const toSet = {};
const skipped = [];
for (const [k, v] of Object.entries(wanted)) {
  if (keepIfPresent.includes(k) && existing.has(k)) {
    skipped.push(`${k} (kept as is)`);
    continue;
  }
  if (!v) {
    if (['OPENAI_API_KEY', 'NEON_API_KEY'].includes(k)) continue; // optional
    if (keepIfPresent.includes(k)) {
      console.error(`Missing ${k}: the app does not have it and the local env does not either.`);
      process.exit(1);
    }
    console.error(`Missing locally: ${k}`);
    process.exit(1);
  }
  toSet[k] = v;
}
// Keep an existing session/jobs secret on re-runs; create them the first time only.
for (const [k, make] of Object.entries(fresh)) {
  if (e[k]) toSet[k] = e[k];
  else if (!existing.has(k)) toSet[k] = make();
  else skipped.push(`${k} (kept as is)`);
}

const host = (u) => {
  try {
    return new URL(u).host;
  } catch {
    return 'invalid';
  }
};
console.log(`App: ${app} | env files: ${info.loadedFiles.map((f) => path.basename(f)).join(', ')} | neon branch: ${info.neonBranch ?? 'unknown'}`);
console.log(`Database host: ${host(toSet.DATABASE_URL)}`);
console.log(`Will set: ${Object.keys(toSet).join(', ')}`);
if (skipped.length) console.log(`Not changed: ${skipped.join(', ')}`);
if (!APPLY) {
  console.log('\nDry run only. Add --apply to stage these on Fly.');
  process.exit(0);
}
const r = run(['secrets', 'set', '--stage', '-a', app, ...Object.entries(toSet).map(([k, v]) => `${k}=${v}`)]);
console.log((r.stdout + r.stderr).replace(/=\S+/g, '=<hidden>').trim());
process.exit(r.status || 0);
