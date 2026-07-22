---
phase: 05-logs-service-db-ops
plan: 01
subsystem: api
tags: [logs, application, coolify-api, zod, vitest]

requires:
  - phase: 04-app-deploy-lifecycle
    provides: resolveAppMutationUuid, logsAvailableHint, fetchDeployment, deploy-poll
provides:
  - sharedLogParamsSchema (lines, max_chars, format, include_hidden, type)
  - log-helpers (sliceLogBlob, capLogOutput, parseBuildLogEntries)
  - fetchApplicationLogs client helper
  - application.logs action (runtime uuid + build deployment_uuid dispatcher)
  - COOLIFY_403_SENSITIVE_REQUIRED error code for api.sensitive token gate
affects: [05-02, 05-03, 05-05]

tech-stack:
  added: []
  patterns:
    - "Log blob slicing via sliceLogBlob (tail-of-tail after offset)"
    - "Build logs JSON-array parse → hidden/type filter → flatten → cap"
    - "COOLIFY_403_SENSITIVE_REQUIRED when deployment logs field absent (not HTTP 403)"

key-files:
  created:
    - src/utils/log-helpers.ts
    - src/utils/log-helpers.test.ts
  modified:
    - src/utils/errors.ts
    - src/mcp/tools/shared-read-params.ts
    - src/api/client.ts
    - src/mcp/tools/application.ts
    - src/mcp/tools/application.test.ts
    - src/mcp/server.ts

key-decisions:
  - "Runtime logs path ignores include_hidden/type — plain string envelope only"
  - "name/fqdn added to logs schema for resolveAppMutationUuid reuse on runtime path"
  - "Log line content unmasked in P5 — tool description warns agents (OUT-02 deferred P6)"

patterns-established:
  - "sharedLogParamsSchema: log-specific read params without projection/pagination"
  - "capLogOutput thin adapter over truncateAndGuard for log handlers"
  - "Build-logs filter metadata: entries_total, entries_hidden, entries_shown"

requirements-completed: [APP-10, APP-11]

coverage:
  - id: D1
    description: "COOLIFY_403_SENSITIVE_REQUIRED error code with api.sensitive recovery hints"
    requirement: APP-11
    verification:
      - kind: unit
        ref: "src/utils/errors.test.ts#COOLIFY_403_SENSITIVE_REQUIRED"
        status: pass
    human_judgment: false
  - id: D2
    description: "sharedLogParamsSchema with lines/max_chars/format/include_hidden/type"
    requirement: APP-10
    verification:
      - kind: unit
        ref: "src/mcp/tools/application.test.ts#handleApplicationAction logs"
        status: pass
    human_judgment: false
  - id: D3
    description: "Log helpers sliceLogBlob, capLogOutput, parseBuildLogEntries"
    requirement: APP-10
    verification:
      - kind: unit
        ref: "src/utils/log-helpers.test.ts"
        status: pass
    human_judgment: false
  - id: D4
    description: "fetchApplicationLogs GET /applications/{uuid}/logs?lines=N"
    requirement: APP-10
    verification:
      - kind: unit
        ref: "src/api/client.test.ts#fetchApplicationLogs"
        status: pass
    human_judgment: false
  - id: D5
    description: "application.logs runtime path via uuid with lines cap and max_chars truncation"
    requirement: APP-10
    verification:
      - kind: unit
        ref: "src/mcp/tools/application.test.ts#runtime logs with uuid"
        status: pass
    human_judgment: false
  - id: D6
    description: "application.logs build path via deployment_uuid with JSON parse, hidden/type filters, filter metadata"
    requirement: APP-11
    verification:
      - kind: unit
        ref: "src/mcp/tools/application.test.ts#build logs default include_hidden:false"
        status: pass
    human_judgment: false
  - id: D7
    description: "T-05-01 mitigation — log blob never written to stderr/console"
    requirement: APP-10
    verification:
      - kind: unit
        ref: "src/mcp/tools/application.test.ts#does not write log line content"
        status: pass
    human_judgment: false

duration: 5min
completed: 2026-07-16
status: complete
---

# Phase 5 Plan 1: App Logs (Runtime + Build) Summary

**`application.logs` liefert begrenzte Runtime- und Build-Logs mit JSON-Array-Pipeline, api.sensitive-Gate und sharedLogParamsSchema — P3/P4 Forward-Ref-Hints sind jetzt aufrufbar.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-07-16T00:49:00Z
- **Completed:** 2026-07-16T00:53:30Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments

- `application.logs` Dispatcher: `uuid` → Runtime-Logs (`GET /applications/{uuid}/logs`), `deployment_uuid` → Build-Logs (`GET /deployments/{uuid}`)
- Build-Logs: JSON.parse → hidden/type-Filter → flatten → slice/offset → max_chars-Cap mit `entries_total`/`entries_hidden`/`entries_shown`
- `COOLIFY_403_SENSITIVE_REQUIRED` wenn `logs`-Feld fehlt (Token ohne `api.sensitive`) — kein stilles Leerergebnis
- Shared Infrastruktur: `sharedLogParamsSchema`, `log-helpers.ts`, `fetchApplicationLogs`

## Task Commits

1. **Task 1: Log infrastructure + RED scaffold** — `25defcb` (test)
2. **Task 2: application.logs handler + GREEN tests** — `321d489` (feat)

**Plan metadata:** `TBD` (docs commit pending)

## Files Created/Modified

- `src/utils/log-helpers.ts` — sliceLogBlob, capLogOutput, parseBuildLogEntries
- `src/utils/errors.ts` — COOLIFY_403_SENSITIVE_REQUIRED + RECOVERY_HINTS export
- `src/mcp/tools/shared-read-params.ts` — sharedLogParamsSchema
- `src/api/client.ts` — fetchApplicationLogs
- `src/mcp/tools/application.ts` — logs schema + handleApplicationLogs
- `src/mcp/server.ts` — unmasked-log warning in tool description

## Decisions Made

- `name`/`fqdn` im logs-Schema für `resolveAppMutationUuid`-Reuse (Multi-Match-Tests)
- Runtime-Pfad ignoriert `include_hidden`/`type` (plain-string envelope)
- `.strict()` lehnt `follow` ab (D-05 — kein REST-Follow in Coolify 4.1.x)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Schema] name/fqdn auf logs-Schema ergänzt**
- **Found during:** Task 2 (handleApplicationLogs)
- **Issue:** RED-Test nutzt `name:'multi'` für COOLIFY_AMBIGUOUS_MATCH; Plan-Schema nur uuid|deployment_uuid — resolveAppMutationUuid braucht name/fqdn
- **Fix:** Optionale `name`/`fqdn`-Felder + superRefine: runtime-Identifier (uuid|name|fqdn) XOR deployment_uuid
- **Files modified:** src/mcp/tools/application.ts
- **Verification:** multi-match test green, 48 application tests pass
- **Committed in:** 321d489

---

**Total deviations:** 1 auto-fixed (schema extension for identifier resolution)
**Impact on plan:** Minimal — erweitert Runtime-Pfad um P4-Mutations-Muster; superRefine-Kern (runtime XOR build) unverändert.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Bereit für 05-02 (Service lifecycle + service.deploy)
- Shared log primitives wiederverwendbar falls später service/DB logs in v1.1

## Self-Check: PASSED

- [x] `src/utils/log-helpers.ts` exists
- [x] `git log --oneline --grep="05-01"` → 2 task commits (25defcb, 321d489)
- [x] `npx vitest run src/utils/log-helpers.test.ts src/utils/errors.test.ts src/api/client.test.ts src/mcp/tools/application.test.ts` → 92 passed
- [x] `npx vitest run` → 318 passed
- [x] `npm run build` → exit 0

---
*Phase: 05-logs-service-db-ops*
*Completed: 2026-07-16*
