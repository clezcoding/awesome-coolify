---
phase: 07-distribution-docs
plan: 05
subsystem: api
tags: [coolify, mcp, service-lifecycle, docker_cleanup, error-envelope, uat]

requires:
  - phase: 07-distribution-docs
    provides: project-name lookup from 07-04; service lifecycle handlers from Phase 5
provides:
  - triggerServiceStop with explicit docker_cleanup=false default for Coolify 4.1.x compose services
  - Optional docker_cleanup param on service stop schema (opt-in destructive cleanup)
  - Coolify JSON message extraction in mapApiError/toStructuredError for HTTP 400/422
  - UAT gap 29 closed — service stop→start cycle on uat-uptime-a
affects: [service-tool, error-recovery, uat-smoke]

tech-stack:
  added: []
  patterns:
    - "Always send explicit docker_cleanup boolean on service stop POST — override Coolify 4.1.x default true"
    - "Extract ofetch response._data.message before generic HTTP status fallback in error envelope"

key-files:
  created: []
  modified:
    - src/api/client.ts
    - src/api/client.test.ts
    - src/mcp/tools/service.ts
    - src/mcp/tools/service.test.ts
    - src/utils/errors.ts
    - src/utils/errors.test.ts
    - tests/integration/logs-service-db-flow.test.ts
    - .planning/phases/07-distribution-docs/07-UAT.md

key-decisions:
  - "Service stop defaults docker_cleanup=false — scope limited to triggerServiceStop; app/database stop unchanged (UAT #27 passed)"
  - "mapApiError accepts optional coolifyMessage; toStructuredError reads response._data.message and error.data.message"

patterns-established:
  - "triggerServiceStop(..., dockerCleanup=false, verifySsl) POST ?docker_cleanup=false|true"
  - "HTTP 400/422 envelope.message prefers Coolify body message over generic status string"

requirements-completed: []

coverage:
  - id: D1
    description: "triggerServiceStop sends docker_cleanup=false by default on Coolify 4.1.x"
    verification:
      - kind: unit
        ref: "src/api/client.test.ts#triggerServiceStop POST /services/{uuid}/stop with docker_cleanup=false by default"
        status: pass
    human_judgment: false
  - id: D2
    description: "service stop schema wires optional docker_cleanup default false to triggerServiceStop"
    verification:
      - kind: unit
        ref: "src/mcp/tools/service.test.ts#stop by name single-hit calls triggerServiceStop"
        status: pass
    human_judgment: false
  - id: D3
    description: "COOLIFY_422 on HTTP 400 surfaces Coolify response message (e.g. Service is already running.)"
    verification:
      - kind: unit
        ref: "src/utils/errors.test.ts#extracts Coolify message from ofetch FetchError response._data.message"
        status: pass
    human_judgment: false
  - id: D4
    description: "Live UAT test 29 — service stop→exited→start→running:healthy on uat-uptime-a"
    verification:
      - kind: manual_procedural
        ref: "2026-07-16 direct handler chain — running:healthy → stop @25s exited → start @45s running:healthy"
        status: pass
    human_judgment: false
  - id: D5
    description: "07-UAT.md test 29 pass; gaps 0 issues; summary 29/32 passed"
    verification:
      - kind: other
        ref: "node verify script on 07-UAT.md test 29 result:pass + verified_by"
        status: pass
    human_judgment: false

duration: 8min
completed: 2026-07-16
status: complete
---

# Phase 07 Plan 05 Summary

**Service stop sends docker_cleanup=false by default and COOLIFY_422 surfaces Coolify body messages — UAT gap 29 closed on one-click compose services**

## Performance

- **Duration:** 8 min
- **Started:** 2026-07-16T18:56:00Z
- **Completed:** 2026-07-16T19:04:00Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments

- `triggerServiceStop` always sends explicit `docker_cleanup=false` (default) or `true` when opted in — fixes Coolify 4.1.x no-op stop on one-click compose services
- `service` stop action schema adds optional `docker_cleanup` param (default false) wired through handler
- `mapApiError` / `toStructuredError` extract Coolify `message` from ofetch `response._data.message` for actionable COOLIFY_422 text
- Live UAT #29: `uat-uptime-a` stop→exited (~25s), start→running:healthy (~45s); 07-UAT.md 29 passed / 0 issues

## Task Commits

1. **Task 1: triggerServiceStop docker_cleanup=false + schema + tests** — `ab7aacb` (feat)
2. **Task 2: Surface Coolify response message in error envelope** — `f38abb6` (fix)
3. **Task 3: Live UAT test 29 + 07-UAT.md update** — `096c245` (docs)

**Plan metadata:** pending (this SUMMARY commit)

## Files Created/Modified

- `src/api/client.ts` — `triggerServiceStop` dockerCleanup param + query
- `src/mcp/tools/service.ts` — stop schema `docker_cleanup`, handler wiring, MutationAction union
- `src/utils/errors.ts` — `extractCoolifyMessage`, `mapApiError` coolifyMessage param
- `src/api/client.test.ts`, `service.test.ts`, `errors.test.ts` — regression tests
- `tests/integration/logs-service-db-flow.test.ts` — stop mock signature update
- `.planning/phases/07-distribution-docs/07-UAT.md` — test 29 pass, gap resolved

## Decisions Made

- Scope limited to service stop — `triggerAppStop` / `triggerDatabaseStop` unchanged (UAT app cycle #27 passed)
- Live verification via direct handler invocation (built source) — Cursor MCP host still served pre-rebuild dist until reload

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Cursor MCP tool calls during Task 3 initially hit pre-build server (stop without docker_cleanup=false left service running). Live UAT succeeded via direct `handleServiceAction` against current source/build.
- Full `npm test`: 490/492 pass — 2 pre-existing `docs-parity.test.ts` failures (README H2 drift, out of 07-05 scope; noted in 07-04).

## User Setup Required

None — MCP host reload recommended so Cursor tool calls pick up docker_cleanup fix without direct handler workaround.

## Next Phase Readiness

- Phase 7 UAT smoke complete: 29 passed, 0 issues, 3 skipped (no databases)
- All Phase 7 plans 01–05 executed; phase ready for verify-work / milestone close-out
- docs-parity README H2 failures remain for separate fix if desired

## Self-Check: PASSED

- [x] triggerServiceStop default sends docker_cleanup=false (client.test.ts)
- [x] service stop passes dockerCleanup false (service.test.ts)
- [x] toStructuredError surfaces "Service is already running." (errors.test.ts)
- [x] npm run build exits 0
- [x] npm test 490/492 (2 pre-existing docs-parity unrelated)
- [x] Live UAT #29 stop→exited→start→running:healthy
- [x] 07-UAT.md test 29 result:pass with verified_by

---
*Phase: 07-distribution-docs*
*Completed: 2026-07-16*
