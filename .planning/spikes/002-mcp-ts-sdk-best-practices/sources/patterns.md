# MCP TypeScript SDK — Patterns for v1

Source: `/modelcontextprotocol/typescript-sdk` (context7, score 90.67, 1487 snippets)
Pinned version: v1.29.0 (latest stable at spike time)

## Server bootstrap (stdio — v1 target)

```ts
import { McpServer } from '@modelcontextprotocol/server';
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import * as z from 'zod/v4';

const server = new McpServer({
  name: 'coolify-mcp',
  version: '0.1.0',
});

// register tools here

const transport = new StdioServerTransport();
await server.connect(transport);
```

For HTTP transport (v2 if needed):
```ts
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/server';
// Stateless (no session):
const tx = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
```

## Action-based tool schema (the v1 design)

Confirmed via SDK's own `calc` example using `z.enum` for op. For Coolify, use discriminated union per action:

```ts
server.registerTool(
  'application',
  {
    title: 'Coolify Application',
    description: 'Manage a Coolify application (list, get, deploy, restart, logs, diagnose)',
    inputSchema: z.discriminatedUnion('action', [
      z.object({ action: z.literal('list'), instance: z.string().optional() }),
      z.object({ action: z.literal('get'), uuid: z.string(), instance: z.string().optional() }),
      z.object({ action: z.literal('deploy'), uuid: z.string(), force: z.boolean().optional(), wait: z.boolean().optional(), instance: z.string().optional() }),
      z.object({ action: z.literal('restart'), uuid: z.string(), instance: z.string().optional() }),
      z.object({ action: z.literal('logs'), uuid: z.string(), lines: z.number().optional(), instance: z.string().optional() }),
      z.object({ action: z.literal('diagnose'), uuid: z.string().optional(), name: z.string().optional(), domain: z.string().optional(), instance: z.string().optional() }),
    ]),
    outputSchema: z.object({ ok: z.boolean(), data: z.unknown().optional(), error: z.object({ code: z.string(), message: z.string(), hint: z.string().optional() }).optional() }),
    annotations: { openWorldHint: true }, // overridden per-action in handler
  },
  async (args, ctx) => {
    const instance = await resolveInstance(args.instance);
    const client = new CoolifyClient(instance.url, instance.token);
    try {
      const result = await dispatchApplicationAction(client, args);
      return { content: [{ type: 'text', text: JSON.stringify(result) }], structuredContent: { ok: true, data: result } };
    } catch (err) {
      return { content: [{ type: 'text', text: formatError(err) }], isError: true, structuredContent: { ok: false, error: toStructuredError(err) } };
    }
  }
);
```

Discriminated union gives clients a single tool with clear action variants — matches PROJECT.md DX-01 ("action-based, no 60+ granular tools").

## Tool annotations per Coolify action

| Action | readOnlyHint | destructiveHint | idempotentHint | openWorldHint |
|--------|--------------|-----------------|----------------|---------------|
| list / get / logs / diagnose | true | false | true | true |
| deploy | false | false | false | true |
| restart | false | true | true | true |
| stop | false | true | true | true |
| start | false | false | true | true |
| cancel deployment | false | false | true | true |

Annotations are static on the tool — can't vary per action call. **Recommendation:** split destructive ops into their own tools (`application_destructive` with action: deploy/restart/stop/cancel) so annotations are accurate, OR set conservative defaults on `application` tool (destructiveHint: true) and let agent decide. **Decision for v1:** register one tool per *domain* with `readOnlyHint: false, destructiveHint: true` and rely on `confirm: true` arg gate inside handler for destructive actions.

## Error handling — two layers

### Layer 1: Tool-level error (preferred for API failures)
Return `isError: true` in result. Client sees error in tool output, can recover.

```ts
return {
  content: [{ type: 'text', text: `Coolify API error 404: application ${uuid} not found` }],
  isError: true,
  structuredContent: { ok: false, error: { code: 'NOT_FOUND', message: '...', hint: 'Run `application list` to find correct UUID' } },
};
```

### Layer 2: Protocol error (thrown — for malformed requests)
```ts
import { ProtocolError, ProtocolErrorCode } from '@modelcontextprotocol/server';
throw new ProtocolError(ProtocolErrorCode.InvalidParams, `Unknown action: ${args.action}`);
```

### v2 error classes (if using v2 SDK)
- `SdkError` + `SdkErrorCode`
- `SdkHttpError` (has `.status`, `.statusText`)
- `ProtocolError` + `ProtocolErrorCode`

## Structured error code mapping (Coolify API → MCP)

| Coolify HTTP | Structured code | Recovery hint |
|--------------|-----------------|---------------|
| 401 | `UNAUTHORIZED` | Token invalid or missing. Verify instance token in `~/.coolify-mcp/instances.json`. |
| 403 | `FORBIDDEN` | Token lacks required ability. Regenerate token with required abilities in Coolify UI. |
| 404 | `NOT_FOUND` | Resource UUID not found. Run `application list` / `server list` to find correct UUID. |
| 400 | `BAD_REQUEST` | State conflict (e.g. cancel finished deployment) or malformed args. See message. |
| 429 | `RATE_LIMITED` | Coolify rate limit hit. Retry after `Retry-After` header seconds. |
| 5xx | `COOLIFY_ERROR` | Coolify server error. Check `/health` and instance logs. |

## Multi-instance context (v1 design)

**Constraint:** stdio transport has no per-request auth → can't use `authInfo` for instance selection.

**Chosen pattern:** `instance` arg on every tool, optional, defaults to config default.

```ts
// Config: ~/.coolify-mcp/instances.json
// { "default": "prod", "instances": { "prod": { "url": "...", "token": "..." }, "staging": {...} } }

async function resolveInstance(name?: string): Promise<{ url: string; token: string }> {
  const cfg = loadConfig();
  const key = name ?? cfg.default;
  const inst = cfg.instances[key];
  if (!inst) throw new ProtocolError(ProtocolErrorCode.InvalidParams, `Unknown instance: ${key}`);
  return inst;
}
```

Dedicated `instance` tool with actions: `add`, `list`, `get`, `update`, `delete`, `set-default`, `use` (switch default in-memory), `verify` (hit `/health` + `/version`).

**Alternative considered (rejected):** in-memory `use`/`switch` that mutates default. Rejected because stateless across Cursor restarts and surprises users. Default switch persists to config file.

**Alternative considered (rejected):** env var `COOLIFY_URL` + `COOLIFY_TOKEN` single-instance. Rejected — PROJECT.md CTX-04/05 mandates multi-instance.

## Wait-mode polling (deploy)

No SDK built-in. Implement in handler:

```ts
async function deployWithWait(client, uuid, { force, wait, timeoutMs = 600_000 }) {
  const deploy = await client.post('/deploy', { uuid, force });
  const deploymentUuid = deploy.deployments[0].deployment_uuid;
  if (!wait) return { deployment_uuid: deploymentUuid, status: 'queued', wait: false };
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const d = await client.get(`/deployments/${deploymentUuid}`);
    if (['finished', 'failed', 'cancelled-by-user'].includes(d.status)) {
      return { deployment_uuid: deploymentUuid, status: d.status, logs: d.logs?.slice(0, MAX_CHARS) };
    }
    await sleep(2000);
  }
  return { deployment_uuid: deploymentUuid, status: 'timeout', wait: true };
}
```

## Sensitive value masking

SDK has no built-in. Implement in `CoolifyClient` response shaping:

```ts
function maskEnvVar(env) {
  return { ...env, value: env.is_shown_once ? env.value : '***' };
}
// Reveal opt-in: tool arg `reveal: true` (default false)
```

## Destructive-op confirmation gate

Implement as arg gate inside handler — `confirm: true` required for delete/stop-all/redeploy-project:

```ts
if (isDestructive(args.action) && !args.confirm) {
  return {
    content: [{ type: 'text', text: `Destructive action "${args.action}" requires confirm: true. Re-run with confirm: true to proceed.` }],
    isError: true,
    structuredContent: { ok: false, error: { code: 'CONFIRMATION_REQUIRED', message: '...', hint: 'Add confirm: true to args.' } },
  };
}
```

## package.json (v1)

```json
{
  "name": "coolify-mcp",
  "bin": { "coolify-mcp": "./dist/index.js" },
  "dependencies": {
    "@modelcontextprotocol/server": "^1.29.0",
    "zod": "^3.25.0"
  },
  "type": "module"
}
```

Note: SDK imports use `zod/v4` subpath in latest docs — verify on install.
