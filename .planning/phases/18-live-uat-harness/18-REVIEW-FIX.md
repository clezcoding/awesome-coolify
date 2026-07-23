---
phase: 18-live-uat-harness
fixed_at: 2026-07-23T20:45:00+02:00
review_path: .planning/phases/18-live-uat-harness/18-REVIEW.md
iteration: 1
findings_in_scope: 6
fixed: 6
skipped: 0
status: all_fixed
---

# Phase 18: Code Review Fix Report

**Fixed at:** 2026-07-23T20:45:00+02:00
**Source review:** `.planning/phases/18-live-uat-harness/18-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 6
- Fixed: 6
- Skipped: 0

## Fixed Issues

### CR-01: Default smoke run fails on emergency preview row

**Files modified:** `scripts/live-uat.mjs`
**Commit:** `6b0b8c2`
**Applied fix:** `evaluateStdioRowResult` behandelt `COOLIFY_CONFIRM_REQUIRED` als `pass` (Preview-Assertion).

### WR-01: Stdio runner skips write/destructive flag gate

**Files modified:** `scripts/live-uat.mjs`
**Commit:** `b324385`
**Applied fix:** `runStdioRows` prüft `rowAllowedByFlags` vor `tools/call` und markiert gesperrte Rows als `planned`.

### WR-02: Stdio runner skips UAT project scope guard

**Files modified:** `scripts/live-uat.mjs`
**Commit:** `f74158d`
**Applied fix:** `guardUatScope` für stdio-Rows bei `application`, `service`, `database`, `deployment`; außerhalb UAT → `blocked-outside-uat`.

### WR-03: Child stderr piped but never consumed

**Files modified:** `scripts/live-uat.mjs`
**Commit:** `9e72815`
**Applied fix:** `attachStderrDrain` entleert stderr und redacted Chunks vor Discard.

### WR-04: Matrix fixture names assume pre-seeded UAT resources

**Files modified:** `scripts/live-uat.mjs`, `scripts/live-uat.matrix.json`, `CONTRIBUTING.md`
**Commit:** `f41503a`
**Applied fix:** Fixture-Platzhalter via Env-Vars; Rows mit fehlenden Fixtures → `skip` (`missing-fixture`); CONTRIBUTING dokumentiert erforderliche Vars.

### WR-05: CONTRIBUTING “read-only” claim incomplete for stdio emergency row

**Files modified:** `CONTRIBUTING.md`
**Commit:** `abb9342`
**Applied fix:** Runbook erklärt Emergency-Preview-Smoke als bewussten Live-Probe mit `COOLIFY_CONFIRM_REQUIRED`-Pass-Scoring.

---

_Fixed: 2026-07-23T20:45:00+02:00_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
