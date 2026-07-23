---
phase: 18-live-uat-harness
plan: 02
subsystem: testing
tags: [uat, mcp, stdio, json-rpc, live-harness, reporting]

requires:
  - phase: 18-live-uat-harness
    provides: declarative matrix, harness skeleton, credential chain, UAT_PROJECT_UUID gate
provides:
  - McpStdioClient spawning dist/index.js with 30s JSON-RPC timeout
  - runStdioRows executing all stdio-mode matrix rows in declaration order
  - Canonical JSON report on stdout plus optional --out and Markdown companion
  - Exit codes 0/1/2 per D-20 (setup abort preserved from Plan 01)
affects: [18-03, 18-04, uat:live]

tech-stack:
  added: []
  patterns:
    - McpStdioClient NDJSON drain with pending Map keyed by JSON-RPC id
    - spawnChild without shell:true and SIGTERM finally cleanup
    - matchesSuiteFilter shared contract (smoke + v3 always; full with --full)
    - buildReport + writeMarkdown with redact() on every output surface

key-files:
  created: []
  modified:
    - scripts/live-uat.mjs

key-decisions:
  - "matchesSuiteFilter exported for verbatim reuse by Plan 18-03 runInProcessRows"
  - "tools/list validated against REGISTERED_TOOLS before matrix row iteration"
  - "Empty stdio filter emits v3_gaps no-stdio-rows entry instead of crashing"

patterns-established:
  - "Pattern: runStdioRows returns { rows, v3Gaps } in matrix declaration order for diffable re-runs"
  - "Pattern: Row capture shape { id, tool, status, durationMs, errorCode, recoveryHintsPresent, structuredContent } all redacted"

requirements-completed: [UAT-01, UAT-03]

coverage:
  - id: D1
    description: "McpStdioClient spawns dist/index.js, drains NDJSON, 30s timeout, SIGTERM cleanup"
    requirement: UAT-01
    verification:
      - kind: other
        ref: "node stdio structural checks (18-02-PLAN Task 1 verify)"
        status: pass
    human_judgment: false
  - id: D2
    description: "runStdioRows executes stdio matrix rows with pass/fail capture and token redaction"
    requirement: UAT-01
    verification:
      - kind: other
        ref: "node stdio structural checks (18-02-PLAN Task 1 verify)"
        status: pass
    human_judgment: false
  - id: D3
    description: "JSON stdout report with rows, summary, v3_gaps; optional --out + Markdown companion"
    requirement: UAT-03
    verification:
      - kind: other
        ref: "node report structural checks (18-02-PLAN Task 2 verify)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Exit codes 0/1/2 — live wave-gate run against UAT instance"
    requirement: UAT-03
    verification:
      - kind: integration
        ref: "node scripts/live-uat.mjs --out /tmp/uat.json (Wave 2 gate at /gsd-verify-work)"
        status: unknown
    human_judgment: true
    rationale: "Live MCP spawn requires configured UAT_PROJECT_UUID and Coolify credentials — deferred to verify-work gate"

duration: 1min
completed: 2026-07-23
status: complete
---

# Phase 18 Plan 02: Stdio Runner + Report Writers Summary

**McpStdioClient mit 30s-Timeout, stdio-Matrix-Runner für smoke/v3-Zeilen, kanonischer JSON-Report auf stdout plus optional --out und Markdown-Begleitdatei**

## Performance

- **Duration:** 1 min
- **Started:** 2026-07-23T18:19:04Z
- **Completed:** 2026-07-23T18:19:37Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- `McpStdioClient` ported von `live-uat-milestone-optional.mjs` mit 30s-Timeout (statt 90s), NDJSON-Drain und pending-Map
- `runStdioRows` filtert `mode === 'stdio'` plus Suite-Kontrakt (smoke + v3 immer; full nur mit `--full`), führt initialize/tools/list/tools/call aus, erfasst pass/fail/durationMs/errorCode/recoveryHintsPresent — alles via `redact()`
- `buildReport` + `writeMarkdown` liefern kanonisches JSON auf stdout, optional `--out`-Datei und `.md`-Companion; Exit 0 bei keinem Fail, 1 bei Failures; Setup-Abort Exit 2 unverändert aus Plan 01

## Task Commits

Each task was committed atomically:

1. **Task 1: McpStdioClient + stdio runner for matrix rows** - `f878c23` (feat)
2. **Task 2: JSON stdout + --out + Markdown report, exit codes 0/1/2** - `5dc49c7` (feat)

## Files Created/Modified

- `scripts/live-uat.mjs` — McpStdioClient, spawnChild, runStdioRows, buildReport, writeMarkdown, main() stdio execution path

## Decisions Made

- `matchesSuiteFilter` als exportierte Funktion für identischen Suite-Filter in Plan 18-03
- `tools/list`-Smoke validiert alle 16 `registerTool`-Namen vor Matrix-Iteration
- Leerer stdio-Filter erzeugt `v3_gaps`-Eintrag `no-stdio-rows` statt Crash

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None — Live-Lauf erfordert wie Plan 01 `UAT_PROJECT_UUID` und lokale Coolify-Credentials (Wave-2-Gate bei verify-work).

## Next Phase Readiness

- Plan 18-03 kann `runInProcessRows` an `matchesSuiteFilter` und `uatState` anbinden
- `detectV3Gaps` und in-process-Runner ergänzen die Hybrid-Ausführung (D-01)
- Keine Blocker für Plan 18-03

## Self-Check: PASSED

- FOUND: scripts/live-uat.mjs
- FOUND: commit f878c23
- FOUND: commit 5dc49c7

---
*Phase: 18-live-uat-harness*
*Completed: 2026-07-23*
