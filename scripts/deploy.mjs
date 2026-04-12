#!/usr/bin/env node
/**
 * Cross-platform deploy helper: verifies production build.
 * Push to GitHub from your machine or CI after this succeeds.
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';

const r = spawnSync(pnpm, ['build'], { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' });
if (r.status !== 0) process.exit(r.status ?? 1);
console.log('\nBuild OK. Next: git add -A && git commit && git push origin <branch>\n');
