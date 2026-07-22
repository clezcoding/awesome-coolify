---
status: testing
phase: 17-local-manifest-sync
source:
  - 17-VERIFICATION.md
started: 2026-07-22T17:05:09Z
updated: 2026-07-22T17:05:09Z
---

## Current Test

number: 1
name: Parallel manifest writes do not corrupt the file
expected: |
  Both resources A and B appear in `.coolify/manifest.json` after concurrent upserts;
  no partial write; no leftover `.tmp` files; `updatedAt` reflects the later write.
awaiting: user response

## Tests

### 1. Parallel manifest writes do not corrupt the file
expected: Spawn two `ManifestManager.upsert` calls concurrently (e.g. `Promise.all([upsert(A), upsert(B)])` with different resource UUIDs). Both resources appear; no partial write; no `.tmp` left behind.
result: [pending]

### 2. Concurrent 404 hint injection vs. manifest save
expected: Trigger `toStructuredError` on a `COOLIFY_404` for a manifest-cached UUID while a `ManifestManager.save` is in flight. `recoveryHints` either contains both `STALE_MANIFEST_HINTS` literals or neither — no torn/partial hint set.
result: [pending]

## Summary

total: 2
passed: 0
issues: 0
pending: 2
skipped: 0
blocked: 0

## Gaps
