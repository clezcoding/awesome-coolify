---
phase: 18-live-uat-harness
plan: 04
subsystem: testing
tags: [uat, npm, contributing, docs, maintainer-local]

requires:
  - phase: 18-live-uat-harness
    provides: live-uat.mjs harness, matrix, stdio runner, report writers
provides:
  - npm run uat:live entry point mapped to scripts/live-uat.mjs
  - Verified npm tarball exclusion for harness files (D-03)
  - CONTRIBUTING.md Live UAT Harness runbook (UAT-06, D-21)
affects: [verify-work, uat:live, npm-publish]

tech-stack:
  added: []
  patterns:
    - npm script uat:live as sole documented harness entry (D-02)
    - CONTRIBUTING runbook with placeholders only — no real tokens/UUIDs (T-18-07)

key-files:
  created: []
  modified:
    - package.json
    - CONTRIBUTING.md

key-decisions:
  - "uat:live script added without touching files allowlist — scripts/ stays out of npm tarball per D-03"
  - "CONTRIBUTING section placed after Local Setup with matrix extension via scripts/live-uat.matrix.json only"

patterns-established:
  - "Pattern: maintainer-local UAT documented in CONTRIBUTING — no CI, no remote secrets, never in npm"

requirements-completed: [UAT-06]

coverage:
  - id: D1
    description: "package.json scripts.uat:live maps to node scripts/live-uat.mjs"
    requirement: UAT-06
    verification:
      - kind: other
        ref: "node uat:live + npm pack verify script (18-04-PLAN Task 1)"
        status: pass
    human_judgment: false
  - id: D2
    description: "npm pack --dry-run excludes scripts/live-uat.mjs and scripts/live-uat.matrix.json"
    requirement: UAT-06
    verification:
      - kind: other
        ref: "node npm pack JSON verify (18-04-PLAN Task 1)"
        status: pass
    human_judgment: false
  - id: D3
    description: "CONTRIBUTING.md Live UAT Harness section covers entry, preconditions, flags, reports, exit codes, v3_gaps, maintainer stance"
    requirement: UAT-06
    verification:
      - kind: other
        ref: "node CONTRIBUTING keyword verify (18-04-PLAN Task 2)"
        status: pass
    human_judgment: false

duration: 2min
completed: 2026-07-23
status: complete
---

# Phase 18 Plan 04: npm Script + CONTRIBUTING Runbook Summary

**`npm run uat:live` als dokumentierter Einstieg, npm-Tarball ohne Harness, vollständiges Live-UAT-Runbook in CONTRIBUTING.md**

## Performance

- **Duration:** 2 min
- **Started:** 2026-07-23T18:21:00Z
- **Completed:** 2026-07-23T18:23:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- `package.json` enthält `"uat:live": "node scripts/live-uat.mjs"` — offizieller npm-Einstieg (D-02)
- `npm pack --dry-run` bestätigt: weder `scripts/live-uat.mjs` noch `scripts/live-uat.matrix.json` im Publish-Tarball (D-03)
- CONTRIBUTING.md Abschnitt **Live UAT Harness** dokumentiert Einstieg, `UAT_PROJECT_UUID`-Gate, alle vier Flags, Report-Interpretation, Exit-Codes 0/1/2, `v3_gaps`, Credential-Auflösung und Maintainer-only-Stance (UAT-06, D-21)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add uat:live script and verify npm pack excludes scripts/** - `40e1d0c` (feat)
2. **Task 2: Live UAT Harness section in CONTRIBUTING.md** - `cd9ffb5` (docs)

## Files Created/Modified

- `package.json` — `scripts.uat:live` hinzugefügt; `files`-Allowlist unverändert
- `CONTRIBUTING.md` — Abschnitt Live UAT Harness nach Local Setup

## Decisions Made

- Keine Änderung an `files`-Allowlist — bestehende Beschränkung auf `dist`, `.env.example`, `LICENSE` reicht
- Dokumentation nutzt ausschließlich Platzhalter (`<your-uat-project-uuid>`) — keine echten Tokens oder UUIDs (T-18-07)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None — Harness erfordert wie in CONTRIBUTING dokumentiert lokale Credentials und `UAT_PROJECT_UUID`.

## Next Phase Readiness

- Phase 18 Plan 04 abgeschlossen; Phase 18 kann zur verify-work-Welle übergehen
- Maintainer können `npm run uat:live` gemäß CONTRIBUTING ausführen und Reports interpretieren

## Self-Check: PASSED

- FOUND: package.json (uat:live script)
- FOUND: CONTRIBUTING.md (Live UAT Harness section)
- FOUND: commit 40e1d0c
- FOUND: commit cd9ffb5

---
*Phase: 18-live-uat-harness*
*Completed: 2026-07-23*
