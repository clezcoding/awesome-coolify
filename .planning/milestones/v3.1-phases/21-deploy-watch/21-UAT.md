---
status: complete
phase: 21-deploy-watch
source: 21-00-SUMMARY.md, 21-01-SUMMARY.md, 21-02-SUMMARY.md, 21-03-SUMMARY.md, 21-04-SUMMARY.md
started: 2026-07-25T08:05:00Z
updated: 2026-07-25T08:18:12Z
---

## Current Test

[testing complete]

## Tests

### 1. Confirm auto-covered deliverables
expected: |
  All Phase 21 coverage entries are covered by passing unit tests. Confirm the auto-covered set matches what you expect shipped:
  - 21-00 D1: deploy-watch-poll RED scaffolds → deploy-watch-poll.test.ts — 5 it.fails
  - 21-00 D2: deployment.watch schema/handler RED scaffolds → deployment.test.ts#deployment watch — 8 it.fails
  - 21-00 D3: deploy prompt watch-primary target → prompts.test.ts — deploy it.fails
  - 21-01 D1: pollDeploymentWithBackoff terminal/timeout/jitter/429/defaults → deploy-watch-poll.test.ts — 5 cases
  - 21-01 D2: toStructuredError data.retry_after on HTTP 429 → errors.test.ts — 429 Retry-After passthrough
  - 21-01 D3: deploy-poll wait:true regression unchanged → deploy-poll.test.ts
  - 21-02 D1: Watch error codes + RECOVERY_HINTS → errors.test.ts — deployment watch error codes
  - 21-02 D2: deployment.watch schema/handler outcomes → deployment.test.ts — deployment watch (8 cases)
  - 21-02 D3: deploy-poll wait:true regression unchanged → deploy-poll.test.ts
  - 21-03 D1: Deploy MCP prompt watch-primary flow → prompts.test.ts — deploy prompt recommends watch-primary
  - 21-03 D2: README EN/DE Watch sections + deployment.watch rows → rg Watch/Beobachten + 300 + Phase 22
  - 21-04 D1: Sleep clamp to remaining timeout (CR-01/WR-01) → deploy-watch-poll.test.ts — Retry-After clamp
  - 21-04 D2: include_logs true success capped logs (WR-02) → deployment.test.ts — include_logs success
  - 21-04 D3: wait:true deploy poll path untouched → deploy-poll.test.ts — 7 tests
result: pass

### 2. deploy-watch-poll RED scaffolds (terminal, timeout dual-path, Equal Jitter bounds, 429 continue, defaults)
expected: deploy-watch-poll RED scaffolds (terminal, timeout dual-path, Equal Jitter bounds, 429 continue, defaults)
result: pass
source: automated
coverage_id: 21-00-D1

### 3. deployment.watch schema defaults/rejects and handler outcome RED scaffolds
expected: deployment.watch schema defaults/rejects and handler outcome RED scaffolds
result: pass
source: automated
coverage_id: 21-00-D2

### 4. deploy prompt watch-primary target (re-watch, fail messaging, wait:true legacy)
expected: deploy prompt watch-primary target (re-watch, fail messaging, wait:true legacy)
result: pass
source: automated
coverage_id: 21-00-D3

### 5. pollDeploymentWithBackoff terminal exit, timeout without status:timeout, Equal Jitter bounds, 429 continue, default intervals
expected: pollDeploymentWithBackoff terminal exit, timeout without status:timeout, Equal Jitter bounds, 429 continue, default intervals
result: pass
source: automated
coverage_id: 21-01-D1

### 6. toStructuredError attaches data.retry_after (ms) from Retry-After on HTTP 429
expected: toStructuredError attaches data.retry_after (ms) from Retry-After on HTTP 429
result: pass
source: automated
coverage_id: 21-01-D2

### 7. deploy-poll.ts fixed 3s wait:true path unchanged (regression gate)
expected: deploy-poll.ts fixed 3s wait:true path unchanged (regression gate)
result: pass
source: automated
coverage_id: 21-01-D3

### 8. Watch error codes + RECOVERY_HINTS (timeout re-watch, fail/cancel log guidance)
expected: Watch error codes + RECOVERY_HINTS (timeout re-watch, fail/cancel log guidance)
result: pass
source: automated
coverage_id: 21-02-D1

### 9. deployment.watch schema defaults, bounds refine, handler outcomes (OK/timeout/failed/cancelled)
expected: deployment.watch schema defaults, bounds refine, handler outcomes (OK/timeout/failed/cancelled)
result: pass
source: automated
coverage_id: 21-02-D2

### 10. deploy-poll.ts wait:true regression unchanged
expected: deploy-poll.ts wait:true regression unchanged
result: pass
source: automated
coverage_id: 21-02-D3

### 11. Deploy MCP prompt watch-primary flow with re-watch, fail messaging, and wait:true legacy
expected: Deploy MCP prompt watch-primary flow with re-watch, fail messaging, and wait:true legacy
result: pass
source: automated
coverage_id: 21-03-D1

### 12. README EN/DE Watch sections, deployment.watch table rows, Phase 22 SKILL note
expected: README EN/DE Watch sections, deployment.watch table rows, Phase 22 SKILL note
result: pass
source: automated
coverage_id: 21-03-D2

### 13. Sleep on 429 and normal paths clamped to remaining timeout budget (CR-01, WR-01, D-05)
expected: Sleep on 429 and normal paths clamped to remaining timeout budget (CR-01, WR-01, D-05)
result: pass
source: automated
coverage_id: 21-04-D1

### 14. Watch include_logs true success returns capped logs without raw_deployment (WR-02)
expected: Watch include_logs true success returns capped logs without raw_deployment (WR-02)
result: pass
source: automated
coverage_id: 21-04-D2

### 15. wait:true deploy poll path untouched (D-02, D-03 regression guard)
expected: wait:true deploy poll path untouched (D-02, D-03 regression guard)
result: pass
source: automated
coverage_id: 21-04-D3

## Summary

total: 15
passed: 15
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none yet]
