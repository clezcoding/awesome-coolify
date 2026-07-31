---
phase: 30-deploy-guard
fixed_at: 2026-07-31T01:40:00Z
review_path: .planning/phases/30-deploy-guard/30-REVIEW.md
iteration: 1
findings_in_scope: 5
fixed: 5
skipped: 0
status: all_fixed
---

# Phase 30: Code Review Fix Report

**Fixed at:** 2026-07-31T01:40:00Z
**Source review:** `.planning/phases/30-deploy-guard/30-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 5
- Fixed: 5
- Skipped: 0

## Fixed Issues

### CR-01: `deploymentTimestamp` imported but not exported (IN-02 regression)

**Files modified:** `src/utils/deploy-preflight.ts`
**Commit:** `c5d4391`
**Applied fix:** Re-exported `deploymentTimestamp` so `intelligence.ts` import resolves.

### WR-01: `rollback` + `wait:true` returns `ok:true` on `cancelled-by-user`

**Files modified:** `src/utils/deploy-preflight.ts`
**Commit:** `9731ab2`
**Applied fix:** Throw `COOLIFY_DEPLOYMENT_CANCELLED` when rollback poll ends in `cancelled-by-user`, matching `deployment.watch`.

### WR-02: README still says rollback to “last finished” after prior-version semantics

**Files modified:** `README.md`, `README.de.md`
**Commit:** `d60f8ae`
**Applied fix:** EN/DE docs now describe prior successful `finished` target and single-successful error semantics.

### WR-03: Partial factor failures still leave `risk_level: low` + deploy recommend

**Files modified:** `src/utils/deploy-preflight.ts`
**Commit:** `a4fb6e2`
**Applied fix:** Partial factor settle uses `high` severity; `blocking: true` when `partial_factors` present so deploy recommend is replaced by diagnose hints.

### IN-01: No regression test for rollback `wait:true` failed/timeout

**Files modified:** `src/mcp/tools/deployment.test.ts`
**Commit:** `78cb113`
**Applied fix:** Added rollback `wait: true` tests for `COOLIFY_DEPLOYMENT_FAILED` and `COOLIFY_WATCH_TIMEOUT`.

---

_Fixed: 2026-07-31T01:40:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
