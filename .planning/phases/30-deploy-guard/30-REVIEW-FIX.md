---
phase: 30-deploy-guard
fixed_at: 2026-07-31T01:30:30Z
review_path: .planning/phases/30-deploy-guard/30-REVIEW.md
iteration: 1
findings_in_scope: 9
fixed: 9
skipped: 0
status: all_fixed
---

# Phase 30: Code Review Fix Report

**Fixed at:** 2026-07-31T01:30:30Z  
**Source review:** `.planning/phases/30-deploy-guard/30-REVIEW.md`  
**Iteration:** 1

**Summary:**
- Findings in scope: 9
- Fixed: 9
- Skipped: 0

## Fixed Issues

### CR-01: `rollback` + `wait:true` returns `ok:true` on failed deploy

**Files modified:** `src/utils/deploy-preflight.ts`  
**Commit:** `6881b01`  
**Applied fix:** After `pollDeploymentUntilTerminal`, throw `COOLIFY_DEPLOYMENT_FAILED` or `COOLIFY_WATCH_TIMEOUT` when rollback watch reaches failed/timeout terminal states. Moved `rolled_back_to` before the wait block so error payloads include rollback context.

### WR-01: Rollback picks newest `finished`, not prior successful version

**Files modified:** `src/utils/deploy-preflight.ts`, `src/utils/deploy-preflight.test.ts`  
**Commit:** `e6746f4`  
**Applied fix:** `findLastSuccessfulDeployment` skips newest when it is `finished` and returns the prior `finished` deployment; returns null when only one `finished` exists. `executeDeploymentRollback` emits a specific "already on last successful" message for that case.

### WR-02: Docker rollback without `docker_registry_image_tag` deploys unpinned

**Files modified:** `src/utils/deploy-preflight.ts`  
**Commit:** `1a457cf`  
**Applied fix:** Throw `COOLIFY_ROLLBACK_UNAVAILABLE` before mutations when `build_pack === 'dockerimage'` and target has no tag.

### WR-03: Git rollback without `git_commit_sha` deploys unpinned

**Files modified:** `src/utils/deploy-preflight.ts`  
**Commit:** `a199d62`  
**Applied fix:** Throw `COOLIFY_ROLLBACK_UNAVAILABLE` before mutations when non-docker app target has no commit SHA.

### WR-04: Coverage map lists `GET /deploy` instead of `POST /deploy`

**Files modified:** `docs/coverage-map.yaml`, `docs/COVERAGE.md`  
**Commit:** `2fc7d61`  
**Applied fix:** Updated `deployment.rollback` OpenAPI mapping to `POST /deploy` and regenerated `COVERAGE.md` via `npm run openapi:coverage`.

### WR-05: `blocking` hints always show in-progress deployment inspect

**Files modified:** `src/utils/deploy-preflight.ts`  
**Commit:** `87ff956`  
**Applied fix:** Second deployment hint only when `latestInProgress` with a real UUID, or when latest deployment is `failed`; no empty-UUID in-progress hint on critical-only blocks.

### WR-06: Partial factor errors do not lower `risk_score`

**Files modified:** `src/utils/deploy-preflight.ts`  
**Commit:** `d1fbab0`  
**Applied fix:** `settleFactor` injects an info finding (counts toward score) when a factor fetch fails, instead of silent `severity: 'ok'`.

### IN-01: Unused `key` parameter in `settleFactor`

**Files modified:** `src/utils/deploy-preflight.ts`  
**Commit:** `d1fbab0` (same commit as WR-06)  
**Applied fix:** `key` now appears in partial-factor info finding text and error context.

### IN-02: Duplicated `deploymentTimestamp` in `intelligence.ts`

**Files modified:** `src/utils/deploy-preflight.ts`, `src/mcp/tools/intelligence.ts`  
**Commit:** `c7032db`  
**Applied fix:** Exported `deploymentTimestamp` from `deploy-preflight.ts` and removed duplicate in `intelligence.ts`.

## Skipped Issues

None — all findings were fixed.

## Verification

- `npm test -- src/utils/deploy-preflight.test.ts src/mcp/tools/deployment.test.ts` — 54/54 passed

---

_Fixed: 2026-07-31T01:30:30Z_  
_Fixer: Claude (gsd-code-fixer)_  
_Iteration: 1_
