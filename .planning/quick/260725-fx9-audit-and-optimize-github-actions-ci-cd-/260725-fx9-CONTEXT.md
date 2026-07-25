# Quick Task 260725-fx9: CI/CD audit + milestone-only npm - Context

**Gathered:** 2026-07-25
**Status:** Ready for planning

<domain>
## Task Boundary

Audit GitHub Actions workflows/bots; optimize which jobs run on every PR and CI speed; stop npm publish after every phase ship — publish only on milestone close.

</domain>

<decisions>
## Implementation Decisions

### PR / CI trigger policy
- Required checks stay: `Lint, Test & Build` + `MegaLinter` (branch protection).
- CodeQL + Dependency Review are NOT required — may use path filters / skip docs-and-planning-only PRs.
- Lightweight bots (semantic PR title, pr-labels) stay on every PR (cheap).
- Docs-site / `.planning/**`-only PRs should not pay full package CI when possible (path filters or paths-filter job gates). **Caution:** required checks must still report success — use a skip-success pattern or paths that keep jobs green.

### Speed
- Keep existing: concurrency cancel-in-progress, pnpm cache, MegaLinter `VALIDATE_ALL_CODEBASE` false on PR.
- Add: path filters / early skip for non-code PRs; concurrency on CodeQL; avoid redundant full installs where safe.
- Do not add heavy new tooling.

### Milestone-only npm release
- Phase `/gsd-ship` must NOT create a Changeset by default → no Version Packages churn → no npm after each phase.
- Ship labels/automerge must work without `needs-changeset` for phase ships.
- Changesets + Version Packages + `release.yml` npm publish remain the release path — triggered when milestone release intentionally adds changeset(s) / merges Version Packages.
- Provide `--with-changeset` escape hatch on `gsd-ship-post` for hotfix/out-of-band releases.
- Document milestone release step (script flag or CONTRIBUTING/GSD note).

### Claude's Discretion
- Prefer accumulate-at-milestone (create changeset when closing milestone) over leaving Version Packages open for weeks.
- Update `.cursor/rules/gsd-ship-labels.mdc` + ship-post comments to match.
- Keep `release.yml` / OIDC publish mechanics unchanged.

</decisions>

<specifics>
## Specific Ideas

- Prior quick `260721-70k` already parallelized MegaLinter; bottleneck was Docker pull — don't re-solve that unless easy win remains.
- `scripts/verify-github-setup.sh` expects CI contexts `Lint, Test & Build` + `MegaLinter`.

</specifics>

<canonical_refs>
## Canonical References

- GitHub Actions: paths / paths-ignore, concurrency cancel-in-progress — docs.github.com
- Changesets: accumulate fragments → `changeset version` → publish when ready — /changesets/changesets
- Local: `.github/workflows/ci.yml`, `release.yml`, `scripts/gsd-ship-post.sh`, `gsd-ensure-changeset.sh`, `gsd-pr-labels.sh`, `scripts/setup-branch-protection.sh`

</canonical_refs>
