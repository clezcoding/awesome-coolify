---
phase: 25-application-log-follow
fixed_at: 2026-07-28T00:43:00Z
review_path: .planning/phases/25-application-log-follow/25-REVIEW.md
iteration: 2
findings_in_scope: 4
fixed: 4
skipped: 0
status: all_fixed
---

# Phase 25: Code Review Fix Report

**Fixed at:** 2026-07-28T00:43:00Z
**Source review:** `.planning/phases/25-application-log-follow/25-REVIEW.md`
**Iteration:** 2

**Summary:**
- Findings in scope: 4
- Fixed: 4
- Skipped: 0

## Fixed Issues

### WR-01: Empty runtime logs never trigger idle — full timeout instead

**Files modified:** `src/utils/log-follow-poll.ts`, `src/utils/log-follow-poll.test.ts`
**Commit:** c303118
**Applied fix:** Start idle clock on first poll when snapshots stay empty (no deduped lines). Added regression test `stops idle when snapshots stay empty`.

### WR-02: Flat `applicationActionSchema` `timeout` min(10) applies to follow budget

**Files modified:** `src/mcp/tools/application.ts`, `src/mcp/tools/application.test.ts`
**Commit:** 76a325b
**Applied fix:** Relaxed flat schema `timeout` to `.min(1)`; added deploy `wait:true` refine enforcing min 10s. Added schema tests for follow timeout &lt;10s accept and deploy wait timeout &lt;10s reject.

### WR-03: `min_interval` / `max_interval` ordering unchecked when only one bound is set

**Files modified:** `src/mcp/tools/application.ts`, `src/mcp/tools/application.test.ts`
**Commit:** 6519440
**Applied fix:** Compare resolved defaults (`?? 3` / `?? 30`) in both nested and flat logs refines. Added test for `max_interval:2` only.

### IN-01: `timeout` on one-shot `logs` (no follow) is accepted but ignored

**Files modified:** `src/mcp/tools/application.ts`, `src/mcp/tools/application.test.ts`
**Commit:** 893fbae
**Applied fix:** Reject `timeout` when `follow !== true` in `applicationLogsSchema` and flat `applicationActionSchema` logs refine (`timeout applies only when follow:true`). Added schema tests for both schemas (IN-01).

---

_Fixed: 2026-07-28T00:43:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 2_
