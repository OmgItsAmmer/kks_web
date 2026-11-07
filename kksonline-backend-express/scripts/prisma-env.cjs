// Runs the Prisma CLI with the same env files the app loads (.env, then ../.env.local from `neon deploy`).
const path = require('node:path');
const { spawnSync } = require('node:child_process');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../../.env.local') });
const bin = path.resolve(__dirname, '../node_modules/.bin/prisma' + (process.platform === 'win32' ? '.cmd' : ''));
const r = spawnSync(bin, process.argv.slice(2), { stdio: 'inherit', env: process.env, shell: process.platform === 'win32' });
process.exit(r.status ?? 1);
