# Contributing

Contributions are welcome. Use this runbook to keep changes reviewable, safe, and
consistent with the published package.

## Prerequisites

- Git
- Node.js 24 or newer (`package.json` requires `>=24`)
- Corepack with pnpm `11.15.1`

## Local setup

```bash
git clone https://github.com/<your-account>/awesome-coolify.git
cd awesome-coolify
corepack enable
corepack prepare pnpm@11.15.1 --activate
pnpm install
pnpm run build
pnpm run lint
pnpm test
```

Create a focused branch:

```bash
git switch -c fix/short-description
```

Run one suite while iterating:

```bash
pnpm exec vitest run path/to/file.test.ts
```

`pnpm install` activates Husky, lint-staged, and commitlint hooks.

## Documentation changes

- Write commands that work from repository root and use placeholders for credentials.
- Keep English/German guide pairs semantically aligned.
- Update generated `docs/COVERAGE.md` only through
  `scripts/lib/openapi-coverage-render.mjs`, then run `pnpm run openapi:coverage`.
- Link readers to the next relevant guide and verify local links and anchors.
- Never paste tokens, private URLs, or sanitized-looking real logs into docs or issues.

## Live UAT harness

The live UAT harness is a **maintainer-local** CLI for proving all MCP tools against a real Coolify instance before release. It is tracked in git but **never published** in the npm tarball (`files` allowlist ships only `dist`, `.env.example`, and `LICENSE`).

### Entry point

```bash
npm run uat:live
```

This runs `node scripts/live-uat.mjs`. Optional flags:

| Flag | Effect |
| ---- | ------ |
| `--write` | Unlocks create/update/restart/deploy inside the UAT project |
| `--confirm-destructive` | Additionally unlocks deletes, emergency bulk ops, and manifest prune/clear |
| `--full` | Runs the entire action matrix (default is representatives plus the fixed v3 mandatory set) |
| `--out <path>` | Writes the JSON report to a file and emits a Markdown companion (`.md` alongside) |

**Manifest rows are workspace-local filesystem ops** (`.coolify/manifest.json` under the repo root).
They are intentionally **not** scoped by `UAT_PROJECT_UUID`. With `--write` / `--confirm-destructive`
they can mutate or clear that local cache only — never Coolify cloud resources.
Treat the checkout as the blast radius.

Without `--write`, the harness stays **read-only** for normal matrix rows: lists, gets, diff, and
meta-style calls execute; write and destructive matrix rows are recorded as status `planned`, not executed.

One smoke exception: `emergency-stop-all-preview-smoke` intentionally calls `emergency` /
`stop_all` without `confirm`. That performs a live `fetchResources` probe; the MCP handler
rejects with `COOLIFY_CONFIRM_REQUIRED` (preview semantics). The harness scores **only** that
error code as **pass**. If the call returns success (`ok: true`), the row fails with
`UAT_CONFIRM_GATE_REGRESSION` — a confirm-gate regression must never green-light an
instance-wide stop. This row is typed `read` in the matrix because it never mutates when
`confirm` is absent.

### Preconditions

1. **Dedicated UAT project** — create a throwaway Coolify project manually; the harness never auto-creates or auto-cleans resources.
2. **`UAT_PROJECT_UUID`** — set this env var to that project's UUID. The harness aborts with **exit 2** when the variable is missing, empty, or does not match a live project (`get` fails).
3. **Credentials** — resolved in order from `.cursor/mcp.json`, then `COOLIFY_URL` / `COOLIFY_TOKEN` in the process environment, then `~/.coolify-mcp/instances.json`. Tokens are redacted in every output surface; never commit or paste real tokens into docs or issues.
4. **Smoke fixtures (optional)** — several smoke rows look up named resources inside the UAT project. Set these env vars when you have seeded fixtures; rows are **skipped** (`missing-fixture`) when unset:

| Env var | Matrix row(s) |
| ------- | ------------- |
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
| --------- | ------- |
| `0` | No failures (`skip` and `planned` are OK) |
| `1` | At least one matrix row failed, **or** any `blocked-outside-uat` (scope miss counts as fail) |
| `2` | Setup abort (missing `UAT_PROJECT_UUID`, missing credentials, project mismatch, invalid flags) |

`npm run uat:live` is a **maintainer git-checkout** entry point. The published npm tarball does **not** include `scripts/` (see `package.json` `files`), so the script is unavailable after `npm install awesome-coolify-mcp` — clone the repo to run live UAT.

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

```text
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
- Routine GSD phase ships do **not** add Changesets by default — npm publish is milestone-scoped. For hotfixes or out-of-band releases, use `./scripts/gsd-ship-post.sh <pr> --with-changeset` or run `npx changeset` manually.
- CI (lint, test, build) must be green before merging.

### Auto-merge (Kodiak)

This repo uses [Kodiak](https://kodiakhq.com/) to update PR branches and squash-merge when CI passes.

1. Open a PR against `main` and wait for **Lint, Test & Build** to pass (or fix failures first).
2. Add the **`automerge`** label when the PR is ready to land.
3. Kodiak keeps the branch up to date with `main` and merges automatically once checks pass.

Config lives in `.kodiak.toml`. One-time app install + verification: `./scripts/setup-kodiak.sh`. Kodiak will **not** merge PRs with blocking labels such as `status: needs-review` or `gsd: plan`.

**PR stuck on Kodiak (`kodiakhq: skipping`, checks “Expected”)?** Common causes:

1. **`[ci skip]` / `[skip ci]` on the PR tip** — GitHub skips Actions; `Lint, Test & Build` and `MegaLinter` never report, so protected `main` blocks forever. Never put skip markers on commits that are PR HEAD. `./scripts/gsd-ship-post.sh` auto-pushes an empty trigger commit when it detects this. Manual fix: amend or empty commit **without** skip markers, then push.
2. **Blocking labels** — remove `status: needs-review`, `gsd: plan`, etc., or run `./scripts/gsd-ship-post.sh <pr>` (ship mode strips GSD blockers and sets `automerge`).
3. **Red CI** — fix lint/test/MegaLinter; Kodiak only merges when required checks pass.

### Milestone npm release

npm publish is intentional and milestone-scoped — not every phase merge triggers a release.

1. **During the milestone:** merge phase PRs without Changesets. Default `./scripts/gsd-ship-post.sh <pr>` applies labels + `automerge` only (no Version Packages churn).
2. **At milestone close:** on a release PR or dedicated chore branch, create fragment(s) via `npx changeset`, `./scripts/gsd-ship-post.sh <pr-number> --with-changeset`, or `scripts/gsd-ensure-changeset.sh`.
3. Merge that PR to `main` → the Changesets action opens **Version Packages**.
4. Merge **Version Packages** → `.github/workflows/release.yml` publishes to npm via OIDC (unchanged in this repo).
5. Prefer one accumulated release at milestone close over leaving Version Packages open for weeks.

#### Trusted Publisher pre-flight

Before merging **Version Packages** for a milestone npm release, confirm on [npmjs.com → awesome-coolify-mcp → Settings → Trusted Publishers](https://www.npmjs.com/package/awesome-coolify-mcp):

- **Workflow filename:** `release.yml` (not `publish.yml` — legacy release trigger only)
- **Repository:** `clezcoding/awesome-coolify`
- **OIDC:** publish uses GitHub Actions OIDC — no `NPM_TOKEN` or `NODE_AUTH_TOKEN` in repo secrets for npm
- **Docs:** [npm Trusted Publishers](https://docs.npmjs.com/trusted-publishers)

`release.yml` already sets `permissions.id-token: write`; the dashboard publisher must match that workflow filename.

## Issues

- Bug: use the bug report template.
- Feature idea: use the feature request template.
- Open questions/discussions: please use GitHub Discussions instead of an issue.

## Labels

Labels are managed centrally in `.github/labels.yml` and synced automatically — please don't create labels manually in the UI, edit the file and push instead.

PRs are auto-labeled on open, edit, sync, and ready-for-review via `.github/workflows/pr-labels.yml` (`scripts/gsd-pr-labels.sh --mode ci`). Labels cover type, GSD phase, diff size, scope (from changed paths). `needs-changeset` is advisory only (not a Kodiak blocker); ship/automerge PRs will not keep that label.

After `/gsd-ship` opens a phase PR, **`./scripts/gsd-ship-post.sh <pr>` runs automatically**
(GSD `ship.md` step + Cursor `afterShellExecution` hook + always-on rule). By default it:

1. Applies ship labels (`gsd: ship`, `type:*`, `size:*`, `scope:*`, `status: ready-to-merge`) and clears `needs-changeset`
2. Sets the **`automerge`** label for Kodiak — merge still waits for required checks
   (`Lint, Test & Build`, `MegaLinter`) and will not proceed while blocking labels are present

For hotfix / out-of-band releases that need an immediate changeset:

```bash
./scripts/gsd-ship-post.sh <n> --with-changeset
```

That opt-in path creates a Changeset under `.changeset/`, commits + pushes it, then applies ship labels.

Manual / preview: `./scripts/gsd-ship-post.sh <n> --dry-run` (alias: `./scripts/gsd-ship-labels.sh`).
Opt out of automerge: `./scripts/gsd-pr-labels.sh --pr <n> --mode ship --no-automerge`.
