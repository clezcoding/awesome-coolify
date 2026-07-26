---
phase: 22-setup-wizard-ide-skills
plan: 00
subsystem: testing
tags: [vitest, tdd, wave-0, red-scaffold, setup-wizard, gh-preflight, skills, it.fails]

requires:
  - phase: 21-deploy-watch
    provides: deployment.watch bounded timeout pattern, COOLIFY_WATCH_TIMEOUT error codes
provides:
  - 13 it.fails RED scaffolds for gh-preflight, setup preflight/resume, COOLIFY_SETUP_PAUSED, skills manifest
  - dynamic import + vi.hoisted mock patterns for modules absent until Plan 22-01
affects: [22-01, 22-02, 22-03]

tech-stack:
  added: []
  patterns:
    - "Wave 0 RED via vitest it.fails + dynamic import('./gh-preflight.js' | './setup.js')"
    - "setup.test.ts uses vi.hoisted checkGhAuth mock — no top-level import of absent gh-preflight.ts"
    - "skills-manifest.test.ts per-skill it.fails for frontmatter name/dir parity"

key-files:
  created:
    - src/utils/gh-preflight.test.ts
    - src/mcp/tools/setup.test.ts
    - src/skills/skills-manifest.test.ts
  modified:
    - src/utils/errors.test.ts

key-decisions:
  - "it.fails statt bare it — husky pre-commit bleibt grün bis 22-01..22-03 flip GREEN"
  - "setup.test.ts vi.hoisted mock statt top-level gh-preflight import — Modul fehlt in Wave 0"
  - "Keine Produktionsdateien gh-preflight.ts / setup.ts in Wave 0 — nur Test-Scaffolds"

patterns-established:
  - "gh-preflight.test.ts: 4 it.fails (gh_missing, gh_unauthenticated, ok, GH_FORCE_TTY+timeout contract)"
  - "setup.test.ts: 3 it.fails (COOLIFY_SETUP_PAUSED pause, preflight ok, resume re-runs preflight)"
  - "errors.test.ts describe setup pause error codes: 2 it.fails for COOLIFY_SETUP_PAUSED union/hints"
  - "skills-manifest.test.ts: 4 it.fails (coolify-setup/deploy/diagnose/incident SKILL.md layout)"

requirements-completed: [SETUP-01, SETUP-03, SKILL-01]

coverage:
  - id: D1
    description: "gh-preflight RED scaffolds (missing, unauth, ok, subprocess timeout/GH_FORCE_TTY contract)"
    requirement: SETUP-01
    verification:
      - kind: unit
        ref: "src/utils/gh-preflight.test.ts — 4 it.fails"
        status: pass
    human_judgment: false
  - id: D2
    description: "setup MCP tool preflight pause/ok/resume RED scaffolds"
    requirement: SETUP-03
    verification:
      - kind: unit
        ref: "src/mcp/tools/setup.test.ts — 3 it.fails"
        status: pass
    human_judgment: false
  - id: D3
    description: "COOLIFY_SETUP_PAUSED error code union and RECOVERY_HINTS resume hint scaffolds"
    requirement: SETUP-03
    verification:
      - kind: unit
        ref: "src/utils/errors.test.ts#setup pause error codes — 2 it.fails"
        status: pass
    human_judgment: false
  - id: D4
    description: "Four coolify-* skill directory SKILL.md frontmatter layout scaffolds"
    requirement: SKILL-01
    verification:
      - kind: unit
        ref: "src/skills/skills-manifest.test.ts — 4 it.fails"
        status: pass
    human_judgment: false

duration: 5min
completed: 2026-07-26
status: complete
---

# Phase 22 Plan 00: Wave 0 RED Test Scaffolds Summary

**13 vitest it.fails RED scaffolds lock SETUP-01/03 and SKILL-01 contracts for gh preflight, setup pause/resume, and skills manifest before Plan 22-01 ships implementation**

## Performance

- **Duration:** 5 min
- **Started:** 2026-07-26T01:22:00Z
- **Completed:** 2026-07-26T01:27:00Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- `gh-preflight.test.ts` documents checkGhAuth subprocess contract (gh_missing, gh_unauthenticated, ok, GH_FORCE_TTY + 5000ms timeout)
- `setup.test.ts` documents preflight soft-pause (COOLIFY_SETUP_PAUSED), ok path, and resume re-runs preflight without in-tool polling
- `errors.test.ts` gains setup pause error code scaffolds for COOLIFY_SETUP_PAUSED union and RECOVERY_HINTS resume wording
- `skills-manifest.test.ts` locks four `skills/coolify-*/SKILL.md` dirs with frontmatter `name:` matching directory suffix

## Task Commits

Each task was committed atomically:

1. **Task 1: gh-preflight.test.ts RED scaffolds** - `e5d6052` (test)
2. **Task 2: setup.test.ts + errors.test.ts setup-pause RED scaffolds** - `3918821` (test)
3. **Task 3: skills-manifest.test.ts RED scaffolds** - `5c3eceb` (test)

**Plan metadata:** pending (docs: complete plan)

## Files Created/Modified

- `src/utils/gh-preflight.test.ts` - execFile mock RED scaffolds for checkGhAuth
- `src/mcp/tools/setup.test.ts` - handleSetupAction preflight/resume RED scaffolds with hoisted gh mock
- `src/utils/errors.test.ts` - setup pause error codes describe block
- `src/skills/skills-manifest.test.ts` - four skill directory layout RED scaffolds

## Decisions Made

- Used `vi.hoisted` for `checkGhAuth` mock in setup.test.ts because top-level import of absent `gh-preflight.ts` breaks vitest collection
- Combined setup + errors scaffolds in one task commit per plan grouping
- No production `gh-preflight.ts` or `setup.ts` created — Wave 0 tests only per plan prohibitions

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] setup.test.ts top-level gh-preflight import broke vitest**
- **Found during:** Task 2
- **Issue:** Static `import { checkGhAuth } from '../../utils/gh-preflight.js'` fails module resolution when gh-preflight.ts absent
- **Fix:** Replaced with `vi.hoisted(() => ({ checkGhAuthMock: vi.fn() }))` and mock factory reference
- **Files modified:** src/mcp/tools/setup.test.ts
- **Verification:** `pnpm test -- src/mcp/tools/setup.test.ts -x` exits 0
- **Committed in:** 3918821

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Minimal — same test intent, safer Wave 0 import pattern.

## Issues Encountered

None beyond the hoisted-mock fix above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 22-01 can implement `gh-preflight.ts`, `setup.ts`, and `COOLIFY_SETUP_PAUSED` in errors.ts then flip it.fails → it
- Skills SKILL.md files deferred to Plan 22-03 per wave plan
- Full suite: 1055 passed | 13 expected fail (1068 total)

## TDD Gate Compliance

- RED gate: 3 `test(...)` commits with it.fails scaffolds only — no production implementation in Wave 0
- GREEN gate: deferred to Plans 22-01..22-03

## Self-Check: PASSED

- FOUND: src/utils/gh-preflight.test.ts
- FOUND: src/mcp/tools/setup.test.ts
- FOUND: src/skills/skills-manifest.test.ts
- FOUND: src/utils/errors.test.ts (setup pause describe)
- FOUND: e5d6052
- FOUND: 3918821
- FOUND: 5c3eceb
- No production files: src/utils/gh-preflight.ts, src/mcp/tools/setup.ts absent

---
*Phase: 22-setup-wizard-ide-skills*
*Completed: 2026-07-26*
