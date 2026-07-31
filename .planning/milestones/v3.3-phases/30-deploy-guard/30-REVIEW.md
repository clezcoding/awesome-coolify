---
phase: 30-deploy-guard
reviewed: 2026-07-31T01:37:00Z
depth: standard
files_reviewed: 15
files_reviewed_list:
  - README.de.md
  - README.md
  - docs/COVERAGE.md
  - docs/coverage-map.yaml
  - src/api/client.test.ts
  - src/api/client.ts
  - src/mcp/capabilities.ts
  - src/mcp/tools/application.ts
  - src/mcp/tools/deployment.test.ts
  - src/mcp/tools/deployment.ts
  - src/mcp/tools/intelligence.ts
  - src/mcp/tools/system.test.ts
  - src/utils/deploy-preflight.test.ts
  - src/utils/deploy-preflight.ts
  - src/utils/errors.ts
findings:
  critical: 1
  warning: 3
  info: 1
  total: 5
status: issues_found
---

# Phase 30: Code Review Report

**Reviewed:** 2026-07-31T01:37:00Z  
**Depth:** standard  
**Files Reviewed:** 15  
**Status:** issues_found

## Summary

Re-review after REVIEW-FIX `all_fixed`. Prior CR-01 / WR-01–WR-05 / IN-01 hold in current code: wait failure throws, prior-finished selection, docker/git pin guards, `POST /deploy` coverage mapping, contextual blocking hints, settleFactor uses `key`. **IN-02 fix regresses:** commit `c7032db` removed `export` from `deploymentTimestamp` while `intelligence.ts` still imports it — `tsc` reports TS2459. Also: `wait:true` still treats `cancelled-by-user` as success; README still says “last finished” after prior-version semantics; partial factors still leave `risk_level: low` + deploy recommend.

## Critical Issues

### CR-01: `deploymentTimestamp` imported but not exported (IN-02 regression)

**File:** `src/utils/deploy-preflight.ts:59`  
**Also:** `src/mcp/tools/intelligence.ts:23`  
**Issue:** `intelligence.ts` imports `{ sortDeploymentsNewestFirst, deploymentTimestamp }` from `deploy-preflight.js`, but `deploymentTimestamp` is a non-exported function. Fix commit `c7032db` changed `export function deploymentTimestamp` → `function deploymentTimestamp` while adding the import — reverse of claimed fix. `tsc`: `TS2459: Module '"../../utils/deploy-preflight.js"' declares 'deploymentTimestamp' locally, but it is not exported.` Breaks intelligence scorecard compile/runtime.  
**Fix:**

```typescript
export function deploymentTimestamp(dep: Record<string, unknown>): number {
  // ...existing body...
}
```

## Warnings

### WR-01: `rollback` + `wait:true` returns `ok:true` on `cancelled-by-user`

**File:** `src/utils/deploy-preflight.ts:729-746`  
**Issue:** After `pollDeploymentUntilTerminal`, only `failed` and `timeout` throw. Terminal `cancelled-by-user` falls through to `buildReadResponse` → MCP `ok: true`. `deployment.watch` throws `COOLIFY_DEPLOYMENT_CANCELLED` for same status. Agents can treat cancelled rollback as success.  
**Fix:**

```typescript
if (status === 'cancelled-by-user') {
  throw new CoolifyApiError({
    code: 'COOLIFY_DEPLOYMENT_CANCELLED',
    message: `Rollback deployment was cancelled (status: ${status}).`,
    recoveryHints: RECOVERY_HINTS.COOLIFY_DEPLOYMENT_CANCELLED,
    data: { deployment_uuid: deploymentUuid, rolled_back_to },
  });
}
```

### WR-02: README still says rollback to “last finished” after prior-version semantics

**File:** `README.md:410`, `README.md:417`, `README.de.md:410`  
**Issue:** After WR-01 fix, when newest deployment is `finished`, rollback targets the **prior** finished (or errors if only one). Docs still say recovery to “last `finished` deployment” / “letztes `finished` Deployment” — matches old (incorrect) behavior, misleads operators.  
**Fix:** Update EN/DE copy to: roll back to prior successful `finished` when current tip is finished; error with “already on last successful” when only one finished exists.

### WR-03: Partial factor failures still leave `risk_level: low` + deploy recommend

**File:** `src/utils/deploy-preflight.ts:414-435`, `506`, `543-549`  
**Issue:** WR-06 injects an `info` finding (−5 score). Single partial (e.g. `instance_health` or `env_completeness` fetch fail) → `risk_score: 95`, `risk_level: low`, `blocking: false`, `recommended_actions` still “Deploy application after preflight”. Soft-fail health/env checks do not block or elevate risk.  
**Fix:** For partial factors, use `severity: 'high'` (or set `blocking: true` when any `partial_factors` present), and prefer diagnose hint over deploy recommend when partials exist.

## Info

### IN-01: No regression test for rollback `wait:true` failed/timeout

**File:** `src/mcp/tools/deployment.test.ts` (rollback describe ~990–1120)  
**Issue:** CR-01 fix in `executeDeploymentRollback` has no test asserting `COOLIFY_DEPLOYMENT_FAILED` / `COOLIFY_WATCH_TIMEOUT` on `wait:true`. Suite green (54) without covering that path.  
**Fix:** Add mocked `fetchDeployment` terminal `failed`/`timeout` cases under `deployment.rollback` with `wait: true`.

---

### Prior findings verification

| Prior ID | Claimed fix | Current verdict |
|---|---|---|
| CR-01 wait failed→ok | throw on failed/timeout | **Holds** (`729-746`) |
| WR-01 newest finished | skip tip / prior finished | **Holds** (`84-104`) |
| WR-02 docker no tag | throw before mutate | **Holds** (`660-668`) |
| WR-03 git no SHA | throw before mutate | **Holds** (`670-678`) |
| WR-04 GET vs POST | `POST /deploy` in map | **Holds** (`coverage-map.yaml:138`) |
| WR-05 blocking hints | in-progress / failed only | **Holds** (`517-541`) |
| WR-06 partial scoring | info finding injected | **Partial** — see WR-03 residual |
| IN-01 unused `key` | used in message | **Holds** |
| IN-02 shared timestamp | export + reuse | **Regressed** — see CR-01 |

---

_Reviewed: 2026-07-31T01:37:00Z_  
_Reviewer: Claude (gsd-code-reviewer)_  
_Depth: standard_
