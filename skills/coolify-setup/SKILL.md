---
name: coolify-setup
description: Run MCP setup preflight and wire Coolify project/environment/server linkage. Use when onboarding a new workspace or linking an existing Coolify project.
---

# Coolify Setup

Install this skill pack (Cursor, Claude Code, Codex):

```bash
npx skills add clezcoding/awesome-coolify -a cursor -a claude-code -a codex
```

## MCP setup tool

Primary entry: MCP `setup` tool (`setupActionsCatalog`):

- `preflight()` — verify GitHub CLI presence and auth (headless-safe)
- `wire(mode, ...)` — provision or link Coolify resources (implemented Plan 22-02)
- `resume(mode?, ...)` — re-run preflight after human gh auth

**Safety:** optional `instance` routing · never auto-push git · gh soft-pause (no in-tool poll)

## Workflow

1. **Preflight** — call `setup({ action: "preflight" })`.
2. **On `COOLIFY_SETUP_PAUSED`** — stop for human action:
   - Install gh if missing: https://cli.github.com/
   - Run `gh auth login` (or set `GH_TOKEN` / `GITHUB_TOKEN` for headless)
   - Do **not** poll or sleep inside the agent loop waiting for auth.
3. **Resume** — after auth succeeds, call `setup({ action: "resume", ... })` with the **same wire params** you will use for step 4.
4. **Wire** — call `setup({ action: "wire", mode: "greenfield" | "link-existing", ... })` when Plan 22-02 wire is available.

## Modes

| Mode | Use when |
|------|----------|
| `greenfield` | Create new Coolify project/environment and provision via recipe |
| `link-existing` | Attach workspace to an existing Coolify project/server |

## Optional flags (default off)

Pass explicitly only when needed:

- `include_domains` — attach domains after wire
- `set_env` — sync environment variables after wire
- `deploy_and_watch` — trigger deploy and bounded `deployment.watch` after wire

When `deploy_and_watch: true`, use `deployment({ action: "watch", deployment_uuid, timeout: 300 })` with bounded timeout (max 1800s). On `COOLIFY_WATCH_TIMEOUT`, re-call watch with the same `deployment_uuid`.

## Git policy

Never auto-push git from setup. If a remote repo is created, instruct the human to push manually.

## Example calls

```javascript
setup({ action: "preflight" })

// After COOLIFY_SETUP_PAUSED + human gh auth login:
setup({ action: "resume" })

setup({
  action: "wire",
  mode: "greenfield",
  server_uuid: "<uuid>",
  recipe_type: "create-git-app",
})
```
