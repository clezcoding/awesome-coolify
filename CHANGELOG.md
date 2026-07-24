# awesome-coolify-mcp

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
