---
phase: 24-capabilities-deployment-logs
fixed_at: 2026-07-27T21:51:00Z
review_path: .planning/phases/24-capabilities-deployment-logs/24-REVIEW.md
iteration: 1
findings_in_scope: 3
fixed: 3
skipped: 0
status: all_fixed
---

# Phase 24: Code Review Fix Report

**Fixed at:** 2026-07-27T21:51:00Z
**Source review:** `.planning/phases/24-capabilities-deployment-logs/24-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 3
- Fixed: 3
- Skipped: 0

## Fixed Issues

### WR-01: `deployment.logs` max_chars split — processor 20000 vs envelope 16000

**Files modified:** `src/mcp/tools/deployment.ts`
**Commit:** 13b6af1
**Applied fix:** Introduced shared `maxChars = parsed.max_chars ?? 20000` and passed it to both `processDeploymentBuildLogs` and `buildReadResponse` so envelope truncation matches processor cap.

### WR-02: `deployment.logs` schema accepts `format: table` (D-15 violation)

**Files modified:** `src/mcp/tools/deployment.ts`
**Commit:** 90b58d9
**Applied fix:** Added `format === 'table'` guard in the `data.action === 'logs'` refine block, matching `application.logs` validation.

### WR-03: `entries_shown` counts pre-slice entries, not returned lines

**Files modified:** `src/utils/log-helpers.ts`
**Commit:** 55cb52f
**Applied fix:** Set `entries_shown` to `cappedLines.length` in both plain-text and structured log paths so metadata matches returned `logs_lines`.

## Skipped Issues

None.

---

_Fixed: 2026-07-27T21:51:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
