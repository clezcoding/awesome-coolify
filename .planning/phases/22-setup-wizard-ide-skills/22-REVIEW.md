---
phase: 22-setup-wizard-ide-skills
reviewed: 2026-07-26T02:27:00Z
depth: standard
files_reviewed: 14
files_reviewed_list:
  - src/mcp/tools/setup.ts
  - src/utils/gh-preflight.ts
  - src/utils/errors.ts
  - src/mcp/server.ts
  - skills/coolify-setup/SKILL.md
  - skills/coolify-deploy/SKILL.md
  - skills/coolify-diagnose/SKILL.md
  - skills/coolify-incident/SKILL.md
  - docs/en/setup.md
  - docs/install.html
  - docs/index.html
  - docs/shared.css
  - README.md
  - README.de.md
findings:
  critical: 0
  warning: 7
  info: 2
  total: 9
status: issues_found
---

# Phase 22: Code Review Report

**Reviewed:** 2026-07-26T02:27:00Z
**Depth:** standard
**Files Reviewed:** 14
**Status:** issues_found

## Summary

Phase 22 ships a cohesive setup MCP tool (`preflight` / `wire` / `resume`), headless `gh` subprocess helpers, four IDE skill packs, and user-facing setup/install docs. Core orchestration patterns match existing tool handlers (flat zod schema, `wrapMcpError`, manifest upsert, recipe delegation). No command-injection or secret-handling defects found — `execFile` argv arrays and `REPO_NAME_REGEX` validation are sound.

Seven warnings remain: incomplete pause `resume_params`, brittle gh stdout URL fallback, misclassified gh subprocess failures, misleading optional-step progress, silent skips for link-existing optional flags and one-click deploy/watch, and copy-paste examples in docs/skills that omit required UUID fields and will hit `COOLIFY_VALIDATION_ERROR`.

## Warnings

### WR-01: `resume_params` omits wire fields needed for programmatic resume

**File:** `src/mcp/tools/setup.ts:386-400`
**Issue:** When wire pauses on gh auth, `throwSetupPaused` embeds a partial `resume_params` object. It omits `application_uuid`, `git_repository`, `git_branch`, `repo_path`, `build_pack`, `app_name`, `db_name`, `db_engine`, `env_key`, `type`, `instant_deploy`, `domains`, and `initial_environment`. Consumers that auto-resume from `error.data.resume_params` will re-enter wire with incomplete args and fail validation or provision wrong resources.
**Fix:** Serialize the full wire-relevant subset of `parsed` into `resume_params`, or build it from a shared helper:

```typescript
function wireResumeParams(parsed: WireLikeAction): Record<string, unknown> {
  const { action: _action, format, max_chars, ...rest } = parsed;
  return rest;
}
// throwSetupPaused(..., wireResumeParams(parsed));
```

### WR-02: `createGhRepo` fallback URL is malformed when stdout parse fails

**File:** `src/utils/gh-preflight.ts:92-96`
**Issue:** When `gh repo create` succeeds but stdout does not match the URL regex, fallback is `https://github.com/${repoName}/${repoName}` (owner slug duplicated). Downstream greenfield recipe may receive an invalid `git_repository`.
**Fix:** Parse owner from `gh api user -q .login`, or throw `COOLIFY_VALIDATION_ERROR` when URL cannot be extracted instead of returning a guessed URL.

### WR-03: `checkGhAuth` maps all subprocess failures to missing/unauthenticated

**File:** `src/utils/gh-preflight.ts:26-46`
**Issue:** Any `gh --version` failure becomes `gh_missing`; any `gh auth status` failure becomes `gh_unauthenticated`. Timeouts, permission errors, or transient gh bugs produce misleading pause banners and recovery hints.
**Fix:** Inspect `error.code` / `error.killed` from `execFile` rejections — return a distinct code (e.g. `COOLIFY_GH_PREFLIGHT_FAILED`) or include `stderr` in the message when reason is ambiguous.

### WR-04: Docs and skill examples omit required `environment_uuid` for link-existing

**File:** `docs/en/setup.md:89-96`, `skills/coolify-setup/SKILL.md:87-93`
**Issue:** Link-existing examples show `project_uuid`, `server_uuid`, and `application_uuid` but not `environment_uuid`. Code requires all three UUIDs (`validateLinkageUuids` at `setup.ts:409-415`). Copy-paste runs fail with `COOLIFY_VALIDATION_ERROR`.
**Fix:** Add `environment_uuid: "<environment-uuid>"` to every link-existing example in docs and skill packs.

### WR-05: Greenfield docs example missing required project linkage fields

**File:** `docs/en/setup.md:76-85`
**Issue:** Greenfield wire example provides only `server_uuid`, `recipe_type`, and git fields. `resolveGreenfieldLinkage` requires `project_uuid` or `project_name` plus resolvable `environment_uuid` (`setup.ts:534-547`). Example cannot succeed as written.
**Fix:** Extend example with `project_name` + `initial_environment`, or explicit `project_uuid` / `environment_uuid` pair matching a real Coolify project.

### WR-06: `include_domains: true` marks step complete without attaching domains

**File:** `src/mcp/tools/setup.ts:718-731`
**Issue:** When `include_domains` is true but `domains` is empty/omitted, code pushes `'domains'` to `steps_completed` without changing manifest or calling API. `steps_remaining` then drops `domains`, reporting false progress.
**Fix:** Only push `'domains'` when `domainList.length > 0`, or return validation error when flag is true without `domains`.

### WR-07: Optional post-wire flags ignored on link-existing wire

**File:** `src/mcp/tools/setup.ts:782-824`
**Issue:** `include_domains`, `set_env`, and `deploy_and_watch` are implemented only in `runOptionalGreenfieldSteps`. Link-existing wire never runs them, yet schema accepts the flags and `remainingSteps` may still list them as pending. Docs/skills describe flags without greenfield-only scope.
**Fix:** Either implement link-existing optional steps (manifest domain update + deploy/watch when `application_uuid` present) or reject/warn when optional flags are set on link-existing and document greenfield-only scope.

## Info

### IN-01: `createGhRepoNoPush` wrapper unused by setup orchestration

**File:** `src/utils/gh-preflight.ts:99-104`
**Issue:** `setup.ts` calls `createGhRepo(..., { push: parsed.push === true })` directly. Wrapper exists for tests/plan contract only — minor API surface duplication.
**Fix:** No action required unless consolidating exports; optionally use wrapper in setup for clarity.

### IN-02: `deploy_and_watch` silently skipped for one-click (`service`) resources

**File:** `src/mcp/tools/setup.ts:739`
**Issue:** Guard `resource.type === 'application'` skips deploy/watch for `create-one-click` services without error or `steps_remaining` adjustment when `deploy_and_watch: true`.
**Fix:** Document one-click limitation in skill/docs, or branch to service deploy path when type is `service`.

---

_Reviewed: 2026-07-26T02:27:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
