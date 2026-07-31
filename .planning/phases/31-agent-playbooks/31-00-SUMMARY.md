---
phase: 31-agent-playbooks
plan: 00
subsystem: testing
tags: [vitest, it.fails, diagnose, recipe, prompts, log-patterns, nyquist]

requires:
  - phase: 26-diagnose-logs-incident-dx
    provides: diagnose.logs fetch + FollowUpHint patterns
  - phase: 20-one-click-recipes
    provides: recipe actions + fetchServiceTemplates
  - phase: 30-deploy-guard
    provides: deployment.preflight/rollback + 15 capability keys

provides:
  - Wave 0 it.fails RED scaffolds for BRAIN/PLAY/SREC
  - matchLogPatterns shell export for Wave 1 wiring
  - Locked analyze/recommend/prompt/capability contracts

affects:
  - 31-01 diagnose.analyze GREEN
  - 31-02 playbook prompts GREEN
  - 31-03 recipe.recommend GREEN
  - 31-04 capabilities + docs

tech-stack:
  added: []
  patterns:
    - "Wave 0 it.fails Nyquist scaffolds before handler GREEN"
    - "Pure matchLogPatterns shell returns [] until Wave 1"

key-files:
  created:
    - src/utils/log-patterns.ts
    - src/utils/log-patterns.test.ts
  modified:
    - src/mcp/tools/diagnose.test.ts
    - src/mcp/tools/recipe.test.ts
    - tests/mcp/prompts.test.ts
    - src/mcp/tools/system.test.ts

key-decisions:
  - "matchLogPatterns shell returns [] (not throw) so empty-input green it() cases lock early"
  - "Four-prompt registration tests stay green; six-name set is separate it.fails describe"
  - "Fifteen-key capability it() stays; seventeen-key expectation is it.fails only"

patterns-established:
  - "Phase 31 Wave 0: it.fails per BRAIN/PLAY/SREC contract; flip in 01–04"
  - "Co-located Vitest + describe('diagnose analyze') / describe('recipe recommend')"

requirements-completed: []  # Wave 0 RED only — GREEN plans 01–04 mark BRAIN/PLAY/SREC

coverage:
  - id: D1
    description: "log-patterns matcher RED fixtures for oom/http_5xx_spike/crash_loop/connection_refused"
    requirement: BRAIN-01
    verification:
      - kind: unit
        ref: "src/utils/log-patterns.test.ts#matchLogPatterns"
        status: pass
    human_judgment: false
  - id: D2
    description: "diagnose.analyze it.fails schema + OOM hints + empty/soft-partial/advisory"
    requirement: BRAIN-02
    verification:
      - kind: unit
        ref: "src/mcp/tools/diagnose.test.ts#diagnose analyze"
        status: pass
    human_judgment: false
  - id: D3
    description: "recipe.recommend it.fails plan_steps + live catalog + no mutations"
    requirement: SREC-01
    verification:
      - kind: unit
        ref: "src/mcp/tools/recipe.test.ts#recipe recommend"
        status: pass
    human_judgment: false
  - id: D4
    description: "prompts six-name + rollback/maintenance-window/incident composition RED"
    requirement: PLAY-01
    verification:
      - kind: unit
        ref: "tests/mcp/prompts.test.ts#MCP prompts Phase 31 playbooks"
        status: pass
    human_judgment: false
  - id: D5
    description: "seventeen capability keys RED including diagnose_analyze and recipe_recommend"
    requirement: SREC-02
    verification:
      - kind: unit
        ref: "src/mcp/tools/system.test.ts#capabilities D-19"
        status: pass
    human_judgment: false

duration: 3min
completed: 2026-07-31
status: complete
---

# Phase 31 Plan 00: Agent Playbooks Wave 0 Summary

**Nyquist RED scaffolds lock BRAIN/PLAY/SREC contracts via it.fails; matchLogPatterns shell only — no analyze/recommend/prompt GREEN.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-07-31T02:14:19Z
- **Completed:** 2026-07-31T02:17:45Z
- **Tasks:** 3/3
- **Files modified:** 6

## Accomplishments

- Shell `matchLogPatterns` + four-pattern `it.fails` fixtures (BRAIN-01)
- `diagnose analyze` / `recipe recommend` RED integration scaffolds (BRAIN-02, SREC-01/02, D-06/D-14/D-15)
- Six-prompt + seventeen-capability RED locks; existing four-prompt / fifteen-key greens untouched (PLAY-01/02, D-19)

## Task Commits

1. **Task 1: log-patterns shell + matcher RED scaffolds** - `a35d778` (test)
2. **Task 2: diagnose.analyze and recipe.recommend RED scaffolds** - `fd63f12` (test)
3. **Task 3: prompts 6-name set and capability key RED scaffolds** - `6511fee` (test)

**Plan metadata:** (pending docs commit)

## Files Created/Modified

- `src/utils/log-patterns.ts` — Wave 0 shell export `matchLogPatterns` → `[]`
- `src/utils/log-patterns.test.ts` — empty green + four `it.fails` pattern IDs
- `src/mcp/tools/diagnose.test.ts` — `describe('diagnose analyze')` RED
- `src/mcp/tools/recipe.test.ts` — `describe('recipe recommend')` RED
- `tests/mcp/prompts.test.ts` — Phase 31 playbooks RED describe
- `src/mcp/tools/system.test.ts` — seventeen-key capability `it.fails`

## Decisions Made

- Shell returns `[]` (not throw) so empty/noise green contracts lock in Wave 0
- Keep current four-prompt and fifteen-key assertions green; new expectations only under `it.fails`
- Vitest verify used `--bail 1` (v4 rejects plan's `-x` flag)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Vitest 4 unknown option `-x`**
- **Found during:** Task 1 verify
- **Issue:** `npx vitest run ... -x` throws `CACError: Unknown option '-x'`
- **Fix:** Used `--bail 1` for fail-fast; suite otherwise unchanged
- **Files modified:** none (command only)
- **Verification:** Wave 0 suite 107 passed | 18 expected fail
- **Committed in:** N/A (verify command)

**2. [Rule 2 - Correctness] Skipped premature requirements.mark-complete**
- **Found during:** State updates after SUMMARY
- **Issue:** Plan frontmatter lists BRAIN/PLAY/SREC IDs, but Wave 0 only locks RED scaffolds — marking Complete would lie until 01–04 GREEN
- **Fix:** Left checkboxes unchecked; traceability table set to Pending
- **Files modified:** `.planning/REQUIREMENTS.md`
- **Verification:** REQUIREMENTS.md shows `[ ]` + Pending for all six IDs
- **Committed in:** docs metadata commit

**Total deviations:** 2 auto-fixed (Rule 3 + Rule 2)
**Impact on plan:** Correct — Wave 0 does not ship requirement GREEN

## TDD Gate Compliance

- RED gate: three `test(31-00):` commits present
- GREEN gate: intentionally deferred to plans 31-01…31-04 (Wave 0 = `it.fails` only)
- No unexpected early GREEN for analyze/recommend/prompts/capabilities

## Known Stubs

| File | Line | Stub | Reason |
|------|------|------|--------|
| `src/utils/log-patterns.ts` | matchLogPatterns body | returns `[]` | Intentional Wave 0 shell; GREEN in 31-01 |

## Issues Encountered

None beyond Vitest `-x` flag mismatch (handled above).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- 31-01: implement `matchLogPatterns` + `diagnose.analyze`; flip diagnose/log-patterns `it.fails` → `it`
- 31-02: prompts rollback/maintenance-window + incident upgrade
- 31-03: `recipe.recommend`
- 31-04: capabilities + README/coverage

## Self-Check: PASSED

- FOUND: `src/utils/log-patterns.ts`, `src/utils/log-patterns.test.ts`
- FOUND: commits `a35d778`, `fd63f12`, `6511fee`
- FOUND: describe blocks diagnose analyze / recipe recommend / maintenance-window / diagnose_analyze

---
*Phase: 31-agent-playbooks*
*Completed: 2026-07-31*
