---
phase: 03-diagnose-issue-scan
plan: 04
subsystem: api
tags: [diagnose, mcp, issue-scan, classifyIssues, severity-buckets, coolify-api]

requires:
  - phase: 03-diagnose-issue-scan
    provides: classifyIssues, projectScanIssue, fetchServers, fetchResources, app/server diagnose handlers
provides:
  - handleDiagnoseAction scan branch end-to-end (SYS-03 vertical slice)
  - 2-call fleet enumeration via Promise.all (GET /servers + GET /resources)
  - Severity-grouped output critical > high > info with structured FollowUpHint per issue
affects:
  - 03-05
  - 03-06

tech-stack:
  added: []
  patterns:
    - "Scan enumeration: exactly 2 parallel HTTP calls — no per-resource fan-out"
    - "classifyIssues + projectScanIssue pipeline for D-13 severity buckets"
    - "Pagination meta over flattened issue count across severity buckets"

key-files:
  created: []
  modified:
    - src/mcp/tools/diagnose.ts
    - src/mcp/tools/diagnose.test.ts

key-decisions:
  - "Full severity buckets returned in data — paginateArray drives _meta page/per_page/total only"
  - "Inline test mocks retained — matches 03-02/03-03 pattern, avoids tsc rootDir fixture import"
  - "All 3 diagnose action branches now implemented — app, server, scan complete"

patterns-established:
  - "handleDiagnoseScan: Promise.all fetchServers+fetchResources → classifyIssues → projectScanIssue per bucket"
  - "Stopped/exited resources in info bucket not high per D-14"
  - "Empty fleet returns { critical: [], high: [], info: [] } with ok true"

requirements-completed:
  - SYS-03

coverage:
  - id: D1
    description: "diagnose action scan end-to-end with severity buckets and structured hints"
    requirement: SYS-03
    verification:
      - kind: unit
        ref: "src/mcp/tools/diagnose.test.ts#handleDiagnoseAction scan"
        status: pass
    human_judgment: false
  - id: D2
    description: "2-call fleet enumeration — fetchServers and fetchResources each called once"
    requirement: SYS-03
    verification:
      - kind: unit
        ref: "src/mcp/tools/diagnose.test.ts#enumerates fleet with exactly 2 HTTP calls"
        status: pass
    human_judgment: false
  - id: D3
    description: "D-14 severity invariants — stopped in info not high, reachable servers not critical"
    requirement: SYS-03
    verification:
      - kind: unit
        ref: "src/mcp/tools/diagnose.test.ts#places stopped resources in info bucket not high per D-14"
        status: pass
    human_judgment: false
  - id: D4
    description: "Pagination meta and max_chars truncation via buildReadResponse"
    requirement: SYS-03
    verification:
      - kind: unit
        ref: "src/mcp/tools/diagnose.test.ts#includes pagination meta reflecting flattened issue count"
        status: pass
    human_judgment: false

duration: 8min
completed: 2026-07-12
status: complete
---

# Phase 3 Plan 4: Global Issue Scan Vertical Slice Summary

**Dritter und letzter diagnose-Vertical-Slice: `diagnose({ action: 'scan' })` liefert flottenweite Issue-Liste in Severity-Buckets (critical > high > info) mit strukturierten FollowUpHints — alle 3 diagnose-Actions implementiert.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-07-12T04:15:00Z
- **Completed:** 2026-07-12T04:23:00Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments

- `handleDiagnoseScan`: 2-Call-Enumeration via `Promise.all([fetchServers, fetchResources])` — kein per-Resource Fan-out
- `classifyIssues` partitioniert Fleet in critical (unreachable Server), high (unhealthy), info (stopped/exited) per D-13/D-14
- Jeder ScanIssue-Eintrag hat `resource_type`, `uuid`, `name`, `status`, `issue`, `hint` (strukturiertes FollowUpHint-Objekt per D-15)
- Leere Fleet liefert `{ critical: [], high: [], info: [] }` mit `ok: true`
- Pagination-Meta (`page`, `per_page`, `total`) reflektiert flattenierte Issue-Anzahl über alle Buckets
- `max_chars`-Truncation via `buildReadResponse` — `_meta.truncated` und `_formattedText.length` gecappt
- App- und Server-Branches unverändert funktionsfähig — keine Regression

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement diagnose scan handler with 2-call enumeration and classifier integration** - `cea3875` (feat)

**Plan metadata:** `23f80cf` (docs: complete plan)

## Files Created/Modified

- `src/mcp/tools/diagnose.ts` — `handleDiagnoseScan` mit classifyIssues/projectScanIssue-Pipeline; scan-Branch im Switch
- `src/mcp/tools/diagnose.test.ts` — 8 neue Scan-Tests (2-Call-Enumeration, mixed-health, empty fleet, D-14-Invarianten, hint-shape, pagination-meta, max_chars)

## Decisions Made

- Volle Severity-Buckets in `data` — `paginateArray` steuert nur `_meta` (page/per_page/total), nicht Bucket-Inhalt
- Inline-Mocks beibehalten — konsistent mit 03-02/03-03, vermeidet tsc rootDir-Fehler bei Fixture-Imports
- Alle 3 diagnose-Actions jetzt implementiert — Phase-3-Handler-Kern komplett

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- 03-05 kann P2 get-Tools hints[]-Retrofit (OUT-06) und diagnose-Tool-Registrierung vervollständigen
- 03-06 kann Integration-Tests für app+server+scan happy-path erweitern

## Self-Check: PASSED

- `npm run test -- --run src/mcp/tools/diagnose.test.ts` → 41 tests passed
- `npm run test -- --run --reporter=dot` → 182 tests passed
- `npm run build` → success
- Task commit `cea3875` present
- Key files exist on disk

---
*Phase: 03-diagnose-issue-scan*
*Completed: 2026-07-12*
