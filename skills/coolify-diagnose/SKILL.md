---
name: coolify-diagnose
description: Investigate Coolify application, server, or fleet-wide issues. Use when triaging errors, health checks, or scan results.
---

# Coolify Diagnose

Install this skill pack (Cursor, Claude Code, Codex):

```bash
npx skills add clezcoding/awesome-coolify -a cursor -a claude-code -a codex
```

**MCP prompt analog:** `diagnose` (`src/mcp/prompts.ts`)

Related skills: [coolify-setup](../coolify-setup/SKILL.md) · [coolify-deploy](../coolify-deploy/SKILL.md) · [coolify-incident](../coolify-incident/SKILL.md)

## Diagnose tool

Primary entry: MCP `diagnose` tool (`diagnoseActionsCatalog`):

```
Actions: app(query?, uuid?, name?, domain?, limit?) · server(query?, uuid?, name?, ip?, trigger_validate?) · scan(format?, page?, per_page?)
```

## Workflow

1. **Resolve UUID** — from args, `.coolify/manifest.json`, or ask the user.

2. **Application path:**
   ```javascript
   diagnose({ action: "app", uuid: "<uuid>" })
   ```

3. **Server path:**
   ```javascript
   diagnose({ action: "server", uuid: "<server-uuid>" })
   ```

4. **Fleet scan path:**
   ```javascript
   diagnose({ action: "scan" })
   ```

5. **Summarize** findings by severity and recommend the next remediation step.

6. **If remediation requires redeploy** — use [coolify-deploy](../coolify-deploy/SKILL.md) watch-primary flow:
   ```javascript
   deployment({ action: "watch", deployment_uuid: "<deployment_uuid>", timeout: 300 })
   ```

## Recipe context

When diagnosis points to missing infrastructure, use `recipe` actions:

- `create-git-app` · `create-app-db` · `create-one-click`

Or run [coolify-setup](../coolify-setup/SKILL.md) for full greenfield wire.

## Safety

- **`reveal` opt-in** — pass `reveal: true` on read/get actions only when the human explicitly needs unmasked secrets or env values. Default responses mask sensitive fields.
- **`confirm` gates** — destructive mutations (delete, emergency redeploy, force overrides) require explicit human approval and `confirm: true` on the second call after preview.

## Example calls

```javascript
diagnose({ action: "app", uuid: "<uuid>" })

diagnose({ action: "server", uuid: "<server-uuid>", trigger_validate: true })

diagnose({ action: "scan", per_page: 20 })
```
