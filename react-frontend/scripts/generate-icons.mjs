// Generates the favicons, app icons and the social preview image from public/logo.png.
//   node scripts/generate-icons.mjs
// Dev-only helper: it borrows `sharp` from the backend's node_modules (the storefront itself does not depend on it).
// The generated files are committed, so you only run this when the logo changes.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const require = createRequire(import.meta.url);
const sharp = require(path.resolve(root, '../kksonline-backend-express/node_modules/sharp'));

const logo = path.join(root, 'public/logo.png');
const out = (name) => path.join(root, 'public', name);
const DARK = { r: 11, g: 11, b: 11, alpha: 1 };

// The logo is a tall picture with a lot of black glow. These crops cut out just the emblem.
const faceCrop = { left: 110, top: 180, width: 820, height: 820 }; // shield + face: reads well when tiny
const emblemCrop = { left: 90, top: 175, width: 850, height: 1030 }; // the whole badge with "KKS / SINCE 1995"

const square = async (size, crop, pad = 0.08) => {
  const inner = Math.round(size * (1 - pad * 2));
  const piece = await sharp(logo).extract(crop).resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background: DARK } })
    .composite([{ input: piece, gravity: 'center' }])
    .png()
    .toBuffer();
};

// A .ico file that holds PNG images (supported by every current browser).
const ico = (images) => {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = 6 + images.length * 16;
  const entries = images.map(({ size, data }) => {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0);
    e.writeUInt8(size >= 256 ? 0 : size, 1);
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += data.length;
    return e;
  });
  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)]);
};

const main = async () => {
  const sizes = [16, 32, 48];
  const faces = {};
  for (const s of sizes) faces[s] = await square(s, faceCrop, s <= 32 ? 0.02 : 0.05);
  fs.writeFileSync(out('favicon.ico'), ico(sizes.map((s) => ({ size: s, data: faces[s] }))));
  fs.writeFileSync(out('favicon-16x16.png'), faces[16]);
  fs.writeFileSync(out('favicon-32x32.png'), faces[32]);

  // SVG icon (modern browsers pick it first). It wraps a sharp 128px picture, so it stays crisp on high-DPI tabs.
  const svgPng = (await square(128, faceCrop, 0.02)).toString('base64');
  fs.writeFileSync(
    out('favicon.svg'),
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 128 128" width="128" height="128"><rect width="128" height="128" rx="24" fill="#0b0b0b"/><image width="128" height="128" xlink:href="data:image/png;base64,${svgPng}"/></svg>\n`,
  );

  fs.writeFileSync(out('apple-touch-icon.png'), await square(180, emblemCrop, 0.06));
  fs.writeFileSync(out('icon-192.png'), await square(192, emblemCrop, 0.06));
  fs.writeFileSync(out('icon-512.png'), await square(512, emblemCrop, 0.06));

  // Social preview, 1200 x 630 (the size Facebook, WhatsApp, X and Google expect)
  const W = 1200;
  const H = 630;
  const emblemH = 560;
  const emblem = await sharp(logo).extract(emblemCrop).resize({ height: emblemH }).png().toBuffer();
  const meta = await sharp(emblem).metadata();
  const text = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
      <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1a1a1a"/><stop offset="1" stop-color="#0b0b0b"/></linearGradient></defs>
      <rect width="${W}" height="${H}" fill="url(#g)"/>
      <rect x="0" y="0" width="14" height="${H}" fill="#e30613"/>
      <text x="560" y="250" font-family="Arial, Helvetica, sans-serif" font-size="108" font-weight="700" fill="#ffffff">KKS Online</text>
      <text x="562" y="330" font-family="Arial, Helvetica, sans-serif" font-size="40" fill="#e9e9e9">Daily grocery, karyana and</text>
      <text x="562" y="382" font-family="Arial, Helvetica, sans-serif" font-size="40" fill="#e9e9e9">household essentials in Pakistan</text>
      <rect x="562" y="438" width="250" height="62" rx="31" fill="#e30613"/>
      <text x="687" y="481" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="32" font-weight="700" fill="#ffffff">Since 1995</text>
      <text x="562" y="560" font-family="Arial, Helvetica, sans-serif" font-size="30" fill="#bdbdbd">www.kks-online.com</text>
    </svg>`,
  );
  await sharp(text)
    .composite([{ input: emblem, left: 70, top: Math.round((H - emblemH) / 2) }])
    .jpeg({ quality: 88, mozjpeg: true })
    .toFile(out('og-image.jpg'));

  fs.writeFileSync(
    out('site.webmanifest'),
    JSON.stringify(
      {
        name: 'KKS Online',
        short_name: 'KKS Online',
        description: 'Order daily grocery items online from KKS Online. Serving quality karyana, household essentials, and pantry staples in Pakistan since 1995.',
        start_url: '/',
        display: 'standalone',
        background_color: '#0b0b0b',
        theme_color: '#e30613',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      null,
      2,
    ) + '\n',
  );
  console.log('icons written to public/, emblem width', meta.width);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
