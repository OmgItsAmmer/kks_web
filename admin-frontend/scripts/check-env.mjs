/**
 * Build-time check for admin frontend environment variables.
 * Ensures:
 * 1. Required VITE_ variables are defined.
 * 2. No secret-like variable names (SECRET, PRIVATE, SERVICE, PASSWORD, TOKEN) are exposed in frontend env.
 */
import fs from 'node:fs';
import path from 'node:path';

const mode = process.env.NODE_ENV || 'production';
const files = [
  `.env.${mode}.local`,
  '.env.local',
  `.env.${mode}`,
  '.env',
];

const env = { ...process.env };

for (const file of files) {
  const fullPath = path.resolve(process.cwd(), file);
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, 'utf8');
    for (const line of content.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z_0-9]+)\s*=\s*(.*)?$/);
      if (match) {
        const key = match[1];
        let val = (match[2] || '').trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!(key in env)) {
          env[key] = val;
        }
      }
    }
  }
}

// 1. Required keys check
const required = ['VITE_API_BASE_URL'];
const missing = required.filter((k) => !env[k] || !env[k].trim());
if (missing.length > 0) {
  console.error(`❌ [check-env] Missing required frontend environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

// 2. Secret leak prevention check
const forbiddenPatterns = [/SECRET/i, /PRIVATE/i, /SERVICE/i, /PASSWORD/i, /TOKEN/i];
const leaked = Object.keys(env).filter((k) => {
  if (!k.startsWith('VITE_')) return false;
  return forbiddenPatterns.some((pattern) => pattern.test(k));
});

if (leaked.length > 0) {
  console.error(`❌ [check-env] Dangerous variable names found starting with VITE_: ${leaked.join(', ')}`);
  console.error('Frontend variables are bundled directly into client JavaScript. NEVER expose secrets!');
  process.exit(1);
}

console.log('✅ [check-env] Admin frontend environment variables validated safely.');

