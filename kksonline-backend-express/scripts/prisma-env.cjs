// Runs the Prisma CLI with the unified env loader.
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { loadEnv } = require('./load-env.cjs');

const envInfo = loadEnv();
console.log(`[Prisma Wrapper] Active environment: ${envInfo.env}${envInfo.neonBranch ? ` (Neon branch: ${envInfo.neonBranch})` : ''}`);

const bin = path.resolve(__dirname, '../node_modules/.bin/prisma' + (process.platform === 'win32' ? '.cmd' : ''));

const r = spawnSync(bin, process.argv.slice(2), { stdio: 'inherit', env: process.env, shell: process.platform === 'win32' });
process.exit(r.status ?? 1);
