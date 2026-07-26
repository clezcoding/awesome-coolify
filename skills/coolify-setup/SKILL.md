---
name: coolify-setup
description: Run MCP setup preflight and wire Coolify project/environment/server linkage. Use when onboarding a new workspace or linking an existing Coolify project.
---

# Coolify Setup

Install this skill pack (Cursor, Claude Code, Codex):

```bash
npx skills add clezcoding/awesome-coolify -a cursor -a claude-code -a codex
```

**MCP prompt analog:** `new-project` (`src/mcp/prompts.ts`) — primary entry is MCP `setup` tool per D-01.

Related skills: [coolify-deploy](../coolify-deploy/SKILL.md) · [coolify-diagnose](../coolify-diagnose/SKILL.md) · [coolify-incident](../coolify-incident/SKILL.md)

## MCP setup tool

Primary entry: MCP `setup` tool (`setupActionsCatalog`):

- `preflight()` — verify GitHub CLI presence and auth (headless-safe)
- `wire(mode, ...)` — provision or link Coolify resources
- `resume(mode?, ...)` — re-run preflight after human gh auth

**Safety:** optional `instance` routing · no auto-push git by default · gh soft-pause (no in-tool poll)

## Workflow

1. **Preflight** — call `setup({ action: "preflight" })`.
2. **On `COOLIFY_SETUP_PAUSED`** — stop for human action:
   - Install gh if missing: https://cli.github.com/
   - Run `gh auth login` (or set `GH_TOKEN` / `GITHUB_TOKEN` for headless)
   - Do **not** poll or sleep inside the agent loop waiting for auth.
3. **Resume** — after auth succeeds, call `setup({ action: "resume", ... })` with the **same wire params** you will use for step 4.
4. **Wire** — call `setup({ action: "wire", mode: "greenfield" | "link-existing", ... })`.

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
- `push` — on greenfield only; default `false` omits `gh --push`. Set `push: true` to push after repo create.

When `deploy_and_watch: true`, use `deployment({ action: "watch", deployment_uuid, timeout: 300 })` with bounded timeout (max 1800s). On `COOLIFY_WATCH_TIMEOUT`, re-call watch with the same `deployment_uuid`.

## Recipe types (greenfield)

Wire with `recipe_type` matching `recipeActionsCatalog`:

- `create-git-app` · `create-app-db` · `create-one-click`

## Git policy

Never auto-push git from setup unless `push: true` on greenfield wire. Default: instruct the human to push manually after repo create.

## Safety

- **`confirm`** — not required for setup wire/recipe create per established pattern; confirm gates apply on destructive ops in sibling skills.
- **`reveal`** — opt-in on env/log reads when syncing secrets after wire.

## Example calls

```javascript
setup({ action: "preflight" })

// After COOLIFY_SETUP_PAUSED + human gh auth login:
setup({ action: "resume", mode: "greenfield", server_uuid: "<uuid>", recipe_type: "create-git-app" })

setup({
  action: "wire",
  mode: "greenfield",
  server_uuid: "<uuid>",
  recipe_type: "create-git-app",
  push: false,
})

setup({
  action: "wire",
  mode: "link-existing",
  project_uuid: "<uuid>",
  server_uuid: "<uuid>",
  application_uuid: "<uuid>",
})
```
