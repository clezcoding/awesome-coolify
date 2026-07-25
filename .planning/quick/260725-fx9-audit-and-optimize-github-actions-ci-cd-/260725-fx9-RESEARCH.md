# Quick Task 260725-fx9 — Research

**Date:** 2026-07-25  
**Sources:** Context7 (`/websites/github_en_actions`, `/changesets/changesets`, `/actions/cache`), wigolo (docs.github.com), local workflows/scripts

## Current inventory

| Workflow / bot | Trigger | Every PR? | Required? | Notes |
|----------------|---------|-----------|-----------|-------|
| `ci.yml` Lint/Test/Build | push+PR main | yes | **yes** | pnpm cache, concurrency cancel ✓ |
| `ci.yml` MegaLinter | same | yes | **yes** | PR = changed files only; Docker pull ~3m historically |
| `codeql.yml` | push+PR+weekly | yes | no | No path filter — runs on docs PRs |
| `dependency-review.yml` | PR | yes | no | Only useful when lockfile/deps change |
| `semantic-pull-request.yml` | PR title events | yes | no | Cheap; skips bots ✓ |
| `pr-labels.yml` | PR | yes | no | Cheap; concurrency ✓ |
| `release.yml` | push main | n/a | n/a | Changesets → Version Packages → npm |
| `publish.yml` | release published | n/a | n/a | Legacy OIDC; prefer release.yml |
| `pages.yml` | docs/** on main | n/a | n/a | Already path-filtered ✓ |
| `labels.yml` | labels.yml on main | n/a | n/a | Path-filtered ✓ |
| `stale.yml` | cron | no | n/a | Fine |
| `release-drafter.yml` | push main | n/a | n/a | Draft only |
| `publish-comfy.yml` | release | gated | n/a | Off unless var |

## Findings

### Must everything run every PR?
**No.** Required: only Lint/Test/Build + MegaLinter (`setup-branch-protection.sh`). CodeQL + Dependency Review are advisory — safe to path-filter.

### Speed (GitHub docs + cache action)
- `paths` / `paths-ignore`: skip workflows when only matching paths change; branch+path both must match.
- `concurrency` + `cancel-in-progress`: already on CI; add to CodeQL.
- `setup-node` `cache: pnpm` already present; caching `node_modules` directly discouraged.
- Caveat for required checks: if workflow is skipped entirely via `paths`, GitHub may leave required check **pending**. Prefer job-level skip that still reports success, or keep workflow always-on with early no-op job.

**Recommended pattern for required CI:**
```yaml
jobs:
  changes:
    outputs: { code: ... }
    steps: dorny/paths-filter
  lint-test-build:
    needs: changes
    if: needs.changes.outputs.code == 'true'
  # plus always-green skip job OR use paths-ignore only on non-required workflows
```
Safer quick win: path-filter **non-required** workflows only (CodeQL, dependency-review); leave required CI always-on (MegaLinter already diffs).

### Milestone-only npm (Changesets)
Lifecycle: add fragments → merge to main → action opens Version Packages → merge that PR → publish.

Per-phase npm root cause: `gsd-ship-post` → `gsd-ensure-changeset` on every phase ship → main merge → Version Packages → publish when merged.

Changesets intended model: **accumulate** fragments; version/publish when ready — not every PR.

**Recommended:**
1. Default ship: **no** auto-changeset (`--with-changeset` opt-in).
2. `gsd-pr-labels` ship mode: do not block automerge on `needs-changeset` (or stop applying needs-changeset for phase ships).
3. Milestone close: create changeset(s) + merge Version Packages (document / small helper).
4. Leave `release.yml` OIDC mechanics untouched.

## Pitfalls
- Skipping entire required workflow → stuck "Expected" checks → Kodiak waits forever.
- Removing changesets without updating label logic → phase PRs never get `automerge`.
- Hotfixes still need `--with-changeset`.

## Integration points
- `scripts/gsd-ship-post.sh`, `gsd-ensure-changeset.sh`, `gsd-pr-labels.sh`
- `.cursor/rules/gsd-ship-labels.mdc`
- `.github/workflows/{ci,codeql,dependency-review}.yml`
- Optional: CONTRIBUTING / verify-github-setup comments

## RESEARCH COMPLETE
`.planning/quick/260725-fx9-audit-and-optimize-github-actions-ci-cd-/260725-fx9-RESEARCH.md`
