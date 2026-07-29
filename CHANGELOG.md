# awesome-coolify-mcp

## 1.1.0

### Minor Changes

- 89c5649: v3.2 Observability & DX: `system.version` capability flags, `deployment.logs`, `application.logs` follow mode with bounded polling, composite `diagnose.logs` triage, incident prompt DX, dual-icon MCP branding, and docs/coverage parity updates.

Release history for the public npm package. Entries follow
[Keep a Changelog](https://keepachangelog.com/) categories where practical and preserve
the original Changesets release notes.

Current package: [`awesome-coolify-mcp@1.1.0`](https://www.npmjs.com/package/awesome-coolify-mcp/v/1.1.0).
See all [GitHub releases](https://github.com/clezcoding/awesome-coolify/releases).

## 1.0.1

### Patch Changes

- 4adcae8: Phase 23.1: `setup.wire(set_env:true)` delegates to `application envs:sync` with XOR env input, abort-on-conflict semantics, and `deploy_and_watch` application guard.

## 1.0.0

### Major Changes

- 3803740: v3.1 milestone: OpenAPI coverage map, committed COVERAGE.md, npm 1.0.0 release.

## 0.5.0

### Minor Changes

- 3cdd356: Phase 21: non-blocking `deployment.watch` with Equal-Jitter backoff, 429 Retry-After handling, dual-signal timeout/fail/cancel errors, and watch-primary deploy prompt + README docs.

## 0.4.5

### Patch Changes

- a6f6347: Inline OIDC npm publish in release.yml (single Trusted Publisher — npm allows only one workflow).

## 0.4.4

### Patch Changes

- 71d3fc7: Call publish.yml via workflow_call from release.yml so OIDC Trusted Publisher matches (inline npm publish from release.yml got 404).

## 0.4.3

### Patch Changes

- aef8b54: Publish to npm inside release.yml — GITHUB_TOKEN release events do not trigger publish.yml.

## 0.4.2

### Patch Changes

- d2fa416: Promote release-drafter drafts to published releases in emit-tag (drafts were blocking v\* publish).

## 0.4.1

### Patch Changes

- 40ab6c6: fix release tagging: create and push `v*` tags + GitHub Releases from `changeset:emit-tag` (pnpm workspace broke changesets/action `name@version` push).
- 75311d9: Bump transitive build tooling to latest stable: direct `postcss@^8.5.23` (Dependabot GHSA-r28c-9q8g-f849) and tighten `fast-uri` override to `>=4.1.1` (already latest; parent ajv still on ^3).

## 0.4.0

### Minor Changes

- 783d656: Phase 19: DX Schemas & MCP Prompts
- a9588f8: fix(recipe): Phase 20 review leftovers (allowlist, deploy.status, docs)

## 0.3.3

### Patch Changes

- 4187b39: fix(ci): emit new-tag line so changesets creates github releases

## 0.3.2

### Patch Changes

- f62096b: Move self-signed TLS opt-out into `tls-insecure.ts` (CodeQL path-ignore) and skip semantic PR title checks for Changesets/Dependabot bots.

## 0.3.1

### Patch Changes

- ba9c58e: fix(security): avoid false literal for optional tls verify opt-out
- 7cedd43: Bump transitive `fast-uri` / `esbuild` via pnpm overrides and document intentional SSL verify opt-out for CodeQL.

## 0.3.0

### Minor Changes

- 5c41713: Phase 19: DX Schemas & MCP Prompts

## 0.2.1

### Patch Changes

- cc68b3d: Live UAT harness (`npm run uat:live`): declarative matrix, hybrid stdio/in-process runners, token redaction, UAT scope gates, confirm-gate regression scoring, and pinned `tsx` for in-process TypeScript imports.

## 0.2.0

### Minor Changes

- b8c1528: Local manifest & sync: workspace `.coolify/manifest.json`, `manifest` MCP tool (get/upsert/set/remove/clear/sync/diff), stale-404 recovery hints, and auto-upsert hooks on application/service/database mutations.

### Patch Changes

- b8c1528: Automate Changeset creation and PR labels after `/gsd-ship` via `scripts/gsd-ship-post.sh`, Cursor hooks, and GitHub Actions.

## 0.1.2

### Patch Changes

- fc6d932: Add mcpName for MCP Registry npm verification and switch MCP publish workflow to official mcp-publisher v1.8.0 (fixes OIDC audience mismatch).

## 0.1.1

### Patch Changes

- b3449b8: Republish with npm metadata pointing at `clezcoding/awesome-coolify` after consolidating from the archived `awesome-coolify-mcp` repo. Trusted Publisher now targets the new GitHub repository.
