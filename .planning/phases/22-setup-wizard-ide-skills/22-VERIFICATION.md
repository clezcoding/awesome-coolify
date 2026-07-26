---
phase: 22-setup-wizard-ide-skills
verified: 2026-07-26T02:28:00Z
status: human_needed
score: 11/12 must-haves verified
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "Open docs/en/setup.md in the HTML docs shell (or render setup guide page) with viewport ≤768px; scroll the ordered setup step list"
    expected: "9 setup steps in `.setup-steps` scroll vertically inside the container; no horizontal page break or overflow breaking the layout"
    why_human: "Backstop truth `8+ setup steps scroll inside .setup-steps without horizontal page break` — CSS classes exist but layout behavior requires visual confirmation"
behavior_unverified_items: []
---

# Phase 22: Setup Wizard & IDE Skills Verification Report

**Phase Goal:** A new user runs one setup flow that verifies `gh`, wires Coolify project/environment/server linkage, and ships consistent Coolify skill packs across Cursor, Claude Code, and Codex.

**Verified:** 2026-07-26T02:28:00Z  
**Status:** human_needed  
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | ------- | ---------- | -------------- |
| 1 | User receives gh install/login guidance without indefinite TTY block (SETUP-01, SC1) | ✓ VERIFIED | `checkGhAuth()` uses `execFile` with `GH_TIMEOUT_MS=5000`, `GH_FORCE_TTY:'0'`; failures return `COOLIFY_SETUP_PAUSED` with pause banner; tests in `gh-preflight.test.ts` + `setup.test.ts` |
| 2 | Setup wires project/environment/server linkage and updates `.coolify/manifest.json` (SETUP-02, SC2) | ✓ VERIFIED | `handleLinkExistingWire` validates UUIDs via API fetch + `writeLinkageManifest`; `handleGreenfieldWire` runs recipe + `ManifestManager.upsert`; tests write manifest to temp workspace |
| 3 | Non-interactive pause/resume path after human completes gh auth (SETUP-03, SC3) | ✓ VERIFIED | `throwSetupPaused` + `handleResume` re-runs preflight/wire; no `setInterval`/poll in `setup.ts`; test `resume re-runs preflight without in-tool sleep between calls` passes |
| 4 | Repo ships Coolify skill packs for Cursor, Claude Code, Codex (SKILL-01, SC4) | ✓ VERIFIED | Four skills at `skills/coolify-{setup,deploy,diagnose,incident}/SKILL.md`; canonical install command in each + README EN/DE + `docs/install.html#skills`; no per-IDE copies under `.cursor/skills` |
| 5 | Skills document recipes, deploy watch, prompts, safety rules (SKILL-02, SC5) | ✓ VERIFIED | All skills reference recipe actions + MCP prompt analogs; `coolify-deploy` documents `deployment.watch` primary over `wait:true`; diagnose/incident document `reveal` + `confirm`; `skills-manifest.test.ts` GREEN |
| 6 | `setup` MCP tool registered as 18th tool (D-01) | ✓ VERIFIED | `server.ts` has 18 `registerTool` calls; `setup` registered at line 757; `server.test.ts` expects `'setup'` in tool list; `docs/install.html` hero says 18 tools |
| 7 | Optional flags `include_domains`, `set_env`, `deploy_and_watch` default off (D-10) | ✓ VERIFIED | `flagEnabled()` returns true only when `value === true`; schema booleans optional; skills + docs state default off |
| 8 | `deploy_and_watch` bounded: deploy + watch timeout 300, recovery on timeout (D-11) | ✓ VERIFIED | `runOptionalGreenfieldSteps` calls `handleDeploymentAction({ action:'watch', timeout:300 })`; on `COOLIFY_WATCH_TIMEOUT` returns UUID + recovery banner; test passes |
| 9 | Greenfield never auto-pushes git; manual push suggestion only (D-12) | ✓ VERIFIED | `createGhRepo` omits `--push` unless `push:true`; greenfield test asserts `{ push: false }` default + manual push banner; no executed `git push` |
| 10 | `link-existing` does not call recipe create unless explicit resource params (D-08) | ✓ VERIFIED | `handleLinkExistingWire` never calls `handleRecipeAction`; test `upserts manifest without calling handleRecipeAction` passes |
| 11 | Docs: setup guide, install skills block, README EN/DE (D-17) | ✓ VERIFIED | `docs/en/setup.md`, `docs/shared.css` (`.notice--pause`, `.setup-steps`, `.skills-command`), `docs/index.html` links; README + README.de.md canonical `npx skills add` command |
| 12 | 8+ setup steps scroll inside `.setup-steps` without layout break (backstop) | ? UNCERTAIN | HTML/CSS present in `docs/en/setup.md` + `docs/shared.css`; 9 steps listed; visual scroll behavior not programmatically verified |

**Score:** 11/12 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | ----------- | ------ | ------- |
| `src/utils/gh-preflight.ts` | Headless gh preflight + repo create | ✓ VERIFIED | 105 lines; `execFile` fixed argv; `createGhRepoNoPush` export |
| `src/mcp/tools/setup.ts` | preflight/wire/resume orchestration | ✓ VERIFIED | 993 lines; wired to recipe/project/deployment/manifest handlers |
| `src/mcp/server.ts` | setup registration | ✓ VERIFIED | 18th `registerTool('setup', ...)` → `handleSetupAction` |
| `skills/coolify-setup/SKILL.md` | Setup workflow skill | ✓ VERIFIED | Documents pause/resume, modes, optional flags |
| `skills/coolify-deploy/SKILL.md` | Deploy + watch skill | ✓ VERIFIED | Primary `deployment.watch` path documented |
| `skills/coolify-diagnose/SKILL.md` | Diagnose skill | ✓ VERIFIED | reveal/confirm + recipes |
| `skills/coolify-incident/SKILL.md` | Incident skill | ✓ VERIFIED | confirm preview/approve pattern |
| `docs/en/setup.md` | Setup guide | ✓ VERIFIED | MCP-first; 9-step list; soft-pause section |
| `docs/install.html` | Skills install block | ✓ VERIFIED | `#skills` section with copy button + canonical command |
| `docs/shared.css` | Setup UI classes | ✓ VERIFIED | `.notice--pause`, `.setup-steps`, `.skills-command` defined |
| `README.md` / `README.de.md` | IDE skills install | ✓ VERIFIED | Section with `npx skills add ... -a cursor -a claude-code -a codex` |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | --- | --- | ------ | ------- |
| `server.ts` | `setup.ts` | `handleSetupAction(args, env)` | ✓ WIRED | Line 770 |
| `setup.ts` | `gh-preflight.ts` | `checkGhAuth()` / `createGhRepo()` | ✓ WIRED | `assertGhPreflight`, greenfield repo step |
| `setup.ts` | `recipe.ts` | `handleRecipeAction` | ✓ WIRED | `runGreenfieldRecipe` only in greenfield mode |
| `setup.ts` | `manifest.ts` | `ManifestManager.upsert/save` | ✓ WIRED | link-existing + greenfield paths |
| `setup.ts` | `deployment.ts` | `handleDeploymentAction watch` | ✓ WIRED | `deploy_and_watch` optional path, timeout 300 |
| `setup.ts` | `errors.ts` | `COOLIFY_SETUP_PAUSED` | ✓ WIRED | throw + wrap + RECOVERY_HINTS |
| Skills | `prompts.ts` | prompt analog names | ✓ WIRED | new-project/deploy/diagnose/incident referenced |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| -------- | ------------- | ------ | ------------------ | ------ |
| `setup.ts` wire link-existing | linkage UUIDs | `fetchProject/Environment/Server` API | Yes (validated against Coolify API) | ✓ FLOWING |
| `setup.ts` wire greenfield | manifest resource | `handleRecipeAction` → application_uuid | Yes (recipe handler returns UUID) | ✓ FLOWING |
| `setup.ts` preflight | setup_status/steps | `checkGhAuth()` result | Yes (dynamic based on gh state) | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Phase 22 test suite | `npx vitest run ... -t "setup\|checkGhAuth\|skills manifest\|COOLIFY_SETUP_PAUSED"` | 26 passed, 0 failed | ✓ PASS |
| Prohibition: no poll auth | `rg setInterval\|poll.*auth src/mcp/tools/setup.ts` | 0 matches | ✓ PASS |
| Prohibition: no per-IDE copies | `rg -l coolify-deploy .cursor/skills .claude/skills \| wc -l` | 0 | ✓ PASS |
| Prohibition: --push default off | `gh-preflight.test.ts` `omits --push from argv by default` | passes | ✓ PASS |

### Probe Execution

Step 7c: SKIPPED — no probe scripts declared for this phase.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ---------- | ----------- | ------ | -------- |
| SETUP-01 | 22-00, 22-01 | gh presence/auth verify headless-safe | ✓ SATISFIED | `gh-preflight.ts` + COOLIFY_SETUP_PAUSED |
| SETUP-02 | 22-02 | Wire linkage + manifest update | ✓ SATISFIED | link-existing + greenfield wire handlers + tests |
| SETUP-03 | 22-00, 22-01, 22-02 | Pause/resume after gh auth | ✓ SATISFIED | resume action + recovery hints + tests |
| SKILL-01 | 22-00, 22-01, 22-03 | Skill packs for Cursor/Claude Code/Codex | ✓ SATISFIED | 4 skills + install docs |
| SKILL-02 | 22-03 | Recipes, watch, prompts, safety | ✓ SATISFIED | Skill content + manifest tests |

No orphaned requirements — all five Phase 22 IDs claimed and evidenced.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| — | — | None | — | No TBD/FIXME/XXX in phase deliverables |

**Note:** `set_env: true` is a documented ponytail no-op until env sync params ship (`setup.ts:735`); acceptable because flag defaults off and phase goal does not require env sync.

### Prohibitions Verified

| Prohibition | Verification | Status |
| ----------- | ------------ | ------ |
| Never auto-push git (D-12) | rg + tests; only suggestion text + opt-in `--push` | ✓ ENFORCED |
| link-existing must not call recipe (D-08) | `setup.test.ts` mock call count 0 | ✓ ENFORCED |
| No in-tool poll for gh auth (D-06) | rg 0 matches | ✓ ENFORCED |
| No per-IDE skill copies (D-13) | 0 files under `.cursor/skills` | ✓ ENFORCED |
| Skills must not teach `wait:true` as primary | `coolify-deploy` legacy note only | ✓ ENFORCED |

### Human Verification Required

#### 1. Setup steps scroll layout (backstop)

**Test:** Render setup guide with `.setup-steps` in browser at mobile width; scroll through all 9 steps.  
**Expected:** Vertical scroll within container; no horizontal page overflow.  
**Why human:** Backstop CSS/layout truth — grep confirms classes exist but not rendered layout behavior.

### Gaps Summary

No blocking implementation gaps. All five roadmap success criteria and requirement IDs are satisfied in code with passing tests. One backstop layout check remains for human confirmation before treating the phase as fully closed.

**Intentional deferrals (not gaps):**
- CLI wrapper `src/cli/setup-wizard.ts` deferred per D-03 (MCP `setup` is sole entry)
- `set_env` sync is stub/no-op when enabled (ponytail; optional flag defaults off)

---

_Verified: 2026-07-26T02:28:00Z_  
_Verifier: Claude (gsd-verifier)_
