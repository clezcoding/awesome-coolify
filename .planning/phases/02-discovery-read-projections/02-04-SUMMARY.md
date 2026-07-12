---
phase: 02-discovery-read-projections
plan: 04
subsystem: api
tags: [mcp, resource-find, docs-search, discovery, coolify-docs]

requires:
  - phase: 02-discovery-read-projections
    provides: Shared projections, formatters, resource.list from 02-01/02-02
provides:
  - resource.find cross-type discovery with relevance ranking per D-17–D-20
  - docs.search static DOCS_INDEX for troubleshooting and config guides per D-03
  - docs MCP tool registration with readOnlyHint per D-22
affects: [02-05, 03-01]

tech-stack:
  added: []
  patterns:
    - "Cross-type find merges projected resources and servers with 10-match cap"
    - "Four-tier relevance ranking: exact name, uuid, domain/IP contains, name substring"
    - "Static DOCS_INDEX search separate from Coolify API per D-03 discretion"

key-files:
  created:
    - src/mcp/tools/docs.ts
    - src/mcp/tools/docs.test.ts
  modified:
    - src/mcp/tools/resource.ts
    - src/mcp/tools/resource.test.ts
    - src/mcp/server.ts
    - src/mcp/server.test.ts

key-decisions:
  - "find caps at 10 ranked matches before pagination — no ambiguity error per D-19"
  - "docs tool is separate module with static DOCS_INDEX not live API fetch per D-03"
  - "Server entries mapped with type server and IP stored in fqdn for IP/domain search per D-20"

patterns-established:
  - "Find handler: parallel fetchResources+fetchServers → filter → rank → cap(10) → paginate → buildReadResponse"
  - "Docs handler: search title/keywords/content → markdown format → truncateAndGuard"

requirements-completed: [SYS-06, SYS-07]

coverage:
  - id: D1
    description: "resource.find cross-type discovery with query auto-detect and explicit fields"
    requirement: SYS-06
    verification:
      - kind: unit
        ref: "src/mcp/tools/resource.test.ts#handleResourceAction find"
        status: pass
    human_judgment: false
  - id: D2
    description: "docs.search static documentation index with truncation"
    requirement: SYS-07
    verification:
      - kind: unit
        ref: "src/mcp/tools/docs.test.ts#handleDocsAction search"
        status: pass
    human_judgment: false
  - id: D3
    description: "docs tool and resource find registered in MCP server with readOnlyHint"
    requirement: SYS-07
    verification:
      - kind: unit
        ref: "src/mcp/server.test.ts#registers system meta resource application service database and docs tools"
        status: pass
      - kind: other
        ref: "npx vitest run"
        status: pass
    human_judgment: false

duration: 3min
completed: 2026-07-12
status: complete
---

# Phase 02 Plan 04: Resource Find + Docs Search Summary

**Cross-type resource.find with relevance-ranked fuzzy matching and separate docs.search static index for Coolify troubleshooting guides**

## Performance

- **Duration:** 3 min
- **Started:** 2026-07-12T02:37:00Z
- **Completed:** 2026-07-12T02:40:19Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments

- `resource.find` scans applications, services, databases, and servers with query auto-detect and explicit uuid/name/domain/ip fields
- Relevance ranking prioritizes exact name, UUID, domain/IP contains, then name substring; capped at 10 matches per D-19
- `docs.search` queries 11-entry static DOCS_INDEX covering FQDN, deployment failures, backups, env vars, and more
- MCP server registers separate `docs` tool with `readOnlyHint: true` per D-03 and D-22

## Task Commits

Each task was committed atomically:

1. **Task 1: resource.find cross-type discovery handler** - `a308202` (feat)
2. **Task 2: docs.search static documentation index** - `1df7d39` (feat)
3. **Task 3: Register docs tool and verify resource find in MCP server** - `25b166d` (feat)

**Plan metadata:** `528f63d` (docs: complete plan)

## Files Created/Modified

- `src/mcp/tools/resource.ts` - Added find action with cross-type search, ranking, and validation
- `src/mcp/tools/resource.test.ts` - Find scenarios for UUID, name, server scope, cap, and validation
- `src/mcp/tools/docs.ts` - Static DOCS_INDEX and docs.search handler
- `src/mcp/tools/docs.test.ts` - Hit, miss, and truncation tests
- `src/mcp/server.ts` - Registered docs tool; updated resource description
- `src/mcp/server.test.ts` - Asserts 7 tools including docs and resource find schema

## Decisions Made

- find returns ranked list capped at 10 — agent picks UUID, no ambiguity error per D-19
- docs uses curated static index — no external fetch attack surface per T-2-06
- Server IP stored in fqdn field for unified domain/IP contains matching

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Discovery slice complete — ready for 02-05 integration tests and validation sign-off
- resource.find and docs.search available for agent orientation before mutating operations

## Self-Check: PASSED

- `npx vitest run src/mcp/tools/resource.test.ts` — 13 tests passed
- `npx vitest run src/mcp/tools/docs.test.ts` — 7 tests passed
- `npx vitest run` — 116 tests passed
- `grep -v '^#' src/mcp/server.ts | grep -c "'docs'"` — 1 match

---
*Phase: 02-discovery-read-projections*
*Completed: 2026-07-12*
