---
phase: 24-capabilities-deployment-logs
plan: 01
subsystem: api
tags: [mcp, capabilities, system.version, meta.version, coolify-4.1.2]

requires:
  - phase: 24-00
    provides: Wave 0 RED scaffolds for system/meta version and capabilities tests
provides:
  - COOLIFY_412_CAPABILITIES static table on system.version
  - readPackageVersion() shared package identity source
  - coolifyVersion rename (D-07/D-09) with catalog note
  - meta.version aligned to package.json (no capabilities)
affects: [24-02, 24-03, 25-application-log-follow]

tech-stack:
  added: []
  patterns:
    - "Static capability map (capabilities.ts) separate from Zod schemas (D-04)"
    - "readPackageVersion() with bundle+source path fallback"

key-files:
  created:
    - src/mcp/capabilities.ts
    - src/utils/package-version.ts
  modified:
    - src/mcp/tools/system.ts
    - src/mcp/tools/meta.ts
    - src/mcp/tools/system.test.ts
    - src/mcp/tools/meta.test.ts

key-decisions:
  - "rename-coolifyVersion: break legacy { version } field per D-07/D-09 (checkpoint decision)"
  - "capabilities on system.version only; meta.version stays { mcpVersion, serverName } (D-06)"

patterns-established:
  - "Pattern: COOLIFY_412_CAPABILITIES flat map with supported/coolify_min_version/note"
  - "Pattern: readPackageVersion() cached reader with dist/ and src/utils path candidates"

requirements-completed: [CAP-01, CAP-02]

coverage:
  - id: D1
    description: "system.version returns coolifyVersion, mcpVersion, serverName, and four-key capabilities map"
    requirement: CAP-01
    verification:
      - kind: unit
        ref: "src/mcp/tools/system.test.ts#returns coolifyVersion, mcpVersion, serverName, and capabilities"
        status: pass
      - kind: unit
        ref: "src/mcp/tools/system.test.ts#system.version capabilities has exactly four D-03 keys"
        status: pass
    human_judgment: false
  - id: D2
    description: "meta.version returns package-backed mcpVersion without capabilities"
    requirement: CAP-01
    verification:
      - kind: unit
        ref: "src/mcp/tools/meta.test.ts#mcpVersion matches readPackageVersion() from package.json"
        status: pass
    human_judgment: false
  - id: D3
    description: "Static COOLIFY_412_CAPABILITIES table with four D-03 keys all supported on 4.1.2"
    requirement: CAP-02
    verification:
      - kind: unit
        ref: "src/mcp/tools/system.test.ts#each capability value has supported boolean and coolify_min_version string"
        status: pass
    human_judgment: false

duration: 2min
completed: 2026-07-27
status: complete
---

# Phase 24 Plan 01: Capabilities & Version Identity Summary

**system.version exposes coolifyVersion + package-backed mcpVersion + static 4.1.2 capability flags; meta.version shares package identity without capabilities**

## Performance

- **Duration:** 2 min (continuation from checkpoint)
- **Started:** 2026-07-27T21:15:00Z
- **Completed:** 2026-07-27T21:17:06Z
- **Tasks:** 3 (1 decision + 2 implementation)
- **Files modified:** 6

## Accomplishments

- Checkpoint decision **rename-coolifyVersion** recorded — no dual `{ version }` alias (D-09)
- `COOLIFY_412_CAPABILITIES` static table with four D-03 keys (`application_logs`, `deployment_logs`, `deployment_watch`, `deploy_watch`)
- `readPackageVersion()` reads `package.json` with dev+bundle path resolution
- `system.version` returns `{ coolifyVersion, mcpVersion, serverName, capabilities }`; catalog documents rename
- `meta.version` uses `readPackageVersion()`; stale `MCP_VERSION = '0.1.0'` removed
- Wave 0 system/meta scaffolds flipped green (16 tests passing)

## Task Commits

Each task was committed atomically:

1. **Task 1: Confirm system.version field rename** — decision only (rename-coolifyVersion); no code commit
2. **Task 2: End-to-end system.version tracer** — `f3fb9b5` (feat)
3. **Task 3: Align meta.version to readPackageVersion** — `8a0d04a` (feat)

**Plan metadata:** `7f4840a` (docs: complete plan)

## Files Created/Modified

- `src/mcp/capabilities.ts` — static COOLIFY_412_CAPABILITIES export
- `src/utils/package-version.ts` — cached readPackageVersion() with path fallback
- `src/mcp/tools/system.ts` — extended SystemVersionResult, extractCoolifyVersion helper, catalog update
- `src/mcp/tools/meta.ts` — readPackageVersion() replaces MCP_VERSION
- `src/mcp/tools/system.test.ts` — version + capabilities tests green
- `src/mcp/tools/meta.test.ts` — package.json parity tests green

## Decisions Made

- **rename-coolifyVersion (D-07/D-09):** Maintainer approved one-way break from `{ version }` to `{ coolifyVersion }` at checkpoint; no alias field shipped
- **Capabilities surface split (D-06):** capabilities remain on `system.version` only; `meta.version` unchanged shape

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] package.json path resolution for vitest source**
- **Found during:** Task 2 (readPackageVersion first run)
- **Issue:** Single `../package.json` from `src/utils/` resolves to non-existent `src/package.json` under vitest
- **Fix:** Try `../package.json` then `../../package.json` with existsSync — works for bundled dist/index.js and source
- **Files modified:** `src/utils/package-version.ts`
- **Verification:** system.version tests pass; meta.version reads `1.0.1`
- **Committed in:** `f3fb9b5`

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Required for tests and dev; npm bundle path unchanged.

## Issues Encountered

None beyond package.json path (auto-fixed).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 24-02 can implement `deployment.logs` (OBS-01) — capability discovery foundation complete
- Plan 24-03 can add README/catalog docs for coolifyVersion rename (D-09/D-18)

---
*Phase: 24-capabilities-deployment-logs*
*Completed: 2026-07-27*

## Self-Check: PASSED

- All key files present (capabilities.ts, package-version.ts, system.ts, meta.ts)
- Commits f3fb9b5 and 8a0d04a verified in git log
