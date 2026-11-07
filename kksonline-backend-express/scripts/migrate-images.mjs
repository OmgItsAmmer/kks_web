// Copies every catalog image from Supabase Storage to Cloudflare R2 (plan Phase 2; repeat at cutover for new files).
//
//   Dry run (default):               node scripts/migrate-images.mjs
//   Copy for real:                   node scripts/migrate-images.mjs --apply
//   Convert big PNGs to WebP:        node scripts/migrate-images.mjs --apply --webp      (only if the total is over ~8 GB)
//
// It is safe to run again: files already in R2 are skipped. The R2 key is `<folderType>/<filename>`, exactly what
// the `images` table stores, so no database change is needed when images are copied unchanged. With --webp the
// file name ends in .webp: the `images.filename` row is updated at the same time, in the NEW database only.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const path = require('node:path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });
require('dotenv').config({ path: path.resolve(process.cwd(), '../.env.local') });
const { createClient } = require('@supabase/supabase-js');
const { S3Client, HeadObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const sharp = require('sharp');

const APPLY = process.argv.includes('--apply');
const WEBP = process.argv.includes('--webp');
const PRIVATE = new Set(['customers', 'payment-receipts']);

for (const k of ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY', 'R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'DATABASE_URL_UNPOOLED']) {
  if (!process.env[k]) throw new Error(`${k} is not set`);
}
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
});
const { PrismaClient } = require('@prisma/client');
const u = new URL(process.env.DATABASE_URL_UNPOOLED);
u.searchParams.delete('channel_binding');
const db = new PrismaClient({ datasources: { db: { url: u.toString() } } });

const bucketFor = (folder) => (PRIVATE.has(folder) ? process.env.R2_PRIVATE_BUCKET || 'kks-private' : process.env.R2_PUBLIC_BUCKET || 'kks-public');
const exists = async (bucket, key) => {
  try {
    await r2.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch {
    return false;
  }
};
const MIME = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif' };

const rows = await db.image.findMany({ where: { folderType: { not: null }, filename: { not: null } }, orderBy: { image_id: 'asc' } });
console.log(`${APPLY ? 'APPLY' : 'DRY RUN'}${WEBP ? ' (convert to WebP)' : ''}: ${rows.length} image rows\n`);

let copied = 0, skipped = 0, failed = 0, bytesIn = 0, bytesOut = 0;
const queue = [...rows];
const worker = async () => {
  for (let row = queue.shift(); row; row = queue.shift()) {
    const folder = row.folderType;
    const name = row.filename;
    const ext = name.split('.').pop().toLowerCase();
    const targetName = WEBP && ext !== 'webp' ? name.replace(/\.[a-z0-9]+$/i, '.webp') : name;
    const bucket = bucketFor(folder);
    const key = `${folder}/${targetName}`;
    try {
      if (await exists(bucket, key)) {
        skipped++;
        continue;
      }
      if (!APPLY) {
        copied++;
        continue;
      }
      const { data, error } = await supabase.storage.from(folder).download(name);
      if (error || !data) throw new Error(error?.message || 'download failed');
      let body = Buffer.from(await data.arrayBuffer());
      bytesIn += body.length;
      let type = MIME[ext] || data.type || 'application/octet-stream';
      if (WEBP && ext !== 'webp' && !PRIVATE.has(folder)) {
        body = await sharp(body).rotate().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
        type = 'image/webp';
        await db.image.update({ where: { image_id: row.image_id }, data: { filename: targetName } });
      }
      bytesOut += body.length;
      await r2.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: type, CacheControl: PRIVATE.has(folder) ? undefined : 'public, max-age=31536000, immutable' }));
      copied++;
      if (copied % 25 === 0) console.log(`  ${copied} copied...`);
    } catch (e) {
      failed++;
      console.log(`  FAILED ${folder}/${name}: ${e.message}`);
    }
  }
};
await Promise.all(Array.from({ length: 4 }, worker));

const mb = (n) => (n / 1048576).toFixed(1);
console.log(`\n${APPLY ? 'Copied' : 'Would copy'} ${copied}, already in R2 ${skipped}, failed ${failed}.`);
if (APPLY) console.log(`Downloaded ${mb(bytesIn)} MB, stored ${mb(bytesOut)} MB in R2.`);
await db.$disconnect();
process.exit(failed ? 1 : 0);
