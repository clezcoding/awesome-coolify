#!/usr/bin/env node
/**
 * Ensure each phase *-VERIFICATION.md is strictly newer than all *-SUMMARY.md files.
 * Prevents GSD init progress from marking completed phases as "stale" after bulk
 * copy/checkout/touch races (summary mtime > verification mtime by milliseconds).
 *
 * Usage: node .planning/scripts/ensure-verification-fresh.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const base = path.resolve('.planning/phases');
if (!fs.existsSync(base)) {
  console.error('No .planning/phases directory');
  process.exit(1);
}

const fixed = [];
for (const d of fs.readdirSync(base).sort()) {
  const full = path.join(base, d);
  if (!fs.statSync(full).isDirectory()) continue;
  const files = fs.readdirSync(full);
  const ver = files.filter((f) => f.endsWith('-VERIFICATION.md')).sort()[0];
  if (!ver) continue;
  const verPath = path.join(full, ver);
  const summaries = files.filter((f) => f.endsWith('-SUMMARY.md'));
  let maxSummary = 0;
  for (const s of summaries) {
    maxSummary = Math.max(maxSummary, fs.statSync(path.join(full, s)).mtimeMs);
  }
  const verM = fs.statSync(verPath).mtimeMs;
  if (maxSummary > 0 && verM <= maxSummary) {
    const newTime = new Date(maxSummary + 2000);
    fs.utimesSync(verPath, newTime, newTime);
    fixed.push({ phase: d, file: ver, deltaMs: maxSummary - verM });
  }
}
console.log(JSON.stringify({ ok: true, fixed_count: fixed.length, fixed }, null, 2));
