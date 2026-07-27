---
phase: 22-setup-wizard-ide-skills
plan: 02
subsystem: mcp-tools
tags: [setup, wire, greenfield, link-existing, gh-preflight, manifest, deploy_and_watch, vitest]

requires:
  - phase: 22-setup-wizard-ide-skills
    plan: 01
    provides: setup MCP tool preflight/resume, checkGhAuth, COOLIFY_SETUP_PAUSED
provides:
  - Unified setup wire action with mode greenfield|link-existing
  - handleWire + handleResume orchestration with manifest upsert
  - createGhRepo with optional push flag (default false)
  - Optional include_domains, set_env, deploy_and_watch (default false)
  - deploy_and_watch bounded watch timeout 300 with COOLIFY_WATCH_TIMEOUT recovery
affects: [22-03]

tech-stack:
  added: []
  patterns:
    - "Unified wire action with required mode enum — resume re-supplies same params (D-07 option-a)"
    - "createGhRepo push:false default — --push only when push:true (D-12 soft deviation)"
    - "link-existing validates UUIDs and writes manifest without handleRecipeAction unless application_uuid"
    - "greenfield chains gh preflight → createGhRepo → linkage → handleRecipeAction → ManifestManager.upsert"
    - "deploy_and_watch: application.deploy wait:false then deployment.watch timeout 300"

key-files:
  created: []
  modified:
    - src/mcp/tools/setup.ts
    - src/mcp/tools/setup.test.ts
    - src/utils/gh-preflight.ts
    - src/utils/gh-preflight.test.ts

key-decisions:
  - "Unified wire action (option-a) — single action with mode enum for greenfield and link-existing"
  - "Optional push boolean on greenfield wire — default false preserves D-12; push:true passes gh --push"
  - "link-existing skip_gh skips gh preflight when no repo_name"
  - "set_env/include_domains no-op without extra params — ponytail ceiling until env sync params ship"

patterns-established:
  - "handleWire branches D-08/D-09 using internal handleRecipeAction/ManifestManager imports"
  - "remainingSteps tracks gh_preflight, repo, linkage, recipe, manifest, optional domains/env/deploy_watch"
  - "formatSetupCompleteBanner suggests manual git push only when repo created without push:true"

requirements-completed: [SETUP-02, SETUP-03]

coverage:
  - id: D1
    description: "Wire link-existing validates UUIDs and upserts manifest without recipe create"
    requirement: SETUP-02
    verification:
      - kind: unit
        ref: "src/mcp/tools/setup.test.ts#upserts manifest without calling handleRecipeAction"
        status: pass
    human_judgment: false
  - id: D2
    description: "Wire greenfield runs createGhRepo (no --push default), recipe, manifest upsert"
    requirement: SETUP-02
    verification:
      - kind: unit
        ref: "src/mcp/tools/setup.test.ts#runs recipe and manifest upsert with manual push suggestion by default"
        status: pass
    human_judgment: false
  - id: D3
    description: "Optional push flag — false omits --push; true passes --push to gh repo create"
    requirement: SETUP-02
    verification:
      - kind: unit
        ref: "src/utils/gh-preflight.test.ts#createGhRepo argv tests"
        status: pass
    human_judgment: false
  - id: D4
    description: "Resume continues wire with re-supplied params (stateless MCP re-entry)"
    requirement: SETUP-03
    verification:
      - kind: unit
        ref: "src/mcp/tools/setup.test.ts#resume continues wire with re-supplied params"
        status: pass
    human_judgment: false
  - id: D5
    description: "deploy_and_watch returns deployment_uuid + COOLIFY_WATCH_TIMEOUT recovery banner"
    requirement: SETUP-02
    verification:
      - kind: unit
        ref: "src/mcp/tools/setup.test.ts#returns deployment_uuid and recovery hints on COOLIFY_WATCH_TIMEOUT"
        status: pass
    human_judgment: false

duration: 3min
completed: 2026-07-26
status: complete
---

# Phase 22 Plan 02: Wire Orchestration Summary

**Unified setup wire action with greenfield/link-existing modes, createGhRepo push-default-false, and bounded deploy_and_watch**

## Performance

- **Duration:** 3 min
- **Started:** 2026-07-26T02:14:00Z
- **Completed:** 2026-07-26T02:17:19Z
- **Tasks:** 2 auto (2 decision checkpoints pre-resolved)
- **Files modified:** 4

## Accomplishments

- `handleWire` implements link-existing (UUID validate + manifest write, no forced recipe) and greenfield (gh → repo → linkage → recipe → manifest)
- `createGhRepo` with optional `push` flag; default omits `--push` and suggests manual git push in banner
- `resume` with `mode` delegates to `handleWire` with same params per D-06
- `deploy_and_watch` triggers deploy + `deployment.watch` timeout 300; COOLIFY_WATCH_TIMEOUT dual-signal recovery

## Task Commits

1. **Task 1: Implement wire link-existing + greenfield core + manifest write** - `d42e06c` (feat)
2. **Task 2: Optional flags + deploy_and_watch bounded path** - `857c761` (test)

**Plan metadata:** pending (docs commit follows)

## Files Created/Modified

- `src/mcp/tools/setup.ts` — handleWire, handleGreenfieldWire, handleLinkExistingWire, optional flag branches, push schema field
- `src/utils/gh-preflight.ts` — createGhRepo with push option; createGhRepoNoPush wrapper
- `src/mcp/tools/setup.test.ts` — wire link-existing, greenfield, resume, push, deploy_and_watch tests
- `src/utils/gh-preflight.test.ts` — createGhRepo argv push true/false tests

## Decisions Made

- Unified wire action (checkpoint option-a) — single action, mode enum required on wire
- D-12 soft deviation: optional `push` boolean on greenfield wire; default false; push:true allows gh `--push`
- ponytail: include_domains without domain list and set_env without env_file are manifest-only no-ops

## Deviations from Plan

### Planned Soft Deviation (User-Approved)

**D-12 push policy — optional `push` flag**
- **Context:** Plan originally locked push-never; user chose option 1 at checkpoint
- **Change:** Added optional `push: boolean` on wire/resume; default false/omitted never passes `--push`; push:true passes `--push` to `gh repo create`
- **Files:** `src/mcp/tools/setup.ts`, `src/utils/gh-preflight.ts`, tests in both test files
- **Verification:** gh-preflight tests assert argv with/without `--push`; setup test asserts push:true omits manual push banner

### Auto-fixed Issues

**1. [Rule 1 - Bug] createGhRepo stdout extraction under vitest execFile mock**
- **Found during:** Task 1 (gh-preflight tests)
- **Issue:** Destructuring `{ stdout }` from promisified mock returned undefined
- **Fix:** Normalize execFileAsync result for string or `{ stdout }` shape
- **Files modified:** `src/utils/gh-preflight.ts`
- **Committed in:** `d42e06c`

---

**Total deviations:** 1 user-approved soft deviation + 1 auto-fix
**Impact on plan:** D-12 default preserved; opt-in push tested. No scope creep beyond checkpoint resolution.

## Issues Encountered

None blocking.

## User Setup Required

Coolify API (`COOLIFY_URL`, `COOLIFY_TOKEN`) and optional GitHub CLI auth for greenfield repo create — see plan `user_setup` block.

## Next Phase Readiness

- Plan 22-03 can ship remaining skills/docs and flip Wave 0 it.fails scaffolds
- Wire orchestration complete for SETUP-02/SETUP-03

## Self-Check: PASSED

- FOUND: src/mcp/tools/setup.ts
- FOUND: src/utils/gh-preflight.ts
- FOUND: src/mcp/tools/setup.test.ts
- FOUND: src/utils/gh-preflight.test.ts
- FOUND: d42e06c
- FOUND: 857c761

---
*Phase: 22-setup-wizard-ide-skills*
*Completed: 2026-07-26*
