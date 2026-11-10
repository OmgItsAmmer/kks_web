// Runs the full live suite against a TEMPORARY Neon branch.
//
//   LIVE_BRANCH_NAME=livetest-2026-11-10 \
//   LIVE_DIRECT_HOST=ep-xxxx.c-2.ap-southeast-1.aws.neon.tech \
//   LIVE_POOLED_HOST=ep-xxxx-pooler.c-2.ap-southeast-1.aws.neon.tech \
//   node tests/live/branch-run.cjs [--only 05,07] [--show-log]
//
// The hosts come from the Neon console (branch -> Compute). The database user and password are taken from your local
// `.env.production.local`, because a branch copies the production user. Only the host is swapped, so nothing here can
// touch the production database: run.mjs also refuses to start if the host is one of the production hosts.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const dotenv = require('dotenv');

const root = path.resolve(__dirname, '../..');
const { LIVE_BRANCH_NAME, LIVE_DIRECT_HOST, LIVE_POOLED_HOST } = process.env;
if (!LIVE_BRANCH_NAME || !LIVE_DIRECT_HOST || !LIVE_POOLED_HOST) {
  console.error('Set LIVE_BRANCH_NAME, LIVE_DIRECT_HOST and LIVE_POOLED_HOST (see the comment at the top of this file).');
  process.exit(2);
}
const prod = dotenv.parse(fs.readFileSync(path.join(root, '.env.production.local')));
const swap = (url, host) => {
  const u = new URL(url);
  u.host = host;
  return u.toString();
};
const env = {
  ...process.env,
  LIVE_DATABASE_URL: swap(prod.DATABASE_URL, LIVE_POOLED_HOST),
  LIVE_DATABASE_URL_UNPOOLED: swap(prod.DATABASE_URL_UNPOOLED, LIVE_DIRECT_HOST),
};
const result = spawnSync(process.execPath, ['tests/live/run.mjs', '--mode', 'branch', ...process.argv.slice(2)], { cwd: root, env, stdio: 'inherit' });
process.exit(result.status ?? 1);
