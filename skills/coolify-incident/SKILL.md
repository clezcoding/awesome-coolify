---
name: coolify-incident
description: Triage and respond to Coolify incidents with diagnose, logs, restart, and emergency actions. Use when production is down or degraded.
---

# Coolify Incident

Install this skill pack (Cursor, Claude Code, Codex):

```bash
npx skills add clezcoding/awesome-coolify -a cursor -a claude-code -a codex
```

**MCP prompt analog:** `incident` (`src/mcp/prompts.ts`)

Related skills: [coolify-diagnose](../coolify-diagnose/SKILL.md) · [coolify-deploy](../coolify-deploy/SKILL.md) · [coolify-setup](../coolify-setup/SKILL.md)

## Incident response workflow

1. **Resolve application UUID** — from args, `.coolify/manifest.json`, or ask the user.

2. **Check capabilities:**

   ```javascript
   system({ action: "version" })
   ```

3. **Triage and tail application logs:**

   ```javascript
   diagnose({ action: "logs", mode: "full", uuid: "<uuid>" })
   ```

4. **Follow a live application symptom when supported:**

   ```javascript
   application({ action: "logs", uuid: "<uuid>", follow: true })
   ```

5. **On build or deploy suspicion, inspect deployment logs:**

   ```javascript
   deployment({ action: "logs", deployment_uuid: "<deployment-uuid>" })
   ```

   Coolify 4.1.x supports application runtime and deployment logs. Service/database
   logs are unavailable because their REST endpoints do not exist.

6. **Attempt least-destructive recovery — restart:**

   ```javascript
   application({ action: "restart", uuid: "<uuid>" })
   ```

7. **If restart is insufficient** — ask the human before destructive actions. Preview emergency redeploy:

   ```javascript
   emergency({ action: "redeploy_project", project_uuid: "<project-uuid>", confirm: false })
   ```

   Retry with `confirm: true` only after explicit human approval.

8. **Report** incident status, actions taken, and recommended follow-up.

## Deploy watch after recovery

When redeploying, use [coolify-deploy](../coolify-deploy/SKILL.md) watch-primary flow:

```javascript
application({ action: "deploy", uuid: "<uuid>", wait: false })
deployment({ action: "watch", deployment_uuid: "<deployment_uuid>", timeout: 300 })
```

On `COOLIFY_WATCH_TIMEOUT`, re-call `deployment.watch` with the same `deployment_uuid`.

## Recipe shortcuts

For net-new resources during incident recovery:

- `recipe({ action: "create-git-app", ... })`
- `recipe({ action: "create-app-db", ... })`
- `recipe({ action: "create-one-click", ... })`

## Safety

- **`confirm` gates** — all destructive emergency actions require preview with `confirm: false`, then human approval before `confirm: true`.
- **`reveal` opt-in** — use `reveal: true` on logs/env reads only when the human needs unmasked sensitive content.
- Never treat `failed` or `cancelled-by-user` deployment status as success.

## Example calls

```javascript
system({ action: "version" })

diagnose({ action: "logs", mode: "full", uuid: "<uuid>" })

application({ action: "logs", uuid: "<uuid>", follow: true })

deployment({ action: "logs", deployment_uuid: "<deployment-uuid>" })
```
