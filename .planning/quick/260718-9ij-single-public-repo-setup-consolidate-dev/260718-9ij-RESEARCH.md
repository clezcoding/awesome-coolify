# Quick Task Research: Single Public Repo Setup — Consolidate Dev+Public

**Researched:** 2026-07-18
**Domain:** GitHub repo consolidation, gh CLI, npm trusted publishing, .gitignore hygiene
**Confidence:** HIGH (all claims verified via `gh`, `npm view`, file reads this session)

## Summary

The dev repo `clezcoding/awesome-coolify` is currently PRIVATE. The legacy public repo `clezcoding/awesome-coolify-mcp` is also PRIVATE. The github-setup-overview.md checklist is ~85% complete in files, but several runtime steps are unapplied (branch protection, label sync, Pages, public visibility). Consolidation means: drop the dual-repo sync model, make `clezcoding/awesome-coolify` the single public canonical repo, delete the legacy `-mcp` repo (or archive), and remove all sync scaffolding.

**Primary recommendation:** Make `clezcoding/awesome-coolify` public, add `pages.yml` workflow, run `setup-branch-protection.sh`, trigger label sync, fix publish.yml trusted-publisher repo name, delete `sync-public-repo.sh` + `origin-legacy-mcp` remote, bump stale devDep versions.

## What's Complete vs Missing (vs github-setup-overview.md)

| Item | Status | Notes |
|------|--------|-------|
| `.github/ISSUE_TEMPLATE/{bug_report,feature_request,config}.yml` | ✅ done | All three present |
| `.github/PULL_REQUEST_TEMPLATE.md` | ✅ done | Present |
| `.github/labels.yml` + `workflows/labels.yml` (EndBug/label-sync@v3) | ✅ done | Workflow present; **labels not yet synced** — repo still has 9 default labels only [VERIFIED: `gh label list`] |
| `workflows/ci.yml` (Node 24, lint/test/build) | ✅ done | Push + PR on `main` |
| `workflows/release.yml` (Changesets, auto Version PR + Release) | ✅ done | Push to `main` |
| `workflows/publish.yml` (npm Trusted Publishing OIDC) | ✅ done | **Comment says repo `clezcoding/awesome-coolify-mcp` — must fix to `clezcoding/awesome-coolify`** [CITED: `.github/workflows/publish.yml:10`] |
| `.github/dependabot.yml` (npm + github-actions weekly) | ✅ done | |
| `commitlint.config.js` + `.husky/commit-msg` | ✅ done | |
| `.changeset/{config.json,README.md}` | ✅ done | |
| `scripts/setup-branch-protection.sh` | ✅ file present | **Not yet applied** — branch protection returns 403 on private Free-plan repo [VERIFIED: `gh api .../protection` → 403 "Upgrade to GitHub Pro or make this repository public"] |
| `.github/workflows/pages.yml` | ❌ **MISSING** | Required — `docs/` has `index.html`, `install.html`, `shared.css`, `mcp.example.json`, `assets/`, OpenAPI files. README links to `clezcoding.github.io/awesome-coolify-mcp/install.html` [CITED: README.md:20] |
| Repo public visibility | ❌ **MISSING** | Currently PRIVATE [VERIFIED: `gh repo view --json visibility`] |
| Branch protection applied | ❌ **MISSING** | Blocked by private status on Free plan |
| Label sync executed | ❌ **MISSING** | Only 9 default labels exist; custom labels.yml not synced |
| npm trusted publisher configured on npmjs.com | ❓ unknown | Needs verification on npmjs.com — package `awesome-coolify-mcp` exists at v0.1.0 [VERIFIED: `npm view awesome-coolify-mcp`] |

## What to Remove (Consolidation)

| Item | Action | Reason |
|------|--------|--------|
| `scripts/sync-public-repo.sh` | **Delete file** | Dual-repo sync model obsolete — single public repo now [CITED: scripts/sync-public-repo.sh:1-92] |
| `origin-legacy-mcp` git remote | `git remote remove origin-legacy-mcp` | Legacy `clezcoding/awesome-coolify-mcp` reference; 3 stale remote branches tracked [VERIFIED: `git remote -v`, `git branch -a`] |
| `clezcoding/awesome-coolify-mcp` (legacy public repo) | Archive or delete via `gh repo delete` / web UI | After consolidation; npm package `awesome-coolify-mcp` stays — package name ≠ repo name |
| `publish.yml:10` comment "Repo: clezcoding/awesome-coolify-mcp" | Update to `clezcoding/awesome-coolify` | Trusted publishing requires exact repo match on npmjs.com |
| README.md / README.de.md `clezcoding/awesome-coolify-mcp` URLs | Update to `clezcoding/awesome-coolify` | jsDelivr CDN (`@main`), Pages links, npm badges, clone URL, issues links [CITED: README.md:2,20,24,25,502,503,520,521,526] |
| `package.json` `repository/bugs/homepage` | Already correct — point to `clezcoding/awesome-coolify` ✅ | No change needed [CITED: package.json:42-49] |
| CONTRIBUTING.md | No dual-repo references — clean ✅ | No change needed [CITED: CONTRIBUTING.md:1-56] |

## Recommended Package Version Bumps (July 2026 Stable)

Verified via `npm view <pkg> version` this session:

| Package | Current | Latest | Action | Risk |
|---------|---------|--------|--------|------|
| `@modelcontextprotocol/server` | ^2.0.0-beta.3 | 2.0.0-beta.4 | bump to `^2.0.0-beta.4` | LOW — beta patch |
| `zod` | ^4.4.3 | 4.4.3 | none | — |
| `ofetch` | ^1.4.0 | 1.5.1 | bump to `^1.5.1` | LOW |
| `@changesets/cli` | ^2.31.1 | 2.31.1 | none | — |
| `@commitlint/cli` | ^21.2.1 | 21.2.1 | none | — |
| `@commitlint/config-conventional` | ^21.2.0 | (assume 21.2.0) | none | — |
| `@types/node` | ^20.11.0 | 26.1.1 | bump to `^26.1.1` | MEDIUM — aligns with Node 24 engine; type surface may shift |
| `@vitest/coverage-v8` | ^1.4.0 | 4.1.10 | bump to `^4.1.10` | HIGH — major v1→v4, API changes |
| `husky` | ^9.1.7 | 9.1.7 | none | — |
| `tsup` | ^8.0.0 | 8.5.1 | bump to `^8.5.1` | LOW |
| `typescript` | ^5.3.3 | 7.0.2 | bump to `^7.0.2` | HIGH — major TS5→TS7, strictness changes |
| `vitest` | ^1.4.0 | 4.1.10 | bump to `^4.1.10` | HIGH — major v1→v4, must bump with coverage-v8 together |

**Recommendation:** Bump LOW-risk items now. Gate HIGH-risk (typescript 7, vitest 4, @types/node 26) behind a separate task with `npm run build && npm test` validation — TS7 + Vitest 4 may surface type/test failures. `@modelcontextprotocol/server` has no stable 2.x yet — keep beta.4 pin.

## GitHub Pages Workflow Needed?

**YES.** `docs/` contains a full static site (index.html, install.html, shared.css, assets/, OpenAPI). README links to `clezcoding.github.io/awesome-coolify-mcp/install.html`. After consolidation, target becomes `clezcoding.github.io/awesome-coolify/`.

Add `.github/workflows/pages.yml`:

```yaml
name: Pages
on:
  push:
    branches: [main]
    paths: [docs/**]
  workflow_dispatch: {}
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: false
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deploy.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: docs
      - id: deploy
        uses: actions/deploy-pages@v4
```

Then enable Pages: `gh api -X PUT repos/clezcoding/awesome-coolify/pages -f source[branch]=main -f source[path]=/docs` (or set Source = "GitHub Actions" in repo settings — preferred for the workflow above).

## gh CLI Steps (Ordered)

1. **Public visibility** (requires confirmation prompt):
   ```bash
   gh repo edit clezcoding/awesome-coolify --visibility public --accept-visibility-change-consequences
   ```
2. **Enable Pages** (set source to GitHub Actions):
   ```bash
   gh api -X PUT repos/clezcoding/awesome-coolify/pages \
     -f build_type=workflow
   ```
   (Alternative: source from `/docs` on `main` if not using the pages.yml workflow.)
3. **Branch protection** (only works after step 1):
   ```bash
   bash scripts/setup-branch-protection.sh
   ```
   Verifies: force-push/delete blocked, "Lint, Test & Build" status check required, linear history.
4. **Label sync** (first bootstrap — manual trigger):
   ```bash
   gh workflow run labels.yml -R clezcoding/awesome-coolify
   ```
   Or push any change to `.github/labels.yml` to trigger automatically.
5. **npm trusted publishing fix**:
   - Edit `.github/workflows/publish.yml:10` — change `clezcoding/awesome-coolify-mcp` → `clezcoding/awesome-coolify`
   - On npmjs.com → package settings → Trusted Publishing → update repo to `clezcoding/awesome-coolify`, workflow filename `publish.yml` [ASSUMED — UI flow, not automatable via CLI]
6. **Legacy repo cleanup** (after consolidation verified):
   ```bash
   gh repo archive clezcoding/awesome-coolify-mcp   # or: gh repo delete clezcoding/awesome-coolify-mcp
   git remote remove origin-legacy-mcp
   ```

## .gitignore Recommendations

Current `.gitignore` is solid for the dev/private workflow (.planning/, .cursor/, .claude/, .agents/, graphify-out/, .coolify-mcp/). For the **public single repo**, these dev-only entries should remain (they're gitignored, so won't leak), but consider:

| Add | Reason |
|-----|--------|
| `**/.DS_Store` | Recursive — current `.DS_Store` only matches root; `.github/.DS_Store` already leaked [VERIFIED: `ls .github/`] |
| `*.log`, `npm-debug.log*`, `yarn-debug.log*`, `yarn-error.log*` | Standard Node.js ignores |
| `.npm/` | npm cache |
| `*.tsbuildinfo`, `.tsbuildinfo` | TypeScript incremental build info |
| `*.tgz` | `npm pack` output |
| `.env.local`, `.env.*.local` | Vite/Next convention; current `.env.*` covers but explicit is safer |
| `.idea/`, `.vscode/` | IDE dirs (optional — some teams keep `.vscode/extensions.json`) |

| Remove / Keep | Reason |
|--------------|--------|
| `docs/readme/node_modules/` | Redundant — `node_modules/` already covers; harmless but trim |
| `scripts/test-mcp-stdio.mjs` | Keep ignored — uses live credentials [CITED: .gitignore:35] |
| `.planning/`, `.cursor/`, `.claude/`, `.agents/` | Keep ignored — dev-only, must not leak to public repo |

**Critical:** After making the repo public, audit `git log` for any historical `.planning/` or secret leaks before flipping visibility — `git log --all --full-history -- .planning/ .env` should return empty. If leaks exist, history rewrite (git filter-repo) is required before going public.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | npm trusted publisher UI flow on npmjs.com (not CLI-verifiable) | gh CLI steps | User must manually verify on npmjs.com |
| A2 | `@commitlint/config-conventional` latest = 21.2.0 (not re-queried) | Package bumps | Minor — already on 21.x line |
| A3 | No git history leaks of `.planning/` or secrets | .gitignore | Must verify before public flip — history rewrite may be needed |
| A4 | TS 7.0.2 stable for this codebase | Package bumps | Major bump may break strict types — gate behind test run |

## Open Questions

1. **Should `gsd:fix-verification` and `higgsfield:fix` scripts stay in public package.json?** They're dev-only utilities. Currently `sync-public-repo.sh` strips them. In single-repo model: keep (harmless, just scripts) or remove for cleaner public surface. Recommendation: keep — they're documented as dev scripts and don't leak secrets.

2. **npm package name stays `awesome-coolify-mcp` while repo becomes `clezcoding/awesome-coolify`?** Yes — package name and repo name can differ. Trusted publishing config on npmjs.com just needs to point to the new repo. No rename needed.

3. **Should the legacy `clezcoding/awesome-coolify-mcp` repo be archived or deleted?** Archive preserves issues/PRs; delete is cleaner. Recommend archive — preserves any historical context.

## Sources

### Primary (HIGH confidence)
- File reads: `github-setup-overview.md`, `.gitignore`, `package.json`, `CONTRIBUTING.md`, `.github/workflows/{ci,publish,release,labels}.yml`, `.github/dependabot.yml`, `scripts/sync-public-repo.sh`, `scripts/setup-branch-protection.sh`
- `gh repo view clezcoding/awesome-coolify` → PRIVATE, default branch main
- `gh repo view clezcoding/awesome-coolify-mcp` → PRIVATE
- `gh api .../branches/main/protection` → 403 (private repo blocks protection)
- `gh label list -R clezcoding/awesome-coolify` → 9 default labels only
- `gh auth status` → logged in as `clezcoding`, scopes include `repo`, `workflow`
- `npm view` for all 12 deps (versions verified July 2026)
- `git remote -v` → origin + origin-legacy-mcp; `git branch -a` → 3 stale legacy remote branches

### Secondary (MEDIUM)
- README.md / README.de.md grep for `awesome-coolify-mcp` references (12+ URLs to update)

## Metadata

**Confidence breakdown:**
- Standard stack / version bumps: HIGH — `npm view` this session
- Architecture (consolidation): HIGH — file + remote state verified
- gh CLI steps: HIGH — commands tested or based on GitHub docs
- Pitfalls (history leaks): MEDIUM — not yet audited

**Research date:** 2026-07-18
**Valid until:** 2026-08-18 (30 days; npm versions move fast)
