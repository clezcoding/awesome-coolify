---
phase: 21-deploy-watch
fixed_at: 2026-07-25T07:46:40Z
review_path: .planning/phases/21-deploy-watch/21-REVIEW.md
iteration: 1
findings_in_scope: 5
fixed: 5
skipped: 0
status: all_fixed
---

# Phase 21: Code Review Fix Report

**Fixed at:** 2026-07-25T07:46:40Z  
**Source review:** `.planning/phases/21-deploy-watch/21-REVIEW.md`  
**Iteration:** 1

**Summary:**
- Findings in scope: 5
- Fixed: 5
- Skipped: 0

## Fixed Issues

### WR-01: HTTP-date 429 test can leak fake timers

**Files modified:** `src/utils/errors.test.ts`  
**Commit:** d4a635a  
**Applied fix:** Wrapped `vi.useFakeTimers()` / `vi.setSystemTime` / expects in `try/finally` with `vi.useRealTimers()` so assertion failures cannot leak fake timers into later tests.

### IN-01: All-429 timeout yields empty deployment snapshot

**Files modified:** `src/utils/deploy-watch-poll.ts`, `src/utils/deploy-watch-poll.test.ts`, `src/mcp/tools/deployment.ts`  
**Commit:** a31531a  
**Applied fix:** Track `hadSuccessfulFetch`; timeout outcomes set `noSuccessfulFetch: true` when every `fetcher()` call failed. Watch handler message notes `no successful fetch` and error data includes `no_successful_fetch: true`. Added regression test for all-429 timeout.  
**Commit status:** fixed: requires human verification (logic/edge-case path)

### IN-02: Poll helper tests leave long-running promises unresolved

**Files modified:** `src/utils/deploy-watch-poll.test.ts`  
**Commit:** 2377498  
**Applied fix:** Lowered `timeoutMs` on Equal Jitter and defaults cases; advance timers past timeout and `await` the poll promise so fake-timer teardown has no dangling work.

### IN-03: Deploy prompt says “cancelled” vs API status `cancelled-by-user`

**Files modified:** `src/mcp/prompts.ts`  
**Commit:** c21acda  
**Applied fix:** Prompt terminal wording now uses `` `cancelled-by-user` `` to match `TERMINAL_DEPLOYMENT_STATES` / `COOLIFY_DEPLOYMENT_CANCELLED`.

### IN-04: No regression assertion for watch `{ retry: false }`

**Files modified:** `src/mcp/tools/deployment.test.ts`  
**Commit:** fdfddb5  
**Applied fix:** Watch success path asserts `fetchDeployment` fifth arg `{ retry: false }` so nested ofetch 429 retries cannot regress silently.

---

_Fixed: 2026-07-25T07:46:40Z_  
_Fixer: Claude (gsd-code-fixer)_  
_Iteration: 1_
