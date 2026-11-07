import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

export interface LoadEnvOptions {
  rootDir?: string;
  env?: string;
}

export interface LoadEnvResult {
  env: string;
  loadedFiles: string[];
  neonBranch?: string;
}

/**
 * Precedence (First-Wins, because dotenv does NOT overwrite already-set process.env keys):
 * 1. process.env (already set in the execution environment / system / test runner)
 * 2. .env.<app_env>.local (e.g. .env.development.local)
 * 3. .env.local (machine-level overrides for this app)
 * 4. .env.<app_env> (e.g. .env.development, .env.production)
 * 5. .env (legacy fallback if it exists during migration)
 * 6. ../.env.local (Neon CLI managed root file: DATABASE_URL, DATABASE_URL_UNPOOLED, NEON_BRANCH)
 */
export function loadEnv(options: LoadEnvOptions = {}): LoadEnvResult {
  const rootDir = options.rootDir || process.cwd();

  // Resolve environment: APP_ENV takes precedence over NODE_ENV, defaults to 'development'
  const activeEnv = options.env || process.env.APP_ENV || process.env.NODE_ENV || 'development';

  const candidateFiles = [
    path.resolve(rootDir, `.env.${activeEnv}.local`),
    path.resolve(rootDir, '.env.local'),
    path.resolve(rootDir, `.env.${activeEnv}`),
    path.resolve(rootDir, '.env'),
    // Root Neon-managed fallback
    path.resolve(rootDir, '../.env.local'),
  ];

  const loadedFiles: string[] = [];

  for (const filePath of candidateFiles) {
    if (fs.existsSync(filePath)) {
      dotenv.config({ path: filePath });
      loadedFiles.push(filePath);
    }
  }

  const neonBranch = process.env.NEON_BRANCH;

  return {
    env: activeEnv,
    loadedFiles,
    neonBranch,
  };
}

