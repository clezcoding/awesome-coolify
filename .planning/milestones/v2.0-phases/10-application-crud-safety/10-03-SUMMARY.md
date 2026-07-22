---
phase: 10-application-crud-safety
plan: 03
subsystem: api
tags: [application-update, zod, patch, basic-auth, secret-masking, tdd, wave-3]

requires:
  - phase: 10-application-crud-safety
    provides: Wave 1 updateApplication client + 409 conflicts passthrough (10-01)
  - phase: 10-application-crud-safety
    provides: create handler patterns + force_domain_override hint (10-02)
provides:
  - updateActionSchema with curated PATCH fields + HTTP basic auth + force_domain_override
  - handleApplicationUpdate with identity resolution, masking, 409 recovery
  - 9 GREEN application update handler tests (Wave 0 scaffolds flipped)
affects: [10-04, 11-service-database-update]

tech-stack:
  added: []
  patterns:
    - "UPDATE_CURATED_FIELD_KEYS allowlist for PATCH body building (D-13)"
    - "Post-update fetchApplication + sanitizeFullProjection for SAF-04 response masking"
    - "force_domain_override included in PATCH only when explicitly true (D-10)"

key-files:
  created: []
  modified:
    - src/mcp/tools/application.ts
    - src/mcp/tools/application.test.ts

key-decisions:
  - "Task 1 schema-only commit passes husky with it.fails scaffolds; handler deferred to Task 2"
  - "409 force_domain_override hint reused from toStructuredError global enrichment (10-02)"
  - "Update validation strict rejections map to COOLIFY_VALIDATION_ERROR like create"

patterns-established:
  - "buildUpdatePayload omits MCP-layer fields; force_domain_override gated on explicit true"
  - "fetchApplication post-PATCH for response state; sanitizeFullProjection with reveal param"

requirements-completed: [APP-17, APP-19, APP-21, SAF-03, SAF-04]

coverage:
  - id: D1
    description: "updateActionSchema curated fields + strict + identity superRefine"
    requirement: SAF-03
    verification:
      - kind: unit
        ref: "src/mcp/tools/application.test.ts#rejects unknown update fields"
        status: pass
    human_judgment: false
  - id: D2
    description: "handleApplicationUpdate PATCH curated payload and returns updated state"
    requirement: APP-17
    verification:
      - kind: unit
        ref: "src/mcp/tools/application.test.ts#patches curated fields"
        status: pass
    human_judgment: false
  - id: D3
    description: "HTTP basic auth fields accepted on update path"
    requirement: APP-19
    verification:
      - kind: unit
        ref: "src/mcp/tools/application.test.ts#passes HTTP basic auth fields"
        status: pass
    human_judgment: false
  - id: D4
    description: "http_basic_auth_password masked unless reveal:true"
    requirement: SAF-04
    verification:
      - kind: unit
        ref: "src/mcp/tools/application.test.ts#masks http_basic_auth_password"
        status: pass
    human_judgment: false
  - id: D5
    description: "409 domain conflict + force_domain_override happy-path override"
    requirement: APP-21
    verification:
      - kind: unit
        ref: "src/mcp/tools/application.test.ts#maps update HTTP 409"
        status: pass
    human_judgment: false

duration: 6min
completed: 2026-07-19
status: complete
---

# Phase 10 Plan 03: Application Update Handler Summary

**Curated application update PATCH with HTTP basic auth, secret masking, and 409 force_domain_override recovery**

## Performance

- **Duration:** 6 min
- **Started:** 2026-07-19T05:04:00Z
- **Completed:** 2026-07-19T05:10:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Added `updateActionSchema` with curated PATCH fields, HTTP basic auth (D-14), `force_domain_override` (D-10), and `reveal` for SAF-04
- Implemented `handleApplicationUpdate` — resolves uuid|name|fqdn (D-21), builds curated payload, PATCH via `updateApplication`, fetches post-update state with `sanitizeFullProjection` masking (D-16)
- Flipped 9 Wave 0 `it.fails` update scaffolds to GREEN; 633 passed | 5 expected fail full suite; build green

## Task Commits

Each task was committed atomically:

1. **Task 1: Add updateActionSchema — curated fields + basic auth + force_domain_override** - `7b61a98` (feat)
2. **Task 2: Implement handleApplicationUpdate — identity resolution, curated PATCH, masking, 409 mapping** - `a3bdee2` (feat)

**Plan metadata:** skipped (commit_docs: false)

## Files Created/Modified

- `src/mcp/tools/application.ts` — updateActionSchema, buildUpdatePayload, handleApplicationUpdate, COOLIFY_VALIDATION_ERROR for update
- `src/mcp/tools/application.test.ts` — flip 9 update tests GREEN; fetchApplication mocks in update beforeEach

## Decisions Made

- Task 1 schema-only commit passes husky with remaining `it.fails` scaffolds; handler + test flips in Task 2
- 409 recovery hint reused from global `toStructuredError` enrichment (10-02) — no handler-local catch needed
- `fetchApplication` post-PATCH ensures response reflects Coolify stored state per plan

## Deviations from Plan

None - plan executed exactly as written.

## TDD Gate Compliance

- RED gate: Wave 0 `it.fails` scaffolds from 10-00
- GREEN gate: feat(10-application-crud-safety-03) commits 7b61a98 (schema), a3bdee2 (handler + test flips)
- Schema-only Task 1 commit preserves RED handler scaffolds for husky pre-commit green

## Issues Encountered

None

## User Setup Required

None

## Next Phase Readiness

- Plan 10-04 can wire delete/delete_preview handlers using same identity resolution patterns
- Phase 11 service/database update can mirror updateActionSchema + handleApplicationUpdate structure
- 5 delete/delete_preview `it.fails` scaffolds remain RED until 10-04

## Self-Check: PASSED

- FOUND: src/mcp/tools/application.ts (updateActionSchema + handleApplicationUpdate)
- FOUND: src/mcp/tools/application.test.ts (9 update tests GREEN)
- FOUND: 7b61a98
- FOUND: a3bdee2
- FOUND: npm run build green
- FOUND: npx vitest run -t "application update" — 9 passed

---
*Phase: 10-application-crud-safety*
*Completed: 2026-07-19*
