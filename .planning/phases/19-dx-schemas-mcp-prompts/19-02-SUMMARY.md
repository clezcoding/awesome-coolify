---
phase: 19-dx-schemas-mcp-prompts
plan: 02
subsystem: api
tags: [mcp, prompts, dx, tool-descriptions, cursor]

requires:
  - phase: 19-dx-schemas-mcp-prompts
    plan: 01
    provides: flat schemas + co-located actionsCatalog/safetyFooter constants
provides:
  - composeToolDescription wiring in server.ts for all 16 domain tools
  - registerCoolifyPrompts with deploy, diagnose, new-project, incident
  - tests/mcp/prompts.test.ts + server description assertions
  - README EN/DE MCP Prompts sections
affects:
  - phase-21 (deployment.watch forward-ref in deploy prompt)
  - phase-22 (playbooks vs prompt depth boundary)

tech-stack:
  added: []
  patterns:
    - "composeToolDescription(purpose, catalog, footer) per UI-SPEC anatomy"
    - "registerCoolifyPrompts after registerCoolifyTools in createAndConnectServer"
    - "Prompt handlers return static messages — no manifest disk I/O"

key-files:
  created:
    - src/mcp/prompts.ts
    - tests/mcp/prompts.test.ts
  modified:
    - src/mcp/server.ts
    - src/mcp/server.test.ts
    - src/mcp/tools/emergency.test.ts
    - README.md
    - README.de.md
    - tests/integration/docs-parity.test.ts

key-decisions:
  - "Tool purpose sentences shortened to one line — detailed action params live in co-located catalog constants"
  - "Prompt tests use _registeredPrompts/_registeredTools — McpServer has no public listTools/getPrompt"
  - "docs-parity CANONICAL_SECTIONS extended for MCP Prompts H2 EN/DE parity"

patterns-established:
  - "Every registerTool description: purpose + Actions: catalog + Safety: footer"
  - "Four MCP prompts with all-optional args and soft manifest Note (no disk read)"

requirements-completed: [DX-01, DX-02, PROMPT-01, PROMPT-02, PROMPT-03, PROMPT-04]

coverage:
  - id: D1
    description: All domain tool descriptions composed from co-located catalog + footer
    requirement: DX-01
    verification:
      - kind: unit
        ref: src/mcp/server.test.ts#every registered tool description contains Actions: and Safety: prefixes
        status: pass
    human_judgment: false
  - id: D2
    description: Flat top-level schemas keep Cursor parameter panels non-empty
    requirement: DX-02
    verification:
      - kind: unit
        ref: tests/integration/mcp-schema-validation.test.ts
        status: pass
    human_judgment: true
    rationale: Visual MCP host rendering deferred to manual verify-work per plan success criteria
  - id: D3
    description: Four MCP prompts registered with exact names deploy, diagnose, new-project, incident
    requirement: PROMPT-01
    verification:
      - kind: unit
        ref: tests/mcp/prompts.test.ts#registers exactly deploy, diagnose, new-project, and incident prompts
        status: pass
    human_judgment: false
  - id: D4
    description: Diagnose prompt parameterized step guidance
    requirement: PROMPT-02
    verification:
      - kind: unit
        ref: tests/mcp/prompts.test.ts#diagnose prompt mentions app, server, and scan paths
        status: pass
    human_judgment: false
  - id: D5
    description: New-project prompt parameterized step guidance
    requirement: PROMPT-03
    verification:
      - kind: unit
        ref: tests/mcp/prompts.test.ts#new-project prompt mentions project, environment, and manifest guidance
        status: pass
    human_judgment: false
  - id: D6
    description: Incident prompt parameterized step guidance
    requirement: PROMPT-04
    verification:
      - kind: unit
        ref: tests/mcp/prompts.test.ts#incident prompt mentions diagnose, logs, restart, and emergency redeploy
        status: pass
    human_judgment: false
  - id: D7
    description: Deploy prompt forward-refs deployment.watch with deployment.get fallback
    requirement: PROMPT-01
    verification:
      - kind: unit
        ref: tests/mcp/prompts.test.ts#deploy prompt references application.deploy, deployment.watch, and deployment.get
        status: pass
    human_judgment: false

duration: 6min
completed: 2026-07-24
status: complete
---

# Phase 19 Plan 02: Tool Descriptions + MCP Prompts Summary

**Co-located Actions:/Safety: catalogs wired into all 16 tool descriptions; four parameterized MCP prompts (deploy, diagnose, new-project, incident) orchestrate existing atomic tools**

## Performance

- **Duration:** 6 min
- **Started:** 2026-07-24T01:27:11Z
- **Completed:** 2026-07-24T01:33:30Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments

- Every `registerTool` description in `server.ts` uses `composeToolDescription(purpose, catalog, footer)` importing co-located constants from plan 19-01
- Shipped `registerCoolifyPrompts` with deploy/diagnose/new-project/incident — all-optional args, English numbered steps, soft manifest Note (D-10)
- Deploy prompt forward-references `deployment.watch` with `deployment.get` polling fallback (D-11)
- Greenfield `tests/mcp/prompts.test.ts` + extended `server.test.ts` description assertions; README EN/DE MCP Prompts sections

## Task Commits

1. **Task 1: Compose tool descriptions from co-located catalog + footer constants** - `26da577` (feat)
2. **Task 2: MCP prompts registry — deploy, diagnose, new-project, incident + server wiring** - `c70a1ee` (feat)
3. **Task 3: Prompts tests + description/catalog test coverage + docs** - `106a6aa` (test)

## Files Created/Modified

- `src/mcp/prompts.ts` — greenfield `registerCoolifyPrompts` with four canonical workflows
- `src/mcp/server.ts` — catalog/footer description composition + prompt wiring in `createAndConnectServer`
- `src/mcp/server.test.ts` — Actions:/Safety: assertions via `_registeredTools`
- `tests/mcp/prompts.test.ts` — prompt name, empty-args, and content contract tests
- `README.md`, `README.de.md` — MCP Prompts section with args table
- `src/mcp/tools/emergency.test.ts`, `tests/integration/docs-parity.test.ts` — updated for new description/docs structure

## Decisions Made

- Shortened one-line purpose sentences in server.ts — action detail lives in hand-maintained catalog constants (UI-SPEC anatomy)
- Tests access `_registeredTools` / `_registeredPrompts` because McpServer SDK lacks public `listTools()` / `getPrompt()` helpers
- Added MCP Prompts to docs-parity canonical H2 map for EN/DE structural parity

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] emergency.test.ts source assertion broke after description refactor**
- **Found during:** Task 1 commit (pre-commit)
- **Issue:** Test expected inline `confirm:true` in server.ts emergency block; description now uses catalog/footer constants
- **Fix:** Assert `emergencyActionsCatalog` and `emergencySafetyFooter` in registration block
- **Files modified:** src/mcp/tools/emergency.test.ts
- **Committed in:** 26da577

**2. [Rule 3 - Blocking] docs-parity H2 count mismatch after README MCP Prompts section**
- **Found during:** Task 3 commit (pre-commit)
- **Issue:** New H2 section increased EN/DE heading count beyond CANONICAL_SECTIONS
- **Fix:** Added `{ en: '💬 MCP Prompts', de: '💬 MCP-Prompts' }` to canonical map
- **Files modified:** tests/integration/docs-parity.test.ts
- **Committed in:** 106a6aa

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking)
**Impact on plan:** Test harness updates only; no scope creep.

## Issues Encountered

- Plan verification `node -e require('./dist/mcp/prompts.js')` fails — tsup bundles single `dist/index.js` entry; prompt registration verified via vitest instead

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 19 complete — DX schemas + prompts shipped end-to-end
- Cursor parameter panel visual verification remains for verify-work (DX-02 human_judgment)
- Phase 21 can implement `deployment.watch` referenced by deploy prompt

---
*Phase: 19-dx-schemas-mcp-prompts*
*Completed: 2026-07-24*

## Self-Check: PASSED

- FOUND: .planning/phases/19-dx-schemas-mcp-prompts/19-02-SUMMARY.md
- FOUND: commit 26da577
- FOUND: commit c70a1ee
- FOUND: commit 106a6aa
