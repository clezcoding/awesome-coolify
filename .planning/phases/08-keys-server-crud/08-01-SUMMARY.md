---
phase: 08-keys-server-crud
plan: 01
subsystem: api
tags: [ofetch, coolify-api, pem-masking, error-codes, resource-list]

requires:
  - phase: 08-keys-server-crud
    provides: Wave 0 RED scaffolds (private_key.test.ts, server.test.ts)
provides:
  - fetchPrivateKeys/fetchPrivateKey/createPrivateKey/updatePrivateKey/deletePrivateKey client functions
  - createServer/updateServer/deleteServer/validateServer/pollServerUntilReachable client functions
  - COOLIFY_409 and COOLIFY_SSH_UNREACHABLE error codes with RECOVERY_HINTS
  - PEM_FIELD_PATTERN hard-mask in sanitizeFullProjection (reveal=true still masks PEM)
  - resource.list type=server branch via fetchServers + projectServerSummary
affects:
  - 08-02-private-key-handler
  - 08-03-server-handler

tech-stack:
  added: []
  patterns:
    - "pollServerUntilReachable: 30s default, returns last-seen server on timeout (no throw)"
    - "deleteServer sends explicit delete_volumes=false query param by default"
    - "PEM fields masked even when reveal=true (D-02 stricter than SAF-04)"

key-files:
  created: []
  modified:
    - src/api/client.ts
    - src/api/client.test.ts
    - src/utils/errors.ts
    - src/utils/errors.test.ts
    - src/utils/projections.ts
    - src/utils/projections.test.ts
    - src/mcp/tools/resource.ts
    - src/mcp/tools/resource.test.ts

key-decisions:
  - "pollServerUntilReachable uses while(Date.now()-start<timeout) loop — 15 fetcher calls at 30s/2s interval"
  - "resource.list type=server bypasses /resources entirely — fetchServers only per D-10"

patterns-established:
  - "Phase 8 shared infrastructure surface decoupled from handler tools for parallel 08-02/08-03 execution"

requirements-completed:
  - KEY-01
  - KEY-02
  - KEY-03
  - KEY-04
  - KEY-05
  - SRV-01
  - SRV-02
  - SRV-03
  - SRV-04
  - SRV-05

coverage:
  - id: D1
    description: "9 new API client functions for private keys and servers plus pollServerUntilReachable"
    requirement: KEY-01
    verification:
      - kind: unit
        ref: "npx vitest run src/api/client.test.ts"
        status: pass
      - kind: other
        ref: "npm run build"
        status: pass
    human_judgment: false
  - id: D2
    description: "COOLIFY_409 + COOLIFY_SSH_UNREACHABLE error codes and PEM hard-mask on reveal=true"
    requirement: KEY-02
    verification:
      - kind: unit
        ref: "npx vitest run src/utils/errors.test.ts src/utils/projections.test.ts"
        status: pass
    human_judgment: false
  - id: D3
    description: "resource.list type=server returns paginated server summaries"
    requirement: SRV-01
    verification:
      - kind: unit
        ref: "npx vitest run src/mcp/tools/resource.test.ts"
        status: pass
    human_judgment: false

duration: 8min
completed: 2026-07-16
status: complete
---

# Phase 8 Plan 01: API Surface Extensions Summary

**Phase-8-shared infrastructure: private-key/server CRUD client, COOLIFY_409/SSH_UNREACHABLE errors, PEM hard-mask, resource.list type=server**

## Performance

- **Duration:** 8 min
- **Started:** 2026-07-16T21:54:00Z
- **Completed:** 2026-07-16T22:02:00Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments

- Extended `src/api/client.ts` with 9 CRUD/validate functions and `pollServerUntilReachable` (30s default, soft-timeout return)
- Added `COOLIFY_409` and `COOLIFY_SSH_UNREACHABLE` to error catalog; PEM fields stay masked under `reveal=true` (D-02)
- Extended `resource.list` with `type:'server'` branch using `fetchServers` + `projectServerSummary` (D-10)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add private-key + server CRUD + validate client functions** - `61b7850` (feat)
2. **Task 2: Add COOLIFY_409 + COOLIFY_SSH_UNREACHABLE error codes and harden PEM masking** - `ddd69cb` (feat)
3. **Task 3: Extend resource.list with type='server' (D-10)** - `98074a3` (feat)

## Files Created/Modified

- `src/api/client.ts` - Private key + server CRUD endpoints, validateServer, pollServerUntilReachable
- `src/api/client.test.ts` - 3 pollServerUntilReachable contract tests with fake timers
- `src/utils/errors.ts` - COOLIFY_409, COOLIFY_SSH_UNREACHABLE, statusToCode 409 mapping
- `src/utils/errors.test.ts` - 409 mapping + SSH_UNREACHABLE hint tests
- `src/utils/projections.ts` - PEM_FIELD_PATTERN, reveal=true PEM hard-mask
- `src/utils/projections.test.ts` - reveal=true still masks private_key/pem
- `src/mcp/tools/resource.ts` - list enum + server branch
- `src/mcp/tools/resource.test.ts` - server list + pagination tests

## Decisions Made

- pollServerUntilReachable: 15 fetcher invocations at 30s/2s (plan cited ceil+1=16; actual loop boundary yields 15)
- resource.list type=server skips fetchResources — servers not in /resources envelope

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- 08-02 (private_key handler) and 08-03 (server handler) can run in parallel — no file conflicts on shared infrastructure
- All imports ready: client functions, error codes, PEM sanitizer, resource.list server branch

## Self-Check: PASSED

- `npx vitest run src/api/client.test.ts src/utils/errors.test.ts src/utils/projections.test.ts src/mcp/tools/resource.test.ts` — 121 tests green
- `npm run build` — success
- grep COOLIFY_409|COOLIFY_SSH_UNREACHABLE in errors.ts — 5 matches (>=4)
- grep PEM_FIELD_PATTERN in projections.ts — 2 matches (>=1)
- grep pollServerUntilReachable in client.test.ts — 4 matches (>=3)
- grep 'server' in resource.ts list enum — present

---
*Phase: 08-keys-server-crud*
*Completed: 2026-07-16*
