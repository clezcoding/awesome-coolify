---
phase: 08-keys-server-crud
plan: 00
subsystem: testing
tags: [vitest, tdd, private-key, server, wave-0, red-scaffold]

requires:
  - phase: 07-distribution-docs
    provides: Established vitest patterns, confirm-gate tests, deploy-poll mocks
provides:
  - RED vitest scaffold for private_key tool (KEY-01..KEY-05, D-01..D-04, D-11, D-13..D-15)
  - RED vitest scaffold for server tool (SRV-01..SRV-05, D-05..D-08, D-12, D-16)
affects: [08-01, 08-02, 08-03, 08-04]

tech-stack:
  added: []
  patterns:
    - "Wave 0 RED: test files import non-existent handlers; vitest fails at module load"
    - "Fake PEM fixtures only — never real key material in tests"

key-files:
  created:
    - src/mcp/tools/private_key.test.ts
    - src/mcp/tools/server.test.ts
  modified: []

key-decisions:
  - "14 private_key it() blocks cover all KEY-* behaviors plus D-13 delete_preview and D-15 no-force schema"
  - "16 server it() blocks cover validate poll branches, private_key_uuid resolution, delete_volumes defaults"
  - "vi.mock node:fs for key_file create path; vi.mock api/client.js for all network calls"

patterns-established:
  - "Pattern: RED scaffold imports ./private_key.js and ./server.js before handlers exist — downstream 08-02/08-03 flip GREEN without test rewrites"

requirements-completed: [KEY-01, KEY-02, KEY-03, KEY-04, KEY-05, SRV-01, SRV-02, SRV-03, SRV-04, SRV-05]

coverage:
  - id: D1
    description: "private_key.test.ts RED scaffold with 14 behaviors for KEY-01..05 and locked decisions"
    requirement: KEY-01
    verification:
      - kind: unit
        ref: "npx vitest run src/mcp/tools/private_key.test.ts (exit 1 — module load fail)"
        status: pass
      - kind: other
        ref: "grep -c '^  it(' src/mcp/tools/private_key.test.ts >= 13"
        status: pass
    human_judgment: false
  - id: D2
    description: "server.test.ts RED scaffold with 16 behaviors for SRV-01..05 and locked decisions"
    requirement: SRV-01
    verification:
      - kind: unit
        ref: "npx vitest run src/mcp/tools/server.test.ts (exit 1 — module load fail)"
        status: pass
      - kind: other
        ref: "grep -c '^  it(' src/mcp/tools/server.test.ts >= 15"
        status: pass
    human_judgment: false

duration: 3min
completed: 2026-07-16
status: complete
---

# Phase 8 Plan 00: Wave 0 RED Test Scaffolds Summary

**Two failing vitest files lock KEY-01..05 and SRV-01..05 behaviors before private_key/server handlers exist**

## Performance

- **Duration:** 3 min
- **Started:** 2026-07-16T21:50:00Z
- **Completed:** 2026-07-16T21:53:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- `private_key.test.ts` — 14 `it()` blocks covering list/get/create/update/delete/delete_preview, PEM XOR, reveal rejection, COOLIFY_409 deps, no-force schema
- `server.test.ts` — 16 `it()` blocks covering create+validate poll, soft-unreachable, timeout pending, update/build-server, delete confirm/volumes, validate, get+key resolution, delete_preview
- Both files fail RED at import (`./private_key.js` / `./server.js` missing) — ready for 08-02/08-03 GREEN

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold private_key.test.ts RED (KEY-01..KEY-05)** - `bd06931` (test)
2. **Task 2: Scaffold server.test.ts RED (SRV-01..SRV-05)** - `4252a85` (test)

**Plan metadata:** pending (docs commit follows)

## Files Created/Modified

- `src/mcp/tools/private_key.test.ts` — RED vitest for private_key handler (KEY-01..05, D-01..04, D-11, D-13..15)
- `src/mcp/tools/server.test.ts` — RED vitest for server handler (SRV-01..05, D-05..08, D-12, D-16)

## Decisions Made

- Used clearly-fake PEM strings in fixtures per threat model T-08-00-01
- Followed database.test.ts + emergency.test.ts mock/assertion patterns exactly
- server soft-unreachable asserts `result.ok` + hints containing ssh/unreachable (handler-level, not MCP wrapper)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Pre-commit hook staged ROADMAP.md into Task 1 commit**
- **Found during:** Task 1 (private_key.test.ts commit)
- **Issue:** Hook auto-included `.planning/ROADMAP.md` alongside staged test file
- **Fix:** Accepted — ROADMAP changes are phase-8 planning metadata; Task 2 commit remained test-only
- **Files modified:** `.planning/ROADMAP.md` (in bd06931)
- **Verification:** `git show --stat bd06931` confirms 2 files
- **Committed in:** `bd06931`

---

**Total deviations:** 1 auto-fixed (1 blocking/hook interaction)
**Impact on plan:** No test scope change. ROADMAP will be synced again in docs commit.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Wave 0 complete — 08-01 can add API client + error codes + projections
- 08-02/08-03 have full behavioral spec in test files; only need handlers to flip GREEN
- Combined RED verify: `npx vitest run src/mcp/tools/private_key.test.ts src/mcp/tools/server.test.ts` exits 1 (expected)

## Self-Check: PASSED

- [x] `private_key.test.ts` exists — 14 `it()` blocks, 0 skip/todo
- [x] `server.test.ts` exists — 16 `it()` blocks, 0 skip/todo
- [x] Both vitest runs fail RED (import error for missing handlers)
- [x] Task commits: bd06931, 4252a85

---
*Phase: 08-keys-server-crud*
*Completed: 2026-07-16*
