---
phase: quick-260729-6el
plan: 01
subsystem: documentation
tags: [readme, bilingual, github-markdown, docs-parity]
requires:
  - phase: 27-branding-docs-stale-fix
    provides: current package branding and MCP 1.0.1 surface
provides:
  - Accurate bilingual README coverage for 18 tools and four prompts
  - Stronger automated guard against stale capability claims
  - Polished GitHub presentation using verified project assets and badges
affects: [public-docs, release-docs, docs-parity]
tech-stack:
  added: []
  patterns: [source-backed public claims, position-matched EN-DE structure]
key-files:
  created: []
  modified:
    - README.md
    - README.de.md
    - tests/integration/docs-parity.test.ts
key-decisions:
  - "Publish exact 18-tool count without an approximate global action count."
  - "Limit future scope to upstream log APIs, tracked OpenAPI gaps, and cross-instance fan-out."
patterns-established:
  - "README product claims must map to registrations, action catalogs, package metadata, or tests."
  - "English and German README H2 sections stay position-matched."
requirements-completed: [QUICK-README]
coverage:
  - id: D1
    description: Current bilingual product truth and install guidance
    requirement: QUICK-README
    verification:
      - kind: integration
        ref: "pnpm exec vitest run tests/integration/docs-parity.test.ts src/mcp/server.test.ts"
        status: pass
    human_judgment: false
  - id: D2
    description: GitHub-rendered visual quality for assets, badges, tables, admonitions, and controls
    requirement: QUICK-README
    verification: []
    human_judgment: true
    rationale: "GitHub-flavored Markdown preview is visual and was not available in this execution environment."
duration: 5min
completed: 2026-07-29
status: complete
---

# Quick 260729-6el: Bilingual README Refresh Summary

**English and German READMEs now describe the shipped 1.0.1 product surface, safe install path, 18 tools, four prompts, current workflows, and honest API limits.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-07-29T02:40:30Z
- **Completed:** 2026-07-29T02:45:06Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Replaced stale tool/action counts and shipped-as-future claims with source-backed product facts.
- Added current CRUD, recipe, setup, deployment-watch/log, application-follow, and diagnose-log coverage in both locales.
- Strengthened parity tests to require all 18 registered tools and high-value shipped actions.
- Added defensible CI/release badges while retaining project artwork, safe placeholders, and non-affiliation copy.

## Task Commits

1. **Task 1: Rewrite English and German READMEs against live product truth** — `1743f36`
2. **Task 2: Apply visual polish, asset discipline, and final documentation checks** — `46c1e7a`

## Files Created/Modified

- `README.md` — Current English install, capability, safety, workflow, status, and future-scope entry point.
- `README.de.md` — Natural German counterpart with matching technical facts and section order.
- `tests/integration/docs-parity.test.ts` — 18-tool inventory and stale-claim regression guard.

## Decisions Made

- Omitted approximate action totals because no single public source represents the complete MCP action surface.
- Removed obsolete roadmap art because it depicts already-shipped work.
- Kept service/database logs explicitly unavailable on Coolify 4.1.x; no stub claim.

## Deviations from Plan

None - plan executed within requested scope.

## Verification

- `pnpm exec vitest run tests/integration/docs-parity.test.ts src/mcp/server.test.ts` — 39 passed.
- `pnpm run lint` — passed; tsup build succeeded.
- `pnpm test` — 57 files, 1182 tests passed.
- Local targets, committed CDN asset paths, code fences, CI badge workflow target, and `.planning/` leak guard — passed.
- IDE diagnostics — no errors.
- GitHub-rendered manual preview — not run; requires human visual review in GitHub.

## Known Stubs

None.

## User Setup Required

None.

## Self-Check: PASSED

- All three modified implementation files exist.
- Task commits `1743f36` and `46c1e7a` exist.
- Summary has `status: complete`.
