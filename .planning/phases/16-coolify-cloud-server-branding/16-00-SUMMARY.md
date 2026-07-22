---
phase: 16-coolify-cloud-server-branding
plan: 00
subsystem: testing
tags: [vitest, tdd, red-scaffold, coolify-cloud, mcp-branding]

requires: []
provides:
  - RED scaffolds for McpServer branding metadata (BRND-01/BRND-03)
  - RED scaffolds for cloud hostname error mapping (CLD-02, D-03)
  - RED scaffolds for instance.cloud-info action (CLD-01, D-16/D-17)
affects: [16-01, 16-02, 16-03, 16-04]

tech-stack:
  added: []
  patterns:
    - "Wave 0 it.fails RED scaffolds — husky pre-commit green until Plans 16-01..16-03 flip GREEN"

key-files:
  created: []
  modified:
    - src/mcp/server.test.ts
    - src/utils/errors.test.ts
    - src/mcp/tools/instance.test.ts

key-decisions:
  - "it.fails for all not-yet-implemented assertions; regular it only for self-hosted negative case (already GREEN)"
  - "cloud-info invalid-instance scaffold asserts instance-path Zod issue — fails until cloud-info branch ships in 16-02"

patterns-established:
  - "Phase 16 Wave 0: 19 it.fails blocks across 3 test files; flip to it in 16-01..16-03"

requirements-completed: [CLD-01, CLD-02, BRND-01, BRND-03]

coverage:
  - id: D1
    description: "McpServer branding metadata RED scaffolds (title, description, websiteUrl, icons)"
    requirement: BRND-01
    verification:
      - kind: unit
        ref: "src/mcp/server.test.ts#McpServer branding metadata"
        status: pass
    human_judgment: false
  - id: D2
    description: "package.json description parity scaffold (BRND-03)"
    requirement: BRND-03
    verification:
      - kind: unit
        ref: "src/mcp/server.test.ts#package.json description appears verbatim"
        status: pass
    human_judgment: false
  - id: D3
    description: "Cloud hostname 403/404 error mapping RED scaffolds (CLD-02)"
    requirement: CLD-02
    verification:
      - kind: unit
        ref: "src/utils/errors.test.ts#Cloud hostname error mapping"
        status: pass
    human_judgment: false
  - id: D4
    description: "Self-hosted hostname unaffected by cloud error codes (D-03)"
    requirement: CLD-02
    verification:
      - kind: unit
        ref: "src/utils/errors.test.ts#self-hosted hostname 403 does not map"
        status: pass
    human_judgment: false
  - id: D5
    description: "instance.cloud-info action RED scaffolds (env/registry/infer sources, D-16/D-17)"
    requirement: CLD-01
    verification:
      - kind: unit
        ref: "src/mcp/tools/instance.test.ts#instance cloud-info action"
        status: pass
    human_judgment: false

duration: 4min
completed: 2026-07-22
status: complete
---

# Phase 16 Plan 00: Wave 0 RED Scaffolds Summary

**19 it.fails RED scaffolds pin Coolify Cloud error mapping, MCP server branding metadata, and instance.cloud-info contracts across three test files**

## Performance

- **Duration:** 4 min
- **Started:** 2026-07-22T01:30:00Z
- **Completed:** 2026-07-22T01:34:00Z
- **Tasks:** 1
- **Files modified:** 3

## Accomplishments

- Appended 6 `it.fails` blocks to `server.test.ts` pinning BRND-01/BRND-03 McpServer constructor metadata literals
- Appended 6 `it.fails` + 1 passing `it` to `errors.test.ts` pinning CLD-02 cloud hostname 403/404 mapping and D-03 self-hosted isolation
- Appended 7 `it.fails` blocks to `instance.test.ts` pinning CLD-01 cloud-info action with env/registry/infer source paths (D-16/D-17)
- Full suite green: 898 passed, 19 expected fail; `npm run build` green

## Task Commits

1. **Task 1: RED scaffold server.test.ts branding + errors.test.ts cloud mapping + instance.test.ts cloud-info** - `82b088b` (test)

**Plan metadata:** pending (docs commit follows)

## Files Created/Modified

- `src/mcp/server.test.ts` — 6 branding metadata `it.fails` scaffolds via readFileSync source assertions
- `src/utils/errors.test.ts` — cloud hostname error mapping scaffolds (6 fails + 1 green self-hosted negative)
- `src/mcp/tools/instance.test.ts` — cloud-info action scaffolds with tmp registry + env cleanup

## Decisions Made

- Invalid-instance schema scaffold asserts Zod `instance` path issue (not just unknown action) so it stays RED until 16-02 ships cloud-info branch
- Self-hosted 403 negative case uses regular `it` — already passes today (403 → COOLIFY_500, not COOLIFY_CLOUD_*)

## Deviations from Plan

None - plan executed exactly as written.

## TDD Gate Compliance

- RED gate: `test(16-00)` commit `82b088b` present
- GREEN gate: intentionally absent — Wave 0 scaffolds only; Plans 16-01..16-03 flip to GREEN
- REFACTOR gate: N/A

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 16-01 can implement cloud hostname detection in `errors.ts` and flip errors.test.ts scaffolds GREEN
- Plan 16-02 can wire `cloud-info` action in `instance.ts`
- Plan 16-03 can wire McpServer branding metadata in `server.ts`

---
*Phase: 16-coolify-cloud-server-branding*
*Completed: 2026-07-22*

## Self-Check: PASSED

- FOUND: `.planning/phases/16-coolify-cloud-server-branding/16-00-SUMMARY.md`
- FOUND: `src/mcp/server.test.ts`
- FOUND: `src/utils/errors.test.ts`
- FOUND: `src/mcp/tools/instance.test.ts`
- FOUND: commit `82b088b`
