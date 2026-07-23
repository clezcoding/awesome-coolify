# Contributing

Thanks for your interest in this project! This repo follows the [GSD](https://github.com/open-gsd/gsd-core) workflow (Discuss → Plan → Execute → Verify → Ship). Development itself follows the rules below.

## Local Setup

```bash
pnpm install
pnpm run lint
pnpm test
```

Git hooks (commitlint) are activated automatically via `husky` on `pnpm install`.

## Commit Convention

All commits follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<optional scope>): <short description>

feat: a new feature
fix: a bug fix
docs: documentation only
chore: maintenance, tooling, dependencies
refactor: code restructuring without behavior change
test: tests
perf: performance
```

Checked locally via a git hook (`commitlint`) before the commit is even created.

## Branches

- `main` is protected (see `scripts/setup-branch-protection.sh`) — only mergeable via pull request once CI is green.
- Branch names: `feat/<short-description>`, `fix/<short-description>`, `chore/<short-description>`.

## Pull Requests

- Use the PR template (auto-filled).
- If the change is release-relevant (feature, fix, breaking change): run `npx changeset` and commit the generated file. This drives the version bump and changelog automatically.
- CI (lint, test, build) must be green before merging.

### Auto-merge (Kodiak)

This repo uses [Kodiak](https://kodiakhq.com/) to update PR branches and squash-merge when CI passes.

1. Open a PR against `main` and wait for **Lint, Test & Build** to pass (or fix failures first).
2. Add the **`automerge`** label when the PR is ready to land.
3. Kodiak keeps the branch up to date with `main` and merges automatically once checks pass.

Config lives in `.kodiak.toml`. One-time app install + verification: `./scripts/setup-kodiak.sh`. Kodiak will **not** merge PRs with blocking labels such as `status: needs-review` or `gsd: plan`.

## Issues

- Bug: use the bug report template.
- Feature idea: use the feature request template.
- Open questions/discussions: please use GitHub Discussions instead of an issue.

## Labels

Labels are managed centrally in `.github/labels.yml` and synced automatically — please don't create labels manually in the UI, edit the file and push instead.

PRs are auto-labeled on open, edit, sync, and ready-for-review via `.github/workflows/pr-labels.yml` (`scripts/gsd-pr-labels.sh --mode ci`). Labels cover type, GSD phase, diff size, scope (from changed paths), and release checks (`needs-changeset`).

After `/gsd-ship` opens a phase PR, run `./scripts/gsd-ship-labels.sh <pr>` (or pass no arg on the PR branch) to apply ship labels: `gsd: ship`, `status: needs-review`, and scoped type/size labels. Preview with `--dry-run`.

When a PR is ready for Kodiak, `./scripts/setup-kodiak.sh --pr <n>` applies ready-mode labels and `automerge`.

## Project Planning (GSD)

This project uses [GSD](https://github.com/open-gsd/gsd-core) for planning, and keeps planning artifacts (`.planning/`) local-only — they are gitignored and never committed to this repo. If you're contributing via GSD's phase workflow, that's expected: only the shipped code and docs end up in git history, not the planning process behind them.
