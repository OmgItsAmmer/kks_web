// Live check runner.
//
//   branch mode (full, destructive):   LIVE_DATABASE_URL=... LIVE_DATABASE_URL_UNPOOLED=... LIVE_BRANCH_NAME=... \
//                                      node tests/live/run.mjs --mode branch
//   production mode (read-only):       node tests/live/run.mjs --mode prod
//
// Branch mode starts the real backend code on a local port against a TEMPORARY copy of the production database
// (a Neon branch) and runs every case in tests/live/cases/. It refuses to run if the database host is one of the
// production hosts. Production mode only runs cases marked "readonly": true, against the live API.
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';
import { createRequire } from 'node:module';
import { loadSuites, runSuites } from './engine.mjs';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const argv = process.argv.slice(2);
const arg = (name, dflt) => {
  const i = argv.indexOf(name);
  return i > -1 ? argv[i + 1] : dflt;
};
const mode = arg('--mode', 'branch');
const only = arg('--only');
const reportPath = arg('--report', path.join(here, 'last-report.json'));

const sharp = require(path.join(root, 'node_modules/sharp'));
const jwt = require(path.join(root, 'node_modules/jsonwebtoken'));
const bcrypt = require(path.join(root, 'node_modules/bcryptjs'));
const dotenv = require(path.join(root, 'node_modules/dotenv'));
const { Client } = require(path.join(root, 'node_modules/pg'));

const makeImage = (w, h) => sharp({ create: { width: w, height: h, channels: 3, background: { r: 70, g: 100, b: 255 } } }).png().toBuffer();
const readEnv = (file) => {
  try { return dotenv.parse(fs.readFileSync(path.join(root, file))); } catch { return {}; }
};
const hostOf = (u) => { try { return new URL(u).host.replace('-pooler', ''); } catch { return ''; } };

const suites = loadSuites(path.join(here, 'cases'));
const runId = crypto.randomBytes(3).toString('hex');
let server;
let db;

const finish = async (code) => {
  try { await db?.end(); } catch {}
  if (server) server.kill();
  process.exit(code);
};

const summarize = (results) => {
  const by = {};
  for (const r of results) {
    by[r.suite] ||= { pass: 0, fail: 0, skip: 0 };
    by[r.suite][r.status]++;
  }
  console.log('\n================ SUMMARY ================');
  let pass = 0, fail = 0, skip = 0;
  for (const [s, c] of Object.entries(by)) {
    console.log(`${c.fail ? 'FAIL' : ' ok '}  ${s.padEnd(34)} ${c.pass} passed, ${c.fail} failed${c.skip ? `, ${c.skip} skipped` : ''}`);
    pass += c.pass; fail += c.fail; skip += c.skip;
  }
  console.log(`TOTAL  ${pass} passed, ${fail} failed, ${skip} skipped`);
  return { pass, fail, skip, by };
};

(async () => {
  if (mode === 'prod') {
    const baseUrl = process.env.PROD_API || 'https://api.kks-online.com/api/v1';
    const adminOrigin = process.env.PROD_ADMIN_ORIGIN || 'https://admin.kks-online.com';
    const vars = {
      runId,
      adminSite: adminOrigin,
      storefront: process.env.PROD_STOREFRONT || 'https://www.kks-online.com',
      cdn: process.env.PROD_CDN || 'https://cdn.kks-online.com',
      ...(process.env.PROD_ADMIN_EMAIL && process.env.PROD_ADMIN_PASSWORD
        ? { ownerEmail: process.env.PROD_ADMIN_EMAIL, ownerPassword: process.env.PROD_ADMIN_PASSWORD }
        : {}),
    };
    const actors = { owner: {}, staff: {} };
    console.log(`PRODUCTION (read-only) against ${baseUrl}`);
    const { results } = await runSuites({ suites, mode, baseUrl, adminOrigin, actors, db: null, vars, jwtSign: () => '', makeImage, only });
    const s = summarize(results);
    fs.writeFileSync(reportPath, JSON.stringify({ mode, at: new Date().toISOString(), ...s, results }, null, 1));
    return finish(s.fail ? 1 : 0);
  }

  // ---- branch mode ----
  const pooled = process.env.LIVE_DATABASE_URL;
  const direct = process.env.LIVE_DATABASE_URL_UNPOOLED;
  const branchName = process.env.LIVE_BRANCH_NAME;
  if (!pooled || !direct || !branchName) {
    console.error('Branch mode needs LIVE_DATABASE_URL, LIVE_DATABASE_URL_UNPOOLED and LIVE_BRANCH_NAME (a temporary Neon branch).');
    return finish(2);
  }
  const prodHosts = new Set(
    ['.env.production.local', '.env.production'].flatMap((f) => {
      const e = readEnv(f);
      return [hostOf(e.DATABASE_URL), hostOf(e.DATABASE_URL_UNPOOLED)].filter(Boolean);
    }),
  );
  if (['production', 'main', 'master'].includes(branchName.toLowerCase()) || prodHosts.has(hostOf(pooled)) || prodHosts.has(hostOf(direct))) {
    console.error('REFUSING TO RUN: the database is (or may be) the production database. Use a temporary branch.');
    return finish(2);
  }
  console.log(`Temporary branch: ${branchName} | database host: ${hostOf(direct)} (not production)`);

  const devEnv = readEnv('.env.development');
  const ownerPassword = `Own-${crypto.randomBytes(6).toString('hex')}`;
  const staffPassword = `Stf-${crypto.randomBytes(6).toString('hex')}`;
  const accounts = [
    { email: 'owner@live-test.local', name: 'Live Owner', role: 'owner', passwordHash: bcrypt.hashSync(ownerPassword, 10) },
    { email: 'manager@live-test.local', name: 'Live Manager', role: 'manager', passwordHash: bcrypt.hashSync(ownerPassword, 10) },
    { email: 'staff@live-test.local', name: 'Live Staff', role: 'staff', passwordHash: bcrypt.hashSync(staffPassword, 10) },
  ];
  const jwtSecret = crypto.randomBytes(32).toString('hex');
  const adminOrigin = 'https://admin.live-test.local';
  const port = 5057;
  const env = {
    ...process.env,
    NODE_ENV: 'production',
    DEPLOY_TIER: 'dev', // lets the server start without the Cloudflare keys (which purge the LIVE zone)
    PORT: String(port),
    DATABASE_URL: pooled,
    DATABASE_URL_UNPOOLED: direct,
    JWT_SECRET: jwtSecret,
    GOOGLE_CLIENT_ID: 'live-test-client',
    ADMIN_ACCOUNTS: JSON.stringify(accounts),
    ADMIN_SESSION_SECRET: crypto.randomBytes(32).toString('hex'),
    ADMIN_ORIGIN: adminOrigin,
    ALLOWED_ORIGINS: adminOrigin,
    JOBS_SECRET: crypto.randomBytes(24).toString('hex'),
    RATE_LIMIT_MAX_REQUESTS: '100000',
    CLOUDFLARE_ZONE_ID: '',
    CLOUDFLARE_API_TOKEN: '',
    OPENAI_API_KEY: '',
    NEON_API_KEY: '',
    SENTRY_DSN: '',
    R2_ACCOUNT_ID: devEnv.R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID: devEnv.R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY: devEnv.R2_SECRET_ACCESS_KEY,
    R2_PUBLIC_BUCKET: devEnv.R2_PUBLIC_BUCKET || 'kks-public',
    R2_PRIVATE_BUCKET: devEnv.R2_PRIVATE_BUCKET || 'kks-private',
    ASSET_BASE_URL: devEnv.ASSET_BASE_URL || 'https://cdn.kks-online.com',
  };
  server = spawn(process.execPath, [path.join(root, 'node_modules/tsx/dist/cli.mjs'), 'src/index.ts'], { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] });
  let log = '';
  server.stdout.on('data', (d) => (log += d));
  server.stderr.on('data', (d) => (log += d));
  const baseUrl = `http://localhost:${port}/api/v1`;
  let up = false;
  for (let i = 0; i < 90 && !up; i++) {
    try { up = (await fetch(`${baseUrl}/health`)).ok; } catch {}
    if (!up) await sleep(1000);
  }
  if (!up) { console.error('Server did not start:\n' + log.slice(-1500)); return finish(2); }

  const u = new URL(direct);
  u.searchParams.delete('channel_binding');
  db = new Client({ connectionString: u.toString() });
  await db.connect();
  const who = (await db.query('select current_database() d')).rows[0].d;
  console.log(`Server up on :${port}, database connected (${who}).`);

  const vars = {
    runId, adminOrigin,
    ownerEmail: 'owner@live-test.local', ownerPassword,
    managerEmail: 'manager@live-test.local',
    staffEmail: 'staff@live-test.local', staffPassword,
  };
  const actors = { owner: {}, manager: {}, staff: {} };
  const jwtSign = (payload) => jwt.sign(payload, jwtSecret, { expiresIn: '45m' });
  const { results } = await runSuites({ suites, mode, baseUrl, adminOrigin, actors, db, vars, jwtSign, makeImage, only });
  const s = summarize(results);
  fs.writeFileSync(reportPath, JSON.stringify({ mode, branch: branchName, at: new Date().toISOString(), ...s, results }, null, 1));
  console.log(`Report: ${reportPath}`);
  if (argv.includes('--show-log')) {
    const NL = String.fromCharCode(10);
    const found = log.split(NL).filter((l) => /error|Error|P20[0-9][0-9]|unique|deadlock/.test(l)).slice(-25);
    console.log(NL + '---- server error log (last 25) ----');
    console.log(found.map((l) => l.slice(0, 400)).join(NL));
  }
  return finish(s.fail ? 1 : 0);
})().catch(async (e) => {
  console.error('RUNNER ERROR', e);
  await finish(2);
});
