---
phase: 18-live-uat-harness
plan: 01
subsystem: testing
tags: [uat, mcp, tsx, zod, live-harness, matrix]

requires:
  - phase: 17-local-manifest-sync
    provides: manifest tool actions and InstanceManager credential resolution
provides:
  - Declarative coverage matrix for all 16 MCP tools plus tools/list
  - Harness skeleton with tsx respawn, credential chain, token redaction, UAT_PROJECT_UUID gate
  - Module-level uatState for downstream stdio/in-process runners
affects: [18-02, 18-03, 18-04, uat:live]

tech-stack:
  added: []
  patterns:
    - tsx respawn guard with TSX_ACTIVE env
    - Declarative JSON matrix with suite smoke|v3|full filtering
    - Early UAT_PROJECT_UUID gate before TypeScript dynamic imports

key-files:
  created:
    - scripts/live-uat.matrix.json
    - scripts/live-uat.mjs
  modified: []

key-decisions:
  - "UAT_PROJECT_UUID gate runs before dynamic .ts imports so plan verify (node + TSX_ACTIVE) exits 2 without tsx loader"
  - "Matrix uses suite plain string v3 on mandatory rows — not suite:v3 tag strings"

patterns-established:
  - "Pattern: live-uat.mjs exports uatState { cli, routingEnv, matrix, redact, toolsCovered } for runner plans"
  - "Pattern: redact() replaces routingEnv.COOLIFY_TOKEN with *** on every JSON envelope"

requirements-completed: [UAT-01, UAT-02, UAT-04, UAT-05]

coverage:
  - id: D1
    description: "Declarative matrix covers all registerTool names plus tools/list stdio row and v3 mandatory rows"
    requirement: UAT-01
    verification:
      - kind: other
        ref: "node matrix verify script (18-01-PLAN Task 1)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Harness skeleton resolves credentials without printing COOLIFY_TOKEN"
    requirement: UAT-02
    verification:
      - kind: integration
        ref: "node spawn empty UAT_PROJECT_UUID gate test (18-01-PLAN Task 2)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Matrix includes v3 manifest sync dry_run row for write/sync coverage without mutation"
    requirement: UAT-04
    verification:
      - kind: other
        ref: "node matrix verify script manifest sync dry_run row"
        status: pass
    human_judgment: false
  - id: D4
    description: "UAT_PROJECT_UUID identity gate aborts with exit 2 when unset or empty"
    requirement: UAT-05
    verification:
      - kind: integration
        ref: "node spawn empty UAT_PROJECT_UUID gate test"
        status: pass
    human_judgment: false

duration: 3min
completed: 2026-07-23
status: complete
---

# Phase 18 Plan 01: Matrix + Skeleton Summary

**Deklarative UAT-Matrix (27 Zeilen, 16 Tools) und Harness-Skeleton mit tsx-Respawn, Credential-Kette, Token-Redaction und UAT_PROJECT_UUID-Gate — noch ohne Testausführung**

## Performance

- **Duration:** 3 min
- **Started:** 2026-07-23T18:13:38Z
- **Completed:** 2026-07-23T18:16:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- `scripts/live-uat.matrix.json` deckt alle 16 `registerTool`-Namen ab plus `tools/list` (stdio), fünf v3-Pflichtzeilen (Multi-Instance explizit/ohne, cloud-info, manifest get/diff/sync dry_run) und full-Suite write/destructive Zeilen
- `scripts/live-uat.mjs` respawnt via `npx tsx`, löst Credentials aus mcp.json → env → InstanceManager auf, redacted alle Ausgaben, bricht bei fehlendem `UAT_PROJECT_UUID` mit Exit 2 ab
- `uatState`-Export bereit für Plan 18-02/03 (stdio/in-process Runner und Report-Writer)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create declarative coverage matrix** - `af32f26` (feat)
2. **Task 2: Harness skeleton — tsx respawn, CLI args, credentials, redaction, UAT gate, matrix loader** - `2c14ef2` (feat)

## Files Created/Modified

- `scripts/live-uat.matrix.json` — Committed declarative test matrix (smoke/v3/full suites)
- `scripts/live-uat.mjs` — Skeleton entry point with credential resolution and identity gate

## Decisions Made

- UAT_PROJECT_UUID-Prüfung vor dynamischen TypeScript-Imports, damit der Plan-Verify-Lauf (`node` + `TSX_ACTIVE=true`) ohne tsx-Loader sauber Exit 2 liefert
- v3-Zeilen tragen `suite: "v3"` als Plain-String (kein `suite:v3`-Tag)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] UAT_PROJECT_UUID gate before TypeScript imports**
- **Found during:** Task 2 (Harness skeleton)
- **Issue:** Plan-Verify spawnt `node scripts/live-uat.mjs` mit `TSX_ACTIVE=true`; Top-Level `.ts`-Imports scheitern unter plain Node
- **Fix:** UUID-Gate und JSON-Abort vor `import('../src/...ts')`; voller Pfad nur bei gesetztem UUID
- **Files modified:** scripts/live-uat.mjs
- **Verification:** `exit-2 gate OK` verify script passes
- **Committed in:** 2c14ef2

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Minimal — Gate-Verhalten unverändert, nur Import-Reihenfolge angepasst

## Issues Encountered

None beyond the import-order fix documented above.

## User Setup Required

None — Harness erwartet lokal konfigurierte Credentials und `UAT_PROJECT_UUID` (Dokumentation folgt in Plan 18-04).

## Next Phase Readiness

- Plan 18-02 kann stdio- und in-process-Runner an `uatState` anbinden
- Keine Blocker; Skeleton liefert `{ status: "skeleton-ready", rows, toolsCovered }` bei gültigem Setup

## Self-Check: PASSED

- FOUND: scripts/live-uat.matrix.json
- FOUND: scripts/live-uat.mjs
- FOUND: commit af32f26
- FOUND: commit 2c14ef2

---
*Phase: 18-live-uat-harness*
*Completed: 2026-07-23*
