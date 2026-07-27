---
name: coolify-deploy
description: Deploy a Coolify application and monitor until terminal status. Use when triggering deployments or watching build progress.
---

# Coolify Deploy

Install this skill pack (Cursor, Claude Code, Codex):

```bash
npx skills add clezcoding/awesome-coolify -a cursor -a claude-code -a codex
```

**MCP prompt analog:** `deploy` (`src/mcp/prompts.ts`)

Related skills: [coolify-setup](../coolify-setup/SKILL.md) · [coolify-diagnose](../coolify-diagnose/SKILL.md) · [coolify-incident](../coolify-incident/SKILL.md)

## Deploy workflow

1. **Resolve UUID** — from args, `.coolify/manifest.json`, or ask the user.

2. **Trigger deployment** — capture `deployment_uuid` with `wait: false`:

   ```javascript
   application({ action: "deploy", uuid: "<uuid>", wait: false })
   ```

3. **Monitor with bounded watch** — primary path (not `wait: true`):

   ```javascript
   deployment({ action: "watch", deployment_uuid: "<deployment_uuid>", timeout: 300 })
   ```

4. **On `COOLIFY_WATCH_TIMEOUT`** — re-call `deployment.watch` with the same `deployment_uuid`. Raise `timeout` if builds are slow (max 1800s).

5. **On `failed` or `cancelled-by-user`** — surface the error and logs hint; do not treat as success.

> **Legacy:** `application.deploy wait:true` is back-compat only. Prefer `deployment.watch` for bounded polling with backoff.

## Recipe shortcuts

Greenfield provisioning uses the `recipe` tool (`recipeActionsCatalog`):

- `create-git-app(server_uuid, git_repository, git_branch, repo_path?, build_pack?)`
- `create-app-db(server_uuid, app_name, db_name, db_engine, env_key?)`
- `create-one-click(server_uuid, type, instant_deploy?)`

After recipe create, deploy with the workflow above.

## Safety

- **`confirm` gates** — confirm before force deploy or destructive lifecycle actions when the user did not explicitly request them.
- Use `reveal: true` only when the human opts in to sensitive log or env content.

## Example calls

```javascript
application({ action: "deploy", uuid: "<uuid>", wait: false })

deployment({ action: "watch", deployment_uuid: "<deployment_uuid>", timeout: 300 })

// After COOLIFY_WATCH_TIMEOUT:
deployment({ action: "watch", deployment_uuid: "<deployment_uuid>", timeout: 600 })
```
