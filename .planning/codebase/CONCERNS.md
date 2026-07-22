# Codebase Concerns

**Analysis Date:** 2026-07-18

## GitHub Repo Setup Audit (vs gsd-core/next)

Reference model: [open-gsd/gsd-core `next`](https://github.com/open-gsd/gsd-core/tree/next).  
Repo under audit: private dev checkout at `/Users/puzzless/Desktop/awesome-coolify` (public face: `clezcoding/awesome-coolify-mcp` via `scripts/sync-public-repo.sh`).

### Summary Scorecard

| Area | Verdict | Notes |
|------|---------|-------|
| `.github/` workflows | **GAP** | Core CI/release/publish present; missing gsd policy workflows |
| `.github/` labels | **PASS** | `labels.yml` + `labels.yml` sync workflow |
| `.github/` issue templates | **GAP** | Bug + feature OK; fewer templates than gsd |
| `.github/` dependabot | **PASS** | npm + github-actions, weekly |
| `.gitignore` completeness | **GAP** | Good intent; one tracked violation + uncommitted fix |
| Tracked files vs gitignore | **FAIL** | `.claude/.cursor/rules/gsd-project.md` still tracked |
| `.githooks` vs `.husky` | **GAP** | Husky used; gsd uses `.githooks` + `core.hooksPath` |
| `.changeset` | **GAP** | Scaffold OK; `access: restricted` wrong for public npm |
| Root docs | **GAP** | README/LICENSE/CONTRIBUTING OK; **SECURITY.md missing** |
| Repo management scripts | **GAP** | Dual-repo sync good; no secret/lint guard scripts |

---

## `.github/` — Workflows, Labels, Templates, Dependabot

### Workflows — **GAP**

**Present (good baseline):**
- `/.github/workflows/ci.yml` — lint (if-present), test, build on push/PR to `main`
- `/.github/workflows/release.yml` — Changesets action, version PR, GitHub releases
- `/.github/workflows/publish.yml` — npm Trusted Publishing on release
- `/.github/workflows/labels.yml` — EndBug/label-sync from `labels.yml`

**Missing vs gsd-core/next (28 workflows there):**
- PR policy: `pr-title-validator.yml`, `pr-target-validator.yml`, `pr-template-format.yml`, `require-issue-link.yml`
- Quality gates: `changeset-required.yml`, `docs-required.yml`, `security-scan.yml`, `test.yml` (dedicated)
- Automation: `auto-label-issues.yml`, `stale.yml`, `duplicate-check.yml`, `branch-naming.yml`
- Org hygiene: `CODEOWNERS`, `/.github/rulesets/`, `FUNDING.yml`

**Impact:** Solo dev repo can merge without changeset, with bad PR title, or without linked issue — acceptable early, risky at scale.

**Fix approach:** Add incrementally: `security-scan.yml` (secret scan), `pr-title-validator.yml` (conventional commits), `changeset-required.yml` for release-typed PRs.

### Labels — **PASS**

- `/.github/labels.yml` — type, priority, status, area labels (104 lines)
- `/.github/workflows/labels.yml` — sync on push + manual dispatch; `delete-other-labels: true`

gsd-core uses workflow-based auto-labeling instead of a declarative `labels.yml`; awesome-coolify's approach is valid and simpler.

### Issue templates — **GAP**

**Present:**
- `/.github/ISSUE_TEMPLATE/bug_report.yml`
- `/.github/ISSUE_TEMPLATE/feature_request.yml`
- `/.github/ISSUE_TEMPLATE/config.yml` — blank issues disabled; Discussions link

**Missing vs gsd-core:**
- `chore.yml`, `docs_issue.yml`, `enhancement.yml` (gsd separates enhancement vs feature with approval labels)

**Fix approach:** Add `enhancement.yml` if accepting scope-creep PRs; keep feature template strict.

### Dependabot — **PASS**

- `/.github/dependabot.yml` — npm + github-actions, weekly, labeled `dependencies` + `type: chore`

Minor delta from gsd: gsd pins schedule to Monday and uses `chore(deps):` prefix; functionally equivalent.

### PR template — **GAP**

- Single `/.github/PULL_REQUEST_TEMPLATE.md` (checklist references `npm run lint` — see CI gap below)
- gsd-core uses `/.github/PULL_REQUEST_TEMPLATE/{fix,feature,enhancement,registry-entry}.md`

---

## `.gitignore` Completeness vs Tracked Files

### `.gitignore` policy — **GAP** (uncommitted improvement pending)

Current committed `/.gitignore` ignores:
- `.cursor/`, `.agents/`, `.planning/`, `graphify-out/`, `.env`, `.env.*`, `scripts/test-mcp-stdio.mjs`

**Uncommitted local change** adds `.claude` — should be committed; `.claude/.cursor/rules/gsd-project.md` is currently tracked.

**Not gitignored but arguably dev-only:**
- `mcp_features.md` — explicitly excluded from public sync in `scripts/sync-public-repo.sh` line 19
- Dev scripts under `scripts/` (`mcp-spy.mjs`, `fix-higgsfield.sh`, `gsd-ensure-verification-fresh.mjs`) — intentional for private dev repo

**Missing gitignore entries vs gsd-core:**
- `!.env.example` exception (gsd pattern) — `.env.example` should be tracked but isn't (see below)
- `.vscode/`, `.idea/`, `Thumbs.db`, editor swap files
- `skills-lock.json` already listed ✓

### Tracked files that violate `.gitignore` — **FAIL**

| File | Rule violated | Status |
|------|---------------|--------|
| `.claude/.cursor/rules/gsd-project.md` | `.cursor/` (and pending `.claude`) | **Still in git index** — run `git rm --cached` |

**Previously tracked, fixed in `8e50a92`:**
- `.planning/**` (~100 files) — removed from index ✓
- `.cursor/rules/spike-findings-awesome-coolify.mdc` — removed ✓
- `.agents/skills/spike-findings-awesome-coolify/**` — removed ✓

**Tracked dev artifacts (policy choice, not gitignore violation):**
- `mcp_features.md` — dev planning doc; sync script omits from public repo
- `scripts/mcp-spy.mjs`, `scripts/fix-higgsfield.sh`, `scripts/gsd-ensure-verification-fresh.mjs`, `scripts/sync-public-repo.sh` — dev-only tooling

**Should be tracked but isn't:**
- `.env.example` — exists on disk, listed in `package.json` `"files"`, **not in git** — public/npm consumers may miss env template

**Untracked, decision needed:**
- `docs/coolify_openapi.json`, `docs/coolify_openapi.yaml` — large API dumps; track or gitignore
- `scripts/kill-mcp.mjs` — referenced by `package.json` `"kill-mcp"` script; should be tracked

---

## `.githooks` vs `.husky`

### Verdict — **GAP** (functional but diverges from gsd model)

| | awesome-coolify | gsd-core/next |
|--|-----------------|---------------|
| Mechanism | Husky 9 (`"prepare": "husky"`) | `.githooks/` + `git config core.hooksPath .githooks` |
| pre-commit | `npm test` (full suite) — **deleted in working tree** | Targeted drift/freshness checks only |
| commit-msg | commitlint via `npx commitlint --edit` ✓ | Same pattern in docs |

**Issues:**
1. **Working tree deletes `/.husky/pre-commit`** — HEAD still has `npm test`; every commit runs full vitest locally (slow, gsd avoids this)
2. Husky `_/` internals may churn in `node_modules` — gsd's `.githooks` is simpler and testable (see `tests/precommit-alias-drift-hook.test.cjs` in gsd-core)
3. No pre-push hook (gsd has enterprise-email guard)

**Fix approach:**
- Either restore lightweight pre-commit (lint/typecheck only) or migrate to `.githooks/` matching gsd
- Commit `.claude` gitignore + remove cached `.claude/.cursor/rules/gsd-project.md`
- Document hook setup in `CONTRIBUTING.md` (currently says husky auto-activates — accurate for commit-msg only if pre-commit stays deleted)

---

## `.changeset`

### Verdict — **GAP**

**Present:**
- `/.changeset/README.md`, `/.changeset/config.json`
- `package.json`: `"version": "changeset version"`, devDep `@changesets/cli`
- `/.github/workflows/release.yml` + `publish.yml` wired correctly

**Issues:**
- `/.changeset/config.json` has `"access": "restricted"` — **wrong** for public npm package (`publishConfig.access: public` in `package.json`)
- No `.changeset/*.md` files yet — expected pre-first-release
- gsd-core maintains hundreds of archived changesets; scale difference only

**Fix:** Set `"access": "public"` in `config.json`.

---

## Root Docs (README, CONTRIBUTING, SECURITY, LICENSE)

| Doc | Verdict | Path |
|-----|---------|------|
| README | **PASS** | `/README.md`, `/README.de.md` |
| LICENSE | **PASS** | `/LICENSE` (MIT) |
| CONTRIBUTING | **GAP** | `/CONTRIBUTING.md` — references `npm run lint` (missing script); mentions `github-setup-guide.md` (not in repo) |
| SECURITY | **FAIL** | **Missing** — gsd has `/SECURITY.md` with advisory URL + response SLA |
| CHANGELOG | **GAP** | Not present; will be generated by changesets on first release |

---

## Scripts for Repo Management

| Script | Purpose | Verdict |
|--------|---------|---------|
| `scripts/sync-public-repo.sh` | Build clean public-repo snapshot with fresh git history; copies prod paths only; strips dev npm scripts; runs build+test; prints force-push instructions | **PASS** — well-designed dual-repo boundary |
| `scripts/setup-branch-protection.sh` | `gh api` branch protection: CI check required, no force-push | **PASS** — references missing `github-setup-guide.md` |
| `scripts/gsd-ensure-verification-fresh.mjs` | GSD phase verification freshness | Dev-only, OK in private repo |
| `scripts/mcp-spy.mjs` | MCP debug spy | Dev-only |
| `scripts/fix-higgsfield.sh` | Higgsfield MCP fix helper | Dev-only |
| `scripts/run-mcp.mjs` | Local MCP launcher | Prod-relevant but excluded from public `package.json` scripts |
| `scripts/kill-mcp.mjs` | Kill MCP processes | **Untracked** — should track or drop from `package.json` |

**Missing vs gsd-core `scripts/`:**
- `secret-scan.sh`, `base64-scan.sh`, `prompt-injection-scan.sh`
- `lint-*` policy scripts, `workflow-policy.cjs`, `pr-target-policy.cjs`
- `sync-rulesets.sh`, `verify-npm-publish.cjs`

---

## Recent Commits Analysis

### `0989a7c` — `chore: add GitHub project setup`

Added GitHub infrastructure (+2582 lines):
- Changesets scaffold, Husky + commitlint, expanded `CONTRIBUTING.md`
- `.github/`: workflows (ci, release, publish, labels), dependabot, labels.yml, issue templates, PR template
- `scripts/setup-branch-protection.sh`
- `package.json`: husky, changesets, commitlint devDeps; `"prepare": "husky"`, `"version": "changeset version"`

Did **not** update `.gitignore` for `.claude`.

### `8e50a92` — `chore: untrack folders`

Removed from git index only (−15416 lines, files remain on disk):
- Entire `.planning/**` tree (milestones, phases 02–09, spikes sources, quick plans, STATE, ROADMAP, etc.)
- `.cursor/rules/spike-findings-awesome-coolify.mdc`
- `.agents/skills/spike-findings-awesome-coolify/**`

Did **not** untrack `.claude/.cursor/rules/gsd-project.md` — oversight.

---

## `scripts/sync-public-repo.sh` Purpose

Dual-repo architecture (private dev → public npm/GitHub Pages):

1. **Copies allowlist only** to temp dir: `src`, `tests`, `docs`, READMEs, LICENSE, CONTRIBUTING, packaging configs, `.gitignore`, `.env.example`
2. **Copies CI workflow**; preserves `pages.yml` / `publish.yml` from existing public repo if present
3. **Strips dev scripts** from public `package.json`: `start`, `mcp`, `higgsfield:fix`, `gsd:fix-verification`
4. **Verifies** `npm install && npm run build && npm test` on clean tree
5. **Creates fresh git history** (`git init`, single commit) — requires `git push --force origin main`

Everything **not** in `INCLUDE` stays private: `.planning`, `.cursor`, `.claude`, `.agents`, `graphify-out`, `mcp_features.md`, dev scripts.

---

## Tech Debt

**CI lint gap:**
- Issue: `/.github/workflows/ci.yml` and `CONTRIBUTING.md` reference `npm run lint`; `package.json` has no lint script or ESLint/Biome
- Files: `/.github/workflows/ci.yml`, `/CONTRIBUTING.md`, `/package.json`
- Impact: CI lint step is no-op (`--if-present`); contributors think lint exists
- Fix: Add ESLint or remove lint references

**Node version drift:**
- Issue: `package.json` `"engines": ">=22.14"`, CI uses Node 24, README badge says `>=20`
- Files: `/package.json`, `/.github/workflows/ci.yml`, `/README.md`
- Fix: Align badge and CI to engines field

**Branch protection on private repo:**
- Issue: `scripts/setup-branch-protection.sh` notes GitHub Free private repos return 403
- Impact: Protection may not be applied on private dev repo
- Fix: Run against public repo or upgrade plan; document in CONTRIBUTING

---

## Security Considerations

**Missing SECURITY.md:**
- Risk: No documented vulnerability reporting path
- Files: none (missing)
- Recommendation: Add `/SECURITY.md` pointing to GitHub Security Advisories for `clezcoding/awesome-coolify-mcp`

**No CI secret scanning:**
- Risk: Accidental credential commit in dev repo before public sync
- Files: no `security-scan.yml` equivalent
- Recommendation: Add gsd-style `scripts/secret-scan.sh` + workflow, or use GitHub secret scanning (if available)

**Tracked GSD project rule:**
- Risk: `.claude/.cursor/rules/gsd-project.md` may embed project context not intended for git history
- Files: `.claude/.cursor/rules/gsd-project.md`
- Fix: `git rm --cached` + commit `.claude` in `.gitignore`

---

## Test Coverage Gaps

**Pre-commit hook ran full test suite:**
- What's not tested pre-commit if hook removed: everything until CI
- Files: `/.husky/pre-commit` (deleted locally)
- Risk: Broken commits reach remote before CI
- Priority: Medium — CI still gates merge if branch protection works

**Public sync verification:**
- `scripts/sync-public-repo.sh` runs build+test before push — good manual gate
- No CI job validates sync script or public-repo parity automatically

---

## Recommendations for Clean Repo Setup

### Immediate (before next push)

1. `git rm --cached .claude/.cursor/rules/gsd-project.md`
2. Commit `.gitignore` addition of `.claude`
3. Fix `/.changeset/config.json`: `"access": "public"`
4. Track `.env.example` and `scripts/kill-mcp.mjs`
5. Decide on `docs/coolify_openapi.{json,yaml}` — track or add to `.gitignore`
6. Restore or replace `/.husky/pre-commit` with lightweight check (not full `npm test`)
7. Add `/SECURITY.md`

### Short-term

8. Add `npm run lint` (ESLint) or remove lint references from CI/CONTRIBUTING/PR template
9. Align Node version messaging (README badge, engines, CI)
10. Add `changeset-required` or manual discipline for release PRs
11. Write missing `github-setup-guide.md` or remove reference from `setup-branch-protection.sh`

### Optional (gsd parity)

12. Migrate Husky → `.githooks/` + documented `core.hooksPath`
13. Add `secret-scan.sh` + CI workflow
14. Add typed PR templates under `/.github/PULL_REQUEST_TEMPLATE/`
15. Add `CODEOWNERS` when collaborators join

---

*Concerns audit: 2026-07-18*
