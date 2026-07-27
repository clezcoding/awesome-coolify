---
phase: 22-setup-wizard-ide-skills
plan: 03
subsystem: docs
tags: [skills, ide, setup, deploy, diagnose, incident, vitest, github-pages]

requires:
  - phase: 22-setup-wizard-ide-skills
    plan: 01
    provides: coolify-setup SKILL.md, setup MCP tool registration
  - phase: 22-setup-wizard-ide-skills
    plan: 02
    provides: wire/resume orchestration, push flag, deploy_and_watch
provides:
  - coolify-deploy, coolify-diagnose, coolify-incident SKILL.md packs
  - skills-manifest.test.ts GREEN with SKILL-02 grep coverage
  - docs/en/setup.md MCP setup guide
  - install.html skills block + 18-tool hero
  - shared.css pause/setup/skills CSS classes
  - README EN/DE IDE skills install subsection
affects: [22-04]

tech-stack:
  added: []
  patterns:
    - "Four skills at skills/coolify-*/SKILL.md — single source of truth (D-13)"
    - "deployment.watch primary in coolify-deploy; wait:true legacy note only"
    - "Canonical npx skills add clezcoding/awesome-coolify pinned across README + docs (D-17)"
    - "setup.md documents MCP setup tool — not CLI wizard (D-01)"

key-files:
  created:
    - skills/coolify-deploy/SKILL.md
    - skills/coolify-diagnose/SKILL.md
    - skills/coolify-incident/SKILL.md
    - docs/en/setup.md
  modified:
    - skills/coolify-setup/SKILL.md
    - src/skills/skills-manifest.test.ts
    - docs/install.html
    - docs/index.html
    - docs/shared.css
    - README.md
    - README.de.md

key-decisions:
  - "All four skills name MCP prompt analog explicitly (new-project, deploy, diagnose, incident)"
  - "coolify-setup documents optional push flag default false per 22-02 D-12 soft deviation"
  - "install.html hero 18 tools — setup is 18th registerTool per 22-01"

patterns-established:
  - "skills-manifest.test.ts asserts frontmatter, deployment.watch, confirm, prompt analog per skill"
  - "docs/en/setup.md mirrors cloud.md structure with setup-steps HTML classes for future shell"

requirements-completed: [SKILL-01, SKILL-02]

coverage:
  - id: D1
    description: "Four skills at skills/coolify-{setup,deploy,diagnose,incident}/SKILL.md"
    requirement: SKILL-01
    verification:
      - kind: unit
        ref: "src/skills/skills-manifest.test.ts#four skill directories exist"
        status: pass
    human_judgment: false
  - id: D2
    description: "skills-manifest.test.ts GREEN — frontmatter, watch, confirm, prompt analogs"
    requirement: SKILL-02
    verification:
      - kind: unit
        ref: "src/skills/skills-manifest.test.ts"
        status: pass
    human_judgment: false
  - id: D3
    description: "coolify-deploy documents deployment.watch primary + COOLIFY_WATCH_TIMEOUT recovery"
    requirement: SKILL-02
    verification:
      - kind: unit
        ref: "src/skills/skills-manifest.test.ts#skills/coolify-deploy/SKILL.md documents deployment.watch workflow"
        status: pass
    human_judgment: false
  - id: D4
    description: "docs/install.html skills block + README EN/DE with canonical npx command"
    requirement: SKILL-01
    verification:
      - kind: other
        ref: "rg npx skills add clezcoding/awesome-coolify README.md docs/install.html"
        status: pass
    human_judgment: false
  - id: D5
    description: "docs/en/setup.md with COOLIFY_SETUP_PAUSED and setup tool flow"
    requirement: SKILL-01
    verification:
      - kind: other
        ref: "rg COOLIFY_SETUP_PAUSED docs/en/setup.md"
        status: pass
    human_judgment: true
    rationale: "Setup docs scroll/layout backstop (8+ steps in .setup-steps) requires visual check in browser"

duration: 3min
completed: 2026-07-26
status: complete
---

# Phase 22 Plan 03: IDE Skills & Docs Summary

**Four workflow skill packs, GREEN skills-manifest test, and user-facing setup/install docs for Cursor, Claude Code, Codex**

## Performance

- **Duration:** 3 min
- **Started:** 2026-07-26T02:18:00Z
- **Completed:** 2026-07-26T02:20:21Z
- **Tasks:** 3 auto
- **Files modified:** 11

## Accomplishments

- Shipped `coolify-deploy`, `coolify-diagnose`, `coolify-incident` SKILL.md aligned with MCP prompts and action catalogs
- Updated `coolify-setup` with wire modes, optional `push` flag, sibling cross-links
- Flipped `skills-manifest.test.ts` GREEN with per-skill watch/confirm/prompt analog asserts
- Added `docs/en/setup.md`, install.html skills block (18 tools), shared.css UI-SPEC classes
- README EN/DE IDE skills subsection with canonical `npx skills add` command

## Task Commits

1. **Task 1: Ship coolify-deploy, coolify-diagnose, coolify-incident SKILL.md files** - `ce07c65` (feat)
2. **Task 2: skills-manifest.test.ts GREEN + SKILL-02 grep coverage** - `ae75fb7` (test)
3. **Task 3: Docs: install.html, setup.md, shared.css, index.html, README EN/DE** - `627a19a` (docs)

**Plan metadata:** pending (docs commit follows)

## Files Created/Modified

- `skills/coolify-deploy/SKILL.md` — deploy → deployment.watch workflow, recipe shortcuts
- `skills/coolify-diagnose/SKILL.md` — diagnoseActionsCatalog, reveal/confirm safety
- `skills/coolify-incident/SKILL.md` — incident workflow with emergency confirm gates
- `skills/coolify-setup/SKILL.md` — wire/resume, push flag, new-project analog
- `src/skills/skills-manifest.test.ts` — four-skill layout + SKILL-02 content asserts
- `docs/en/setup.md` — MCP setup guide with soft-pause and optional flags
- `docs/install.html` — skills-command block, 18-tool hero, copy button
- `docs/shared.css` — `.notice--pause`, `.setup-steps`, `.skills-command`
- `docs/index.html` — setup guide + IDE skills bento links
- `README.md`, `README.de.md` — IDE skills install subsection

## Decisions Made

- lowercase `confirm` in deploy skill Safety section for grep/test parity
- diagnose skill cross-references deployment.watch via remediation step (not primary workflow)
- setup.md uses HTML class markers for future static shell rendering

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] coolify-deploy missing lowercase confirm for manifest test**
- **Found during:** Task 2 (skills-manifest.test.ts)
- **Issue:** Safety section used `Confirm` capitalized — test expects `confirm` substring
- **Fix:** Rewrote bullet with `` **`confirm` gates** ``
- **Files modified:** `skills/coolify-deploy/SKILL.md`
- **Committed in:** `ae75fb7`

**2. [Rule 2 - Missing Critical] coolify-diagnose lacked deployment.watch reference**
- **Found during:** Task 2 (skills-manifest.test.ts)
- **Issue:** Per-skill watch assert failed — diagnose had no watch wording
- **Fix:** Added remediation step 6 linking to coolify-deploy watch flow
- **Files modified:** `skills/coolify-diagnose/SKILL.md`
- **Committed in:** `ae75fb7`

---

**Total deviations:** 2 auto-fixed (1 bug, 1 missing critical content)
**Impact on plan:** Test-driven skill doc patches only; no scope creep.

## Issues Encountered

None blocking.

## User Setup Required

None — skills install is consumer-side `npx skills add`; MCP setup requires existing COOLIFY_URL/TOKEN per prior plans.

## Next Phase Readiness

- Plan 22-04 (if any) can run final phase verification / ship
- SKILL-01/02 requirements satisfied; Wave 3 skills/docs complete

## Self-Check: PASSED

- FOUND: skills/coolify-deploy/SKILL.md
- FOUND: skills/coolify-diagnose/SKILL.md
- FOUND: skills/coolify-incident/SKILL.md
- FOUND: docs/en/setup.md
- FOUND: src/skills/skills-manifest.test.ts
- FOUND: ce07c65
- FOUND: ae75fb7
- FOUND: 627a19a

---
*Phase: 22-setup-wizard-ide-skills*
*Completed: 2026-07-26*
