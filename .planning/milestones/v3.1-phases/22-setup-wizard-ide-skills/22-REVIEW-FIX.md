---
phase: 22-setup-wizard-ide-skills
fixed_at: 2026-07-26T02:39:00Z
review_path: .planning/phases/22-setup-wizard-ide-skills/22-REVIEW.md
iteration: 1
findings_in_scope: 7
fixed: 7
skipped: 0
status: all_fixed
---

# Phase 22: Code Review Fix Report

**Fixed at:** 2026-07-26T02:39:00Z
**Source review:** `.planning/phases/22-setup-wizard-ide-skills/22-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 7
- Fixed: 7
- Skipped: 0

## Fixed Issues

### WR-01: `resume_params` omits wire fields needed for programmatic resume

**Files modified:** `src/mcp/tools/setup.ts`
**Commit:** 4ca0d51
**Applied fix:** Added `wireResumeParams()` helper that serializes all wire-relevant fields from parsed args (excluding `action`, `format`, `max_chars`) into `resume_params` on gh pause.

### WR-02: `createGhRepo` fallback URL is malformed when stdout parse fails

**Files modified:** `src/utils/gh-preflight.ts`, `src/utils/gh-preflight.test.ts`
**Commit:** 0344d45
**Applied fix:** When stdout lacks a repo URL, resolve owner via `gh api user -q .login` and build `https://github.com/{owner}/{repoName}` instead of duplicating repo name as owner.

### WR-03: `checkGhAuth` maps all subprocess failures to missing/unauthenticated

**Files modified:** `src/utils/gh-preflight.ts`, `src/utils/gh-preflight.test.ts`, `src/mcp/tools/setup.ts`
**Commit:** 658b770
**Applied fix:** Classify `ENOENT` as `gh_missing`, timeouts/kills as `gh_preflight_failed` (surfaced as `COOLIFY_VALIDATION_ERROR`), and include stderr on ambiguous auth failures.

### WR-04: Docs and skill examples omit required `environment_uuid` for link-existing

**Files modified:** `docs/en/setup.md`, `skills/coolify-setup/SKILL.md`
**Commit:** 2d63d18
**Applied fix:** Added `environment_uuid` to all link-existing wire examples in setup docs and coolify-setup skill.

### WR-05: Greenfield docs example missing required project linkage fields

**Files modified:** `docs/en/setup.md`
**Commit:** 370908f
**Applied fix:** Extended greenfield wire example with `project_name` and `initial_environment` so copy-paste matches `resolveGreenfieldLinkage` requirements.

### WR-06: `include_domains: true` marks step complete without attaching domains

**Files modified:** `src/mcp/tools/setup.ts`
**Commit:** f523783
**Applied fix:** Throw `COOLIFY_VALIDATION_ERROR` when `include_domains` is true but `domains` is empty; only push `domains` to `steps_completed` after manifest upsert succeeds.

### WR-07: Optional post-wire flags ignored on link-existing wire

**Files modified:** `src/mcp/tools/setup.ts`, `docs/en/setup.md`, `skills/coolify-setup/SKILL.md`
**Commit:** 28f1d3d, dce6098
**Applied fix:** Run `runOptionalWireSteps` after link-existing manifest write when `application_uuid` is present; reject optional flags without `application_uuid`; document greenfield/link-existing scope in docs and skill.

---

_Fixed: 2026-07-26T02:39:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
