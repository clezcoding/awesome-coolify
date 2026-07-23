---
phase: 17-local-manifest-sync
plan: 03
subsystem: api
tags: [manifest, auto-hooks, mcp-tool, vitest, d-09, d-11]

requires:
  - phase: 17-01
    provides: ManifestManager.autoUpsert/autoRemove, withWriteLock serialization
  - phase: 17-02
    provides: manifest MCP tool sync/diff baseline
provides:
  - autoUpsert/autoRemove hooks on application/service/database create/update/delete
  - _meta.manifestWarning best-effort degradation on hook failures (D-11)
affects: [18-uat]

tech-stack:
  added: []
  patterns:
    - "withManifestUpsert/withManifestRemove wrap successful mutation responses after primary API success"
    - "resolveEnvironmentUuid for create hooks when only environment_name provided"
    - "Hook failures attach _meta.manifestWarning without altering primary ok/data envelope"

key-files:
  created: []
  modified:
    - src/mcp/tools/application.ts
    - src/mcp/tools/application.test.ts
    - src/mcp/tools/service.ts
    - src/mcp/tools/service.test.ts
    - src/mcp/tools/database.ts
    - src/mcp/tools/database.test.ts

key-decisions:
  - "Per-handler helper duplication over shared manifest-hooks.ts — plan scoped three tool files only"
  - "resolveEnvironmentUuid on create when environment_name-only — matches buildCreateApiBody semantics"
  - "Service domains from urls[].url; database domains always [] — no fqdn on DB resources"

patterns-established:
  - "Pattern: auto-hook runs after primary Coolify mutation succeeds, before response return"
  - "Pattern: manifestWarning spread into existing _meta without overwriting truncated/chars fields"

requirements-completed: []

coverage:
  - id: D1
    description: "Application create/update/delete auto-upsert/remove with manifestWarning on hook failure"
    verification:
      - kind: unit
        ref: "src/mcp/tools/application.test.ts — manifestWarning create case"
        status: pass
    human_judgment: false
  - id: D2
    description: "Service create/update/delete auto-upsert/remove with manifestWarning on hook failure"
    verification:
      - kind: unit
        ref: "src/mcp/tools/service.test.ts — manifestWarning create case"
        status: pass
    human_judgment: false
  - id: D3
    description: "Database create/update/delete auto-upsert/remove with manifestWarning on hook failure"
    verification:
      - kind: unit
        ref: "src/mcp/tools/database.test.ts — manifestWarning create case"
        status: pass
    human_judgment: false

duration: 6min
completed: 2026-07-22
status: complete
---

# Phase 17 Plan 03: Mutation Auto-Hooks Summary

**ManifestManager autoUpsert/autoRemove wired into application, service, and database CRUD handlers with best-effort _meta.manifestWarning on cache failures — D-09/D-11 satisfied**

## Performance

- **Duration:** 6 min
- **Started:** 2026-07-22T16:52:00Z
- **Completed:** 2026-07-22T16:58:30Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Wired `ManifestManager.autoUpsert` after successful application/service/database create and update (including domain/url changes)
- Wired `ManifestManager.autoRemove` after successful delete in all three handlers
- Hook failures surface `_meta.manifestWarning` without failing the primary mutation response (D-11)
- No credentials passed into autoUpsert — uuid/type/name/domains/project+env UUIDs only
- Full suite green: 944 passed | 0 expected fail (944 total)

## Task Commits

1. **Task 1: Wire auto-upsert/remove hooks into application mutation handler** - `92cd57b` (feat)
2. **Task 2: Wire auto-upsert/remove hooks into service and database mutation handlers** - `af71f95` (feat)

## Files Created/Modified

- `src/mcp/tools/application.ts` — withManifestUpsert/Remove on create/update/delete
- `src/mcp/tools/application.test.ts` — manifestWarning path test + ManifestManager mock
- `src/mcp/tools/service.ts` — same hook pattern; service domains from urls[]
- `src/mcp/tools/service.test.ts` — manifestWarning path test
- `src/mcp/tools/database.ts` — same hook pattern; empty domains array
- `src/mcp/tools/database.test.ts` — manifestWarning path test

## Decisions Made

- Duplicated helper functions per handler file — plan scope limited to three tool files, no shared utility module
- Used `resolveEnvironmentUuid` on create when only `environment_name` provided — ensures upsert has environment UUID
- Service domains extracted from `urls[].url`; databases use `domains: []` — matches resource shape in manifest sync

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 18 UAT can verify manifest cache stays fresh after live CRUD mutations
- manifest.sync/diff + auto-hooks form closed loop for stale-cache recovery
- D-09 auto-hooks complete across all three resource mutation surfaces

## Self-Check: PASSED

- FOUND: src/mcp/tools/application.ts
- FOUND: src/mcp/tools/service.ts
- FOUND: src/mcp/tools/database.ts
- FOUND: 92cd57b
- FOUND: af71f95

---
*Phase: 17-local-manifest-sync*
*Completed: 2026-07-22*
