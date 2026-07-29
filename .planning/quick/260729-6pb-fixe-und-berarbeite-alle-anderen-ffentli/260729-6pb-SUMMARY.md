---
phase: quick-260729-6pb
plan: 01
subsystem: documentation
tags: [cursor, openapi, skills, public-docs, vitest]
requires:
  - phase: 27-branding-docs-stale-fix
    provides: MCP icon evidence and package 1.0.1 documentation baseline
provides:
  - Safe English and German Cursor setup guides
  - Current Cloud, setup, OpenAPI, branding, policy, and contribution guidance
  - Generated coverage prose owned by renderer
  - Public-document integrity and skill-contract tests
affects: [documentation, contributor-experience, release-process]
tech-stack:
  added: []
  patterns:
    - Generated coverage prose is authored only in openapi-coverage-render.mjs
    - Public docs derive package, tool, prompt, and capability facts from source
key-files:
  created:
    - docs/en/cursor.md
    - docs/de/cursor.md
    - tests/integration/public-docs.test.ts
  modified:
    - scripts/lib/openapi-coverage-render.mjs
    - docs/COVERAGE.md
    - skills/coolify-diagnose/SKILL.md
key-decisions:
  - Preserve all released CHANGELOG headings and bodies; add orientation only above releases.
  - Document service/database logs as unavailable on Coolify 4.1.x instead of suggesting unsupported calls.
  - Keep Cursor icon fallback as dated client-limit evidence without a nonexistent screenshot.
requirements-completed: [DOC-01]
coverage:
  - id: D1
    description: Public non-README documentation reflects shipped package and MCP behavior.
    requirement: DOC-01
    verification:
      - kind: integration
        ref: tests/integration/public-docs.test.ts
        status: pass
    human_judgment: false
  - id: D2
    description: Generated OpenAPI coverage remains deterministic and renderer-owned.
    requirement: DOC-01
    verification:
      - kind: integration
        ref: pnpm run openapi:coverage -- --check
        status: pass
    human_judgment: false
  - id: D3
    description: Cursor rendering, icon fallback, and locale reading quality.
    requirement: DOC-01
    verification: []
    human_judgment: true
    rationale: Cursor client rendering and final editorial judgment require optional manual preview.
duration: 8min
completed: 2026-07-29
status: complete
---

# Quick Task 260729-6pb: Public Documentation Refresh Summary

**Current public docs, paired Cursor/Cloud guides, generated OpenAPI coverage, and skill runbooks backed by full link, contract, test, and build gates**

## Performance

- **Started:** 2026-07-29T02:54:38Z
- **Completed:** 2026-07-29T03:02:00Z
- **Tasks:** 3/3
- **Committed files:** 21
- **Atomic implementation commits:** 3

## Task Commits

1. **Contributor-to-Cursor path** — `ed88001`
2. **Technical references and generated coverage** — `1dcea8d`
3. **Public skill synchronization and publication gates** — `6b9fc7d`

Planning artifacts remain uncommitted as requested.

## Exact File Inventory

### Added

- `docs/en/cursor.md`
- `docs/de/cursor.md`
- `tests/integration/public-docs.test.ts`

### Modified

- `.github/ISSUE_TEMPLATE/bug_report.yml`
- `.github/ISSUE_TEMPLATE/config.yml`
- `.github/ISSUE_TEMPLATE/feature_request.yml`
- `.github/PULL_REQUEST_TEMPLATE.md`
- `CHANGELOG.md`
- `CONTRIBUTING.md`
- `SECURITY.md`
- `docs/COVERAGE.md`
- `docs/OPENAPI.md`
- `docs/assets/README.md`
- `docs/assets/cursor-icon-verify.md`
- `docs/de/cloud.md`
- `docs/en/cloud.md`
- `docs/en/setup.md`
- `scripts/lib/openapi-coverage-render.mjs`
- `skills/coolify-deploy/SKILL.md`
- `skills/coolify-diagnose/SKILL.md`
- `skills/coolify-incident/SKILL.md`

### Deleted after promotion

- `CURSOR-SETUP-GUIDE.md.draft.md` — authorized untracked input; useful setup content promoted into both Cursor guides.

### Reviewed without change

- `skills/coolify-setup/SKILL.md` — already matched setup, recipe, env XOR/conflict, manifest, watch, and application-only log contracts.

## Verification Results

- Task 1 RED: new public-doc suite failed on missing Cursor guides and draft residue as expected.
- Task 1 gate: 2 files passed, 7 tests passed.
- Task 2 RED: generated coverage/provenance assertion failed before regeneration as expected.
- Task 2 gate: OpenAPI check passed; 2 files passed, 16 tests passed.
- Task 3 RED: skill-contract assertions failed on missing diagnose/log guidance as expected.
- Focused final gate: 5 files passed, 45 tests passed.
- Full package: 58 files passed, 1191 tests passed.
- Build: `tsup` succeeded; `dist/index.js` and source map generated.
- `pnpm run openapi:coverage -- --check`: passed.
- `git diff --check`: passed.
- Public scan: no personal `/Users/` paths, live credential placeholders, private host history, stale 16-tool/~87-action/private-repository claims, or service/database log promises.
- IDE lints: no errors in changed test/renderer files.
- `graphify update .`: completed, 803 nodes and 2197 edges.

## Protected-File Proof

`git diff --exit-code -- README.md README.de.md LICENSE .planning/ROADMAP.md` exited 0.
Range proof across all three task commits:

- `README.md` — unchanged
- `README.de.md` — unchanged
- `LICENSE` — unchanged
- `.planning/ROADMAP.md` — unchanged

No pinned OpenAPI artifact, workflow, `package.json`, or source behavior file changed.
`CHANGELOG.md` diff adds only orientation above `1.0.1`; every release heading and body remains in original order.

## Deviations from Plan

None affecting scope. Task-level tests were expanded incrementally so each TDD task had a meaningful RED state before its final gate.

## Known Stubs

None.

## Threat Flags

None. Changes reduce public credential-disclosure risk and document existing trust boundaries without adding endpoints, auth paths, file access, or schema changes.

## Manual Preview Remaining

Optional, non-blocking:

1. Open both Cursor guides side by side for final locale/editorial judgment.
2. Connect published and local MCP configurations in Cursor to visually confirm the documented letter-icon fallback and 18-tool/four-prompt inventory.

## Self-Check: PASSED

- All added files exist.
- Commits `ed88001`, `1dcea8d`, and `6b9fc7d` exist.
- Summary status is `complete`.
