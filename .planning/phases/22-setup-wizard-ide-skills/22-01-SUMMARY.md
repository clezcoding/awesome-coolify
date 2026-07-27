---
phase: 22-setup-wizard-ide-skills
plan: 01
subsystem: mcp-tools
tags: [setup, gh-preflight, COOLIFY_SETUP_PAUSED, skills, vitest, mcp]

requires:
  - phase: 22-setup-wizard-ide-skills
    plan: 00
    provides: Wave 0 it.fails RED scaffolds for gh-preflight, setup, errors, skills manifest
provides:
  - setup MCP tool (preflight + resume + wire stub) registered as 18th tool
  - headless checkGhAuth via execFile with 5s timeout and GH_FORCE_TTY:0
  - COOLIFY_SETUP_PAUSED error code with UI-SPEC pause banners
  - skills/coolify-setup/SKILL.md first skill pack
affects: [22-02, 22-03]

tech-stack:
  added: []
  patterns:
    - "wrapSetupMcpError replaces JSON content with pause banner for COOLIFY_SETUP_PAUSED"
    - "resume re-runs runGhPreflight only — no sleep/poll for human gh auth"
    - "wire action throws COOLIFY_NOT_IMPLEMENTED until Plan 22-02"

key-files:
  created:
    - src/utils/gh-preflight.ts
    - src/mcp/tools/setup.ts
    - skills/coolify-setup/SKILL.md
  modified:
    - src/utils/errors.ts
    - src/mcp/server.ts
    - src/utils/gh-preflight.test.ts
    - src/mcp/tools/setup.test.ts
    - src/utils/errors.test.ts
    - src/mcp/server.test.ts
    - src/skills/skills-manifest.test.ts

key-decisions:
  - "wire stub throws COOLIFY_NOT_IMPLEMENTED — full greenfield/link-existing deferred to 22-02"
  - "Pause banner in content text via wrapSetupMcpError — wrapMcpError unchanged for other tools"
  - "coolify-setup manifest test flipped GREEN; deploy/diagnose/incident remain it.fails until 22-03"

patterns-established:
  - "setup.ts mirrors recipe.ts flat schema + handleSetupAction + isSetupErrorResult"
  - "gh-preflight.ts fixed argv execFile only — never gh auth login"
  - "Preflight ok returns setup_status in_progress, current_step gh_preflight, steps_completed"

requirements-completed: [SETUP-01, SETUP-03, SKILL-01]

coverage:
  - id: D1
    description: "Headless gh preflight with gh_missing, gh_unauthenticated, ok, and subprocess contract"
    requirement: SETUP-01
    verification:
      - kind: unit
        ref: "src/utils/gh-preflight.test.ts — 4 tests GREEN"
        status: pass
    human_judgment: false
  - id: D2
    description: "setup preflight soft-pause, ok progress fields, resume re-runs preflight"
    requirement: SETUP-03
    verification:
      - kind: unit
        ref: "src/mcp/tools/setup.test.ts — 3 tests GREEN"
        status: pass
    human_judgment: false
  - id: D3
    description: "COOLIFY_SETUP_PAUSED union and RECOVERY_HINTS resume wording"
    requirement: SETUP-03
    verification:
      - kind: unit
        ref: "src/utils/errors.test.ts#setup pause error codes — 2 tests GREEN"
        status: pass
    human_judgment: false
  - id: D4
    description: "setup registered as 18th MCP tool in server.ts"
    requirement: SETUP-01
    verification:
      - kind: unit
        ref: "src/mcp/server.test.ts — registerTool count 18 + setup in expectedTools"
        status: pass
    human_judgment: false
  - id: D5
    description: "coolify-setup SKILL.md canonical path with preflight/pause/resume playbook"
    requirement: SKILL-01
    verification:
      - kind: unit
        ref: "src/skills/skills-manifest.test.ts — coolify-setup GREEN"
        status: pass
    human_judgment: false

duration: 3min
completed: 2026-07-26
status: complete
---

# Phase 22 Plan 01: Setup Preflight Tracer Summary

**MCP setup tool with headless gh preflight, COOLIFY_SETUP_PAUSED soft-pause/resume, 18th server registration, and coolify-setup skill pack**

## Performance

- **Duration:** 3 min
- **Started:** 2026-07-26T01:25:56Z
- **Completed:** 2026-07-26T01:28:45Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments

- `checkGhAuth` runs `gh --version` and `gh auth status` via execFile with 5000ms timeout and `GH_FORCE_TTY:0`
- `setup` tool handles `preflight` and `resume` (re-runs preflight); `wire` stub returns `COOLIFY_NOT_IMPLEMENTED`
- Missing/unauthenticated gh returns `COOLIFY_SETUP_PAUSED` immediately with UI-SPEC pause banners and resume hints
- Ok preflight returns `setup_status: in_progress`, `current_step: gh_preflight`, `steps_completed: [gh_preflight]`
- `setup` registered as 18th `registerTool` in `server.ts`
- `skills/coolify-setup/SKILL.md` documents install command, workflow, modes, and optional flags

## Task Commits

Each task was committed atomically:

1. **Task 1: End-to-end setup preflight → gh check → pause or ok (+ resume)** - `ee8f52e` (feat)
2. **Task 2: Ship coolify-setup SKILL.md (first skill pack)** - `3b379a4` (feat)

## Files Created/Modified

- `src/utils/gh-preflight.ts` - Headless gh auth preflight utility
- `src/mcp/tools/setup.ts` - setup MCP handler with preflight/resume/wire stub
- `src/utils/errors.ts` - COOLIFY_SETUP_PAUSED code + RECOVERY_HINTS
- `src/mcp/server.ts` - setup tool registration (18th tool)
- `skills/coolify-setup/SKILL.md` - Agent skill playbook for setup workflow
- Test files flipped from it.fails to it for gh-preflight, setup, errors pause, server count, coolify-setup manifest

## Decisions Made

- wire stub throws COOLIFY_NOT_IMPLEMENTED — full implementation deferred to Plan 22-02 per plan scope
- Pause UX uses wrapSetupMcpError to put UI-SPEC banner in content text without changing global wrapMcpError
- Only coolify-setup manifest test flipped GREEN; other three skills remain RED until Plan 22-03

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 22-02 can implement `handleWire` greenfield/link-existing with recipe + manifest integration
- Plan 22-03 ships remaining skill packs (deploy, diagnose, incident) and docs/install.html skills block
- Full suite: 1065 passed | 3 expected fail (1068 total)

## Self-Check: PASSED

- FOUND: src/utils/gh-preflight.ts
- FOUND: src/mcp/tools/setup.ts
- FOUND: skills/coolify-setup/SKILL.md
- FOUND: ee8f52e
- FOUND: 3b379a4

---
*Phase: 22-setup-wizard-ide-skills*
*Completed: 2026-07-26*
