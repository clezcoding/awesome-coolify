---
phase: 11-service-database-crud
plan: 04
subsystem: mcp
tags: [service-update, service-delete, delete-preview, compose, zod, confirm-gate, vitest]

requires:
  - phase: 11-service-database-crud
    provides: createService/updateService/deleteService client + yaml-validator from 11-01
  - phase: 11-service-database-crud
    provides: handleServiceCreate + resolveServiceMutationUuid from 11-02
  - phase: 11-service-database-crud
    provides: Wave 0 service update/delete/delete_preview RED scaffolds from 11-00
provides:
  - updateActionSchema with curated PATCH fields + compose XOR (D-04, D-20, SAF-03)
  - deleteActionSchema + deletePreviewActionSchema with confirm/safe defaults (D-15, D-16, SAF-01, SAF-02)
  - handleServiceUpdate with compose I/O, D-06 projection, 409 recovery hint (SVC-08, SVC-10, D-19)
  - handleServiceDelete + handleServiceDeletePreview (SVC-09, D-15)
affects: [11-05]

tech-stack:
  added: []
  patterns:
    - "validateDeleteConfirm copy-pasted into service.ts per D-17 discretion"
    - "readFileSync for update compose_file — mirrors 11-02 create path and test mocks"
    - "buildUpdatePayload curated allowlist with force_domain_override only when true"

key-files:
  created: []
  modified:
    - src/mcp/tools/service.ts
    - src/mcp/tools/service.test.ts

key-decisions:
  - "readFileSync (not fs.promises.readFile) for update compose_file — matches 11-02 create deviation and Wave 0 test vi.mock"
  - "validateDeleteConfirm copy-pasted from Phase 8/9/10 pattern per D-17 — no cross-file refactor"
  - "SAF-03 strict schema test flipped GREEN in Task 1; handler tests flipped in Task 2"

patterns-established:
  - "SERVICE_UPDATE_CURATED_FIELD_KEYS allowlist + buildUpdatePayload omitting MCP-layer fields"
  - "delete_preview filters fetchResources by service_uuid — Phase 8/9/10 parity"

requirements-completed: [SVC-08, SVC-09]

coverage:
  - id: D1
    description: "updateActionSchema rejects compose XOR violations and unknown fields before API call"
    requirement: SVC-08
    verification:
      - kind: unit
        ref: "src/mcp/tools/service.test.ts#service update rejects unknown update fields"
        status: pass
    human_judgment: false
  - id: D2
    description: "handleServiceUpdate patches compose via base64 docker_compose_raw and returns decoded compose"
    requirement: SVC-08
    verification:
      - kind: unit
        ref: "src/mcp/tools/service.test.ts#service update patches compose|returns decoded compose"
        status: pass
    human_judgment: false
  - id: D3
    description: "delete requires confirm:true with safe delete defaults false"
    requirement: SVC-09
    verification:
      - kind: unit
        ref: "src/mcp/tools/service.test.ts#service delete deletes service|returns COOLIFY_CONFIRM_REQUIRED"
        status: pass
    human_judgment: false
  - id: D4
    description: "delete_preview returns would_delete + child_resources without calling deleteService"
    requirement: SVC-09
    verification:
      - kind: unit
        ref: "src/mcp/tools/service.test.ts#service delete_preview returns would_delete preview"
        status: pass
    human_judgment: false
  - id: D5
    description: "uuid|name identity resolution with COOLIFY_AMBIGUOUS_MATCH on multi-match"
    requirement: SVC-08
    verification:
      - kind: unit
        ref: "src/mcp/tools/service.test.ts#service update|delete COOLIFY_AMBIGUOUS_MATCH"
        status: pass
    human_judgment: false

duration: 3min
completed: 2026-07-19
status: complete
---

# Phase 11 Plan 04: Service Update/Delete Summary

**Service update with curated PATCH + transparent compose I/O, confirm-gated delete with safe defaults, and delete_preview two-stage model**

## Performance

- **Duration:** 3 min
- **Started:** 2026-07-19T07:00:00Z
- **Completed:** 2026-07-19T07:03:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Added `updateActionSchema`, `deleteActionSchema`, `deletePreviewActionSchema` to 9-action discriminatedUnion
- Implemented `handleServiceUpdate` — compose validate/encode, curated PATCH, fetchService + projectServiceCompose (D-06), 409 hint
- Implemented `handleServiceDelete` with `validateDeleteConfirm` and four safe-default flags (SAF-01, SAF-02)
- Implemented `handleServiceDeletePreview` — child_resources via service_uuid filter, no deleteService call
- Flipped 8 Wave 0 `it.fails` scaffolds to `it` — all 43 service tests GREEN; full suite 699 passed | 9 expected fail

## Task Commits

1. **Task 1: Add update/delete/delete_preview schemas** - `658587d` (test)
2. **Task 2: Implement handlers + flip tests GREEN** - `5726755` (feat)

## Files Created/Modified

- `src/mcp/tools/service.ts` — schemas, validateDeleteConfirm, buildUpdatePayload, update/delete/delete_preview handlers
- `src/mcp/tools/service.test.ts` — flipped 8 it.fails → it; added fetchService mock to update beforeEach

## Decisions Made

- Used `readFileSync` for update `compose_file` to match 11-02 create path and Wave 0 test mocks (plan specified fs.promises.readFile)
- Copy-pasted `validateDeleteConfirm` into service.ts per D-17 discretion
- Flipped SAF-03 schema test in Task 1 commit; handler tests in Task 2 commit

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] readFileSync instead of fs.promises.readFile for update compose_file**
- **Found during:** Task 2 (handleServiceUpdate compose_file path)
- **Issue:** Plan specified fs.promises.readFile; 11-02 established readFileSync pattern with matching test vi.mock
- **Fix:** Used readFileSync with 1 MiB cap and COOLIFY_VALIDATION_ERROR on read failure
- **Files modified:** src/mcp/tools/service.ts
- **Verification:** compose patch tests GREEN
- **Committed in:** 5726755

None other — plan executed as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 11-05: database update/delete handlers — remaining database it.fails scaffolds
- Service MCP CRUD complete (create/update/delete/delete_preview + lifecycle)

## Self-Check: PASSED

- FOUND: .planning/phases/11-service-database-crud/11-04-SUMMARY.md
- FOUND: src/mcp/tools/service.ts
- FOUND: src/mcp/tools/service.test.ts
- FOUND: 658587d
- FOUND: 5726755

---
*Phase: 11-service-database-crud*
*Completed: 2026-07-19*
