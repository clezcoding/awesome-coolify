---
phase: 11-service-database-crud
plan: 05
subsystem: mcp
tags: [database-update, database-delete, delete-preview, confirm-gate, masking, zod, vitest]

requires:
  - phase: 11-service-database-crud
    provides: updateDatabase/deleteDatabase client from 11-01
  - phase: 11-service-database-crud
    provides: handleDatabaseCreate + requireConfirmForPublicAccess from 11-03
  - phase: 11-service-database-crud
    provides: Wave 0 database update/delete/delete_preview RED scaffolds from 11-00
provides:
  - updateDatabaseSchema with curated PATCH fields + D-12 update-path confirm gate
  - deleteActionSchema + deletePreviewActionSchema with confirm/safe defaults (D-15, D-16)
  - handleDatabaseUpdate with fetchDatabase + sanitizeFullProjection (DB-02, SAF-04)
  - handleDatabaseDelete + handleDatabaseDeletePreview (DB-03, D-15)
  - service + database MCP tool descriptions listing full CRUD action surface
affects: []

tech-stack:
  added: []
  patterns:
    - "validateDeleteConfirm copy-pasted into database.ts per D-17 discretion"
    - "buildUpdatePayload curated allowlist; name omitted from PATCH when used as sole identity"
    - "delete_preview filters fetchResources by database_uuid — Phase 8/9/10 parity"

key-files:
  created: []
  modified:
    - src/mcp/tools/database.ts
    - src/mcp/tools/database.test.ts
    - src/mcp/server.ts
    - README.md

key-decisions:
  - "D-12 update-path confirm gate at schema level — mirrors create-path gate for safety consistency"
  - "validateDeleteConfirm copy-pasted from Phase 8/9/10 pattern per D-17 — no cross-file refactor"
  - "Post-update response via fetchDatabase + sanitizeFullProjection, not updateDatabase return body"

patterns-established:
  - "DATABASE_UPDATE_CURATED_FIELD_KEYS allowlist + buildUpdatePayload omitting MCP-layer fields"
  - "throwValidationError maps create|update strict failures to COOLIFY_VALIDATION_ERROR"

requirements-completed: [DB-02, DB-03]

coverage:
  - id: D1
    description: "updateDatabaseSchema rejects is_public without confirm and unknown fields before API call"
    requirement: DB-02
    verification:
      - kind: unit
        ref: "src/mcp/tools/database.test.ts#database update COOLIFY_CONFIRM_REQUIRED|SAF-03"
        status: pass
    human_judgment: false
  - id: D2
    description: "handleDatabaseUpdate patches curated fields and masks credentials unless reveal:true"
    requirement: DB-02
    verification:
      - kind: unit
        ref: "src/mcp/tools/database.test.ts#database update patches curated fields|masks postgres_password"
        status: pass
    human_judgment: false
  - id: D3
    description: "delete requires confirm:true with safe delete defaults false"
    requirement: DB-03
    verification:
      - kind: unit
        ref: "src/mcp/tools/database.test.ts#database delete deletes database|COOLIFY_CONFIRM_REQUIRED"
        status: pass
    human_judgment: false
  - id: D4
    description: "delete_preview returns would_delete + child_resources without calling deleteDatabase"
    requirement: DB-03
    verification:
      - kind: unit
        ref: "src/mcp/tools/database.test.ts#database delete_preview returns would_delete preview"
        status: pass
    human_judgment: false
  - id: D5
    description: "uuid|name identity resolution with COOLIFY_AMBIGUOUS_MATCH on multi-match"
    requirement: DB-02
    verification:
      - kind: unit
        ref: "src/mcp/tools/database.test.ts#database update|delete COOLIFY_AMBIGUOUS_MATCH"
        status: pass
    human_judgment: false

duration: 3min
completed: 2026-07-19
status: complete
---

# Phase 11 Plan 05: Database Update/Delete Summary

**Database update with curated PATCH + D-12 public-access confirm gate, confirm-gated delete with safe defaults, delete_preview two-stage model, and MCP tool description parity**

## Performance

- **Duration:** 3 min
- **Started:** 2026-07-19T07:04:48Z
- **Completed:** 2026-07-19T07:07:03Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- Added `updateDatabaseSchema`, `deleteActionSchema`, `deletePreviewActionSchema` to 8-action discriminatedUnion
- Implemented `handleDatabaseUpdate` — curated PATCH, fetchDatabase, SAF-04 masking via sanitizeFullProjection
- Implemented `handleDatabaseDelete` with `validateDeleteConfirm` and four safe-default flags (SAF-01, SAF-02)
- Implemented `handleDatabaseDeletePreview` — child_resources via database_uuid filter, no deleteDatabase call
- Updated service + database MCP tool descriptions and README action table for full CRUD surface
- Flipped 9 Wave 0 `it.fails` scaffolds to `it` — all 45 database tests GREEN; full suite 708 passed

## Task Commits

1. **Task 1: Add update/delete/delete_preview schemas** - `7030860` (test)
2. **Task 2: Implement handlers + flip tests GREEN** - `2b6afc9` (feat)
3. **Task 3: Update MCP tool descriptions** - `14af6be` (docs)

## Files Created/Modified

- `src/mcp/tools/database.ts` — schemas, validateDeleteConfirm, buildUpdatePayload, update/delete/delete_preview handlers
- `src/mcp/tools/database.test.ts` — flipped 9 it.fails → it; added fetchDatabase mock to update beforeEach
- `src/mcp/server.ts` — service + database tool descriptions enumerate create/update/delete/delete_preview
- `README.md` — service/database action table updated

## Decisions Made

- D-12 update-path confirm gate enforced at schema superRefine (same as create-path)
- Copy-pasted `validateDeleteConfirm` into database.ts per D-17 discretion
- Post-update response fetched via fetchDatabase for consistent SAF-04 masking (not updateDatabase return body)
- README action table updated alongside server.ts per CONTEXT integration points

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 11 complete: all SVC-06..SVC-10 and DB-01..DB-04 requirements implemented
- Full service + database CRUD on existing MCP tools (D-14)

## Self-Check: PASSED

- FOUND: .planning/phases/11-service-database-crud/11-05-SUMMARY.md
- FOUND: src/mcp/tools/database.ts
- FOUND: src/mcp/tools/database.test.ts
- FOUND: src/mcp/server.ts
- FOUND: 7030860
- FOUND: 2b6afc9
- FOUND: 14af6be

---
*Phase: 11-service-database-crud*
*Completed: 2026-07-19*
