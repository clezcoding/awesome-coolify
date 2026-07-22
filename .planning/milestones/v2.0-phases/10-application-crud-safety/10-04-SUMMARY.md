---
phase: 10-application-crud-safety
plan: 04
subsystem: api
tags: [application-delete, delete-preview, confirm-gate, safe-defaults, tdd, wave-4, saf]

requires:
  - phase: 10-application-crud-safety
    provides: deleteApplication client + Wave 0 RED scaffolds (10-01, 10-00)
  - phase: 10-application-crud-safety
    provides: resolveAppMutationUuid identity resolution (10-03)
provides:
  - deleteActionSchema with confirm gate and four destructive flags default false
  - deletePreviewActionSchema with uuid|name|fqdn identity only
  - handleApplicationDelete + handleApplicationDeletePreview — canonical SAF reference for Phase 11
  - 5 GREEN delete/delete_preview tests (Wave 0 scaffolds flipped)
affects: [11-service-database-delete]

tech-stack:
  added: []
  patterns:
    - "validateDeleteConfirm copied from Phase 8/9 server/project pattern (D-17, D-18)"
    - "deleteApplication query params override Coolify API true defaults to false at Zod layer (SAF-02, D-19)"
    - "delete_preview child_resources filtered by application_uuid — non-blocking warning (D-18)"

key-files:
  created: []
  modified:
    - src/mcp/tools/application.ts
    - src/mcp/tools/application.test.ts

key-decisions:
  - "Task 1 schema-only commit preserves it.fails scaffolds for husky green; handlers + flips in Task 2"
  - "validateDeleteConfirm copy-pasted into application.ts per D-17 — no shared util extraction"
  - "delete_preview filters fetchResources by application_uuid; empty array when no parent link"

patterns-established:
  - "Canonical SAF delete reference: confirm gate + four false defaults + delete_preview two-stage model"
  - "Phase 11 service/database delete should mirror this handler structure"

requirements-completed: [APP-18, SAF-01, SAF-02]

coverage:
  - id: D1
    description: "deleteActionSchema with confirm and four destructive flags default false"
    requirement: SAF-02
    verification:
      - kind: unit
        ref: "src/mcp/tools/application.test.ts#passes all four safe-delete flags false by default per SAF-02"
        status: pass
    human_judgment: false
  - id: D2
    description: "delete requires confirm:true or returns COOLIFY_CONFIRM_REQUIRED"
    requirement: SAF-01
    verification:
      - kind: unit
        ref: "src/mcp/tools/application.test.ts#returns COOLIFY_CONFIRM_REQUIRED when confirm is false per SAF-01"
        status: pass
    human_judgment: false
  - id: D3
    description: "handleApplicationDelete calls deleteApplication with safe defaults and returns deleted response"
    requirement: APP-18
    verification:
      - kind: unit
        ref: "src/mcp/tools/application.test.ts#deletes application when confirm:true with safe defaults per APP-18"
        status: pass
    human_judgment: false
  - id: D4
    description: "delete resolves identity by fqdn single-hit via resolveAppMutationUuid"
    requirement: APP-18
    verification:
      - kind: unit
        ref: "src/mcp/tools/application.test.ts#resolves delete by fqdn single-hit per D-21"
        status: pass
    human_judgment: false
  - id: D5
    description: "delete_preview returns would_delete + child_resources without calling deleteApplication"
    requirement: APP-18
    verification:
      - kind: unit
        ref: "src/mcp/tools/application.test.ts#returns would_delete preview without calling deleteApplication per Phase 8/9 parity"
        status: pass
    human_judgment: false

duration: 7min
completed: 2026-07-19
status: complete
---

# Phase 10 Plan 04: Application Delete + Delete Preview Summary

**Confirm-gated application delete with four safe-default flags and non-destructive delete_preview — canonical SAF reference for Phase 11**

## Performance

- **Duration:** 7 min
- **Started:** 2026-07-19T05:10:00Z
- **Completed:** 2026-07-19T05:17:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Added `deleteActionSchema` and `deletePreviewActionSchema` with uuid|name|fqdn identity (D-21), confirm default false (SAF-01), four destructive flags default false (SAF-02)
- Implemented `validateDeleteConfirm`, `handleApplicationDelete`, and `handleApplicationDeletePreview` wired into `handleApplicationAction`
- Flipped 5 Wave 0 `it.fails` delete/delete_preview scaffolds to GREEN; 638 passed full suite; build green

## Task Commits

Each task was committed atomically:

1. **Task 1: Add deleteActionSchema + deletePreviewActionSchema** - `45d48a7` (feat)
2. **Task 2: Implement handleApplicationDelete + handleApplicationDeletePreview** - `9dbff3a` (feat)

**Plan metadata:** skipped (commit_docs: false)

## Files Created/Modified

- `src/mcp/tools/application.ts` — delete schemas, validateDeleteConfirm, delete/delete_preview handlers, deleteApplication import
- `src/mcp/tools/application.test.ts` — flip 5 delete/delete_preview tests GREEN

## Decisions Made

- Task 1 schema-only commit preserves `it.fails` scaffolds for husky pre-commit green; handlers + test flips in Task 2
- `validateDeleteConfirm` copy-pasted per D-17 discretion — no shared util extraction
- `delete_preview` filters `fetchResources` by `application_uuid`; empty `child_resources` when API lacks parent link

## Deviations from Plan

None - plan executed exactly as written.

## TDD Gate Compliance

- RED gate: Wave 0 `it.fails` scaffolds from 10-00
- GREEN gate: feat(10-application-crud-safety-04) commits 45d48a7 (schema), 9dbff3a (handler + test flips)
- Schema-only Task 1 commit preserves RED handler scaffolds for husky pre-commit green

## Issues Encountered

None

## User Setup Required

None

## Next Phase Readiness

- Phase 10 complete — all 5 plans executed; application CRUD + SAF patterns shipped
- Phase 11 service/database delete can mirror `handleApplicationDelete` + `delete_preview` structure
- No blockers

## Self-Check: PASSED

- FOUND: src/mcp/tools/application.ts (deleteActionSchema + handleApplicationDelete + handleApplicationDeletePreview)
- FOUND: src/mcp/tools/application.test.ts (5 delete/delete_preview tests GREEN)
- FOUND: 45d48a7
- FOUND: 9dbff3a
- FOUND: npm run build green
- FOUND: npx vitest run -t "application (delete|delete_preview)" — 5 passed
- FOUND: npm run test — 638 passed

---
*Phase: 10-application-crud-safety*
*Completed: 2026-07-19*
