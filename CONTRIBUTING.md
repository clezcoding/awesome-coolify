# Contributing

Thanks for your interest in this project! This repo follows the [GSD](https://github.com/open-gsd/gsd-core) workflow (Discuss → Plan → Execute → Verify → Ship). Development itself follows the rules below.

## Local Setup

```bash
pnpm install
pnpm run lint
pnpm test
```

Git hooks (commitlint) are activated automatically via `husky` on `pnpm install`.

## Live UAT Harness

The live UAT harness is a **maintainer-local** CLI for proving all MCP tools against a real Coolify instance before release. It is tracked in git but **never published** in the npm tarball (`files` allowlist ships only `dist`, `.env.example`, and `LICENSE`).

### Entry point

```bash
npm run uat:live
```

This runs `node scripts/live-uat.mjs`. Optional flags:

| Flag | Effect |
|------|--------|
| `--write` | Unlocks create/update/restart/deploy inside the UAT project |
| `--confirm-destructive` | Additionally unlocks deletes, emergency bulk ops, and manifest prune/clear |
| `--full` | Runs the entire action matrix (default is representatives plus the fixed v3 mandatory set) |
| `--out <path>` | Writes the JSON report to a file and emits a Markdown companion (`.md` alongside or derived from the path) |

Without `--write`, the harness stays **read-only**: lists, gets, diff, and meta-style calls execute; write and destructive matrix rows are recorded as status `planned`, not executed.

### Preconditions

1. **Dedicated UAT project** — create a throwaway Coolify project manually; the harness never auto-creates or auto-cleans resources.
2. **`UAT_PROJECT_UUID`** — set this env var to that project's UUID. The harness aborts with **exit 2** when the variable is missing, empty, or does not match a live project (`get` fails).
3. **Credentials** — resolved in order from `.cursor/mcp.json`, then `COOLIFY_URL` / `COOLIFY_TOKEN` in the process environment, then `~/.coolify-mcp/instances.json`. Tokens are redacted in every output surface; never commit or paste real tokens into docs or issues.
4. **Smoke fixtures (optional)** — several smoke rows look up named resources inside the UAT project. Set these env vars when you have seeded fixtures; rows are **skipped** (`missing-fixture`) when unset:

| Env var | Matrix row(s) |
|---------|----------------|
| `UAT_SMOKE_APP_NAME` | `application-get-smoke`, full-suite application write/destructive rows |
| `UAT_SMOKE_APP_UUID` | `deployment-list-smoke` |
| `UAT_SMOKE_SERVICE_NAME` | `service-get-smoke` |
| `UAT_SMOKE_DATABASE_NAME` | `database-get-smoke` |
| `UAT_SMOKE_SERVER_NAME` | `server-get-smoke` |

Create matching resources manually in the UAT project (e.g. an application named `uat-smoke-app`) or point the vars at existing names/UUIDs. A fresh UAT project with only `UAT_PROJECT_UUID` set still runs the non-fixture smoke rows and can exit `0`.

Example (placeholders only):

```bash
export UAT_PROJECT_UUID="<your-uat-project-uuid>"
npm run uat:live -- --out /tmp/uat-report.json
```

### Reports and exit codes

- **JSON on stdout** is the canonical machine report (`rows`, `summary`, `v3_gaps`).
- With `--out`, the same JSON is written to disk plus a **Markdown companion** for human review.

| Exit code | Meaning |
|-----------|---------|
| `0` | No failures (`skip` and `planned` are OK) |
| `1` | At least one matrix row failed |
| `2` | Setup abort (missing `UAT_PROJECT_UUID`, missing credentials, project mismatch, invalid flags) |

### v3_gaps

When a v3 mandatory row cannot run because a live precondition is missing (no secondary registry instance, no cloud profile, no local manifest file), the row is **skipped** and listed under `v3_gaps` in the report. The suite can still exit `0` if all executed rows pass — gaps are informational, not automatic failures.

### Extending coverage

Matrix rows live in `scripts/live-uat.matrix.json`. Add or adjust rows there; avoid hardcoding new cases in `scripts/live-uat.mjs`.

### Maintainer stance

- **No CI job** for live UAT — credentials stay on your machine only.
- **No remote secrets** (GitHub Actions secrets, hosted runners, etc.).
- **Never in npm** — consumers of `awesome-coolify-mcp` do not receive the harness.

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

After `/gsd-ship` opens a phase PR, **`./scripts/gsd-ship-post.sh <pr>` runs automatically** (GSD `ship.md` step + Cursor `afterShellExecution` hook + always-on rule). It:
1. Creates a Changeset under `.changeset/` when the PR is release-relevant and none exists
2. Commits + pushes the changeset
3. Applies ship labels (`gsd: ship`, `type:*`, `size:*`, `scope:*`, `status: ready-to-merge`) and clears `needs-changeset` when a changeset is present
4. Sets the **`automerge`** label for Kodiak — merge still waits for required checks (`Lint, Test & Build`, `MegaLinter`) and will not proceed while blocking labels are present

Manual / preview: `./scripts/gsd-ship-post.sh <n> --dry-run` (alias: `./scripts/gsd-ship-labels.sh`).  
Opt out of automerge: `./scripts/gsd-pr-labels.sh --pr <n> --mode ship --no-automerge`.

## Project Planning (GSD)

This project uses [GSD](https://github.com/open-gsd/gsd-core) for planning, and keeps planning artifacts (`.planning/`) local-only — they are gitignored and never committed to this repo. If you're contributing via GSD's phase workflow, that's expected: only the shipped code and docs end up in git history, not the planning process behind them.
