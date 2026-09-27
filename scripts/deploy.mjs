#!/usr/bin/env node
/**
 * Cross-platform deploy helper: validates production envs and then runs the build.
 * Push to GitHub from your machine or CI after this succeeds.
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';

const isProduction = process.env.NODE_ENV === 'production';
const required = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'FRONTEND_URL',
  'REDIS_URL',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'CLERK_WEBHOOK_SECRET',
  'HF_TOKEN',
  'STORAGE_BUCKET',
];

if (isProduction) {
  const missing = required.filter((key) => !process.env[key] || process.env[key]?.trim() === '');
  if (missing.length > 0) {
    console.error(`Missing required production env vars: ${missing.join(', ')}`);
    console.error('Copy the values from .env.example and set them in your deployment environment.');
    process.exit(1);
  }
}

const r = spawnSync(pnpm, ['build'], { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' });
if (r.status !== 0) process.exit(r.status ?? 1);
console.log('\nBuild OK. Next: git add -A && git commit && git push origin <branch>\n');
