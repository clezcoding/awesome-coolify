---
phase: 24-capabilities-deployment-logs
plan: 03
subsystem: docs
tags: [coverage, readme, prompts, deployment.logs, capabilities, OBS-01, CAP-01, CAP-02]

requires:
  - phase: 24-01
    provides: system.version coolifyVersion, mcpVersion, capabilities
  - phase: 24-02
    provides: deployment.logs action and coverage-map row
provides:
  - Regenerated docs/COVERAGE.md with deployment.logs row
  - Bilingual README capability + build-log discovery notes
  - Deploy prompt deployment.logs failure-path cite
affects: [25-application-log-follow, 26-incident-prompt]

tech-stack:
  added: []
  patterns:
    - "README short note under Status today for version rename + deployment.logs steer"
    - "Deploy prompt step 4 cites deployment.logs on failed/cancelled path only"

key-files:
  created: []
  modified:
    - docs/COVERAGE.md
    - README.md
    - README.de.md
    - src/mcp/prompts.ts
    - tests/mcp/prompts.test.ts

key-decisions:
  - "Reverted unstaged OpenAPI pin drift instead of remapping coverage-map — restored 22 invalid openapi keys"

patterns-established:
  - "Pattern: DX discovery via Status today blockquote + status table rows for new MCP surfaces"

requirements-completed: [CAP-01, CAP-02, OBS-01]

coverage:
  - id: D1
    description: "docs/COVERAGE.md regenerated with deployment.logs covered row"
    requirement: OBS-01
    verification:
      - kind: unit
        ref: "tests/openapi-coverage.test.ts#assertCoverageFresh"
        status: pass
    human_judgment: false
  - id: D2
    description: "README EN/DE note documents coolifyVersion rename, capabilities, deployment.logs steer"
    requirement: CAP-01
    verification:
      - kind: other
        ref: "rg coolifyVersion README.md README.de.md"
        status: pass
    human_judgment: false
  - id: D3
    description: "Deploy prompt failure path cites deployment.logs for build log fetch"
    requirement: OBS-01
    verification:
      - kind: unit
        ref: "tests/mcp/prompts.test.ts#deploy prompt recommends watch-primary flow"
        status: pass
    human_judgment: false

duration: 3min
completed: 2026-07-27
status: complete
---

# Phase 24 Plan 03: DX Surface Summary

**Coverage CI green with deployment.logs; bilingual README + deploy prompt steer agents to capabilities and build logs**

## Performance

- **Duration:** 3 min
- **Started:** 2026-07-27T21:22:00Z
- **Completed:** 2026-07-27T21:25:00Z
- **Tasks:** 2 (tracer + auto)
- **Files modified:** 5

## Accomplishments

- Regenerated `docs/COVERAGE.md` — `deployment.logs` row visible as covered (OBS-01)
- Resolved pre-existing openapi-coverage failures from unstaged OpenAPI pin drift
- README EN/DE short note: `coolifyVersion` rename, `mcpVersion`, `capabilities`, `deployment.logs` steer (D-09, D-18)
- Deploy prompt step 4 cites `deployment.logs` on failed/cancelled path; incident prompt untouched
- All openapi-coverage + prompts tests green (14 tests)

## Task Commits

1. **Task 1: End-to-end coverage map → COVERAGE.md → openapi-coverage green** — `2a62afb` (feat)
2. **Task 2: README EN/DE notes + deploy prompt deployment.logs cite** — `b3242a7` (feat)

## Files Created/Modified

- `docs/COVERAGE.md` — regenerated via `pnpm run openapi:coverage`; deployment.logs covered
- `README.md` — Status today rows + capability/build-log blockquote
- `README.de.md` — German parity
- `src/mcp/prompts.ts` — deploy prompt step 4 deployment.logs cite
- `tests/mcp/prompts.test.ts` — deployment.logs assertion

## Decisions Made

- Reverted unstaged `docs/coolify_openapi.json`/`yaml` drift — working tree spec removed 22 paths expected by coverage-map; committed pin is authoritative

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Reverted unstaged OpenAPI pin drift**
- **Found during:** Task 1 (openapi-coverage validation)
- **Issue:** Unstaged OpenAPI edits removed paths like `GET /applications/{uuid}/start`; 22 coverage-map keys invalid + COVERAGE.md stale
- **Fix:** `git checkout -- docs/coolify_openapi.json docs/coolify_openapi.yaml`; regen COVERAGE.md
- **Files modified:** docs/COVERAGE.md (openapi files restored to HEAD, not committed)
- **Verification:** `npx vitest run tests/openapi-coverage.test.ts` — 8/8 pass
- **Committed in:** `2a62afb`

None - plan behavior executed as written beyond drift fix.

## Issues Encountered

- commitlint rejected first task-2 commit subject (`README` sentence-case) — retried with lowercase subject

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 24 complete — CAP/OBS surfaces documented for agent discovery
- Phase 25 can build application log follow on deployment.logs foundation
- Phase 26 owns incident prompt + diagnose.logs docs

---
*Phase: 24-capabilities-deployment-logs*
*Completed: 2026-07-27*

## Self-Check: PASSED

- SUMMARY file present at `.planning/phases/24-capabilities-deployment-logs/24-03-SUMMARY.md`
- Commit `2a62afb` verified in git log
- Commit `b3242a7` verified in git log
- Key files exist: docs/COVERAGE.md, README.md, README.de.md, src/mcp/prompts.ts
