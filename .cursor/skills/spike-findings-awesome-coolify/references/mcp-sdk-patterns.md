# MCP SDK Patterns

## Requirements

- Action-based tool schema (not 60+ granular tools) — must be feasible with MCP TS SDK
- Multi-instance context switching must fit MCP SDK patterns
- Structured error codes with recovery hints (401/404/422/500)

## How to Build It

### Server bootstrap (stdio — v1 target)

```ts
import { McpServer } from '@modelcontextprotocol/server';
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import * as z from 'zod/v4';

const server = new McpServer({ name: 'coolify-mcp', version: '0.1.0' });
// register tools...
const transport = new StdioServerTransport();
await server.connect(transport);
```

### Action-based tool schema (~8 tools, not 60+)

One tool per Coolify domain: `application`, `server`, `deployment`, `database`, `service`, `project`, `instance`, `system`.

```ts
server.registerTool('application', {
  description: 'Manage Coolify applications',
  inputSchema: z.discriminatedUnion('action', [
    z.object({ action: z.literal('list'), instance: z.string().optional() }),
    z.object({ action: z.literal('get'), uuid: z.string(), instance: z.string().optional() }),
    z.object({ action: z.literal('deploy'), uuid: z.string(), force: z.boolean().optional(), wait: z.boolean().optional(), confirm: z.boolean().optional(), instance: z.string().optional() }),
    z.object({ action: z.literal('logs'), uuid: z.string(), lines: z.number().optional(), instance: z.string().optional() }),
    z.object({ action: z.literal('diagnose'), uuid: z.string().optional(), name: z.string().optional(), domain: z.string().optional(), instance: z.string().optional() }),
  ]),
  outputSchema: z.object({
    ok: z.boolean(),
    data: z.unknown().optional(),
    error: z.object({ code: z.string(), message: z.string(), hint: z.string().optional() }).optional(),
  }),
  annotations: { openWorldHint: true, destructiveHint: true },
}, async (args) => {
  const instance = await resolveInstance(args.instance);
  const client = new CoolifyClient(instance.url, instance.token);
  try {
    const result = await dispatchApplicationAction(client, args);
    return {
      content: [{ type: 'text', text: JSON.stringify(result) }],
      structuredContent: { ok: true, data: result },
    };
  } catch (err) {
    return {
      content: [{ type: 'text', text: formatError(err) }],
      isError: true,
      structuredContent: { ok: false, error: toStructuredError(err) },
    };
  }
});
```

### Multi-instance via config file (stdio has no per-request auth)

```ts
// ~/.coolify-mcp/instances.json
// { "default": "prod", "instances": { "prod": { "url": "...", "token": "..." } } }

async function resolveInstance(name?: string) {
  const cfg = loadConfig();
  const key = name ?? cfg.default;
  const inst = cfg.instances[key];
  if (!inst) throw new ProtocolError(ProtocolErrorCode.InvalidParams, `Unknown instance: ${key}`);
  return inst;
}
```

Dedicated `instance` tool: `add`, `list`, `get`, `update`, `delete`, `set-default`, `verify`.

### Two-layer error handling

```ts
// Layer 1: API failures — return isError: true
return { isError: true, structuredContent: { ok: false, error: { code: 'NOT_FOUND', message, hint } } };

// Layer 2: Malformed args — throw ProtocolError
throw new ProtocolError(ProtocolErrorCode.InvalidParams, `Unknown action: ${args.action}`);
```

### Destructive-op confirmation gate

```ts
if (isDestructive(args.action) && !args.confirm) {
  return {
    isError: true,
    structuredContent: { ok: false, error: { code: 'CONFIRMATION_REQUIRED', hint: 'Add confirm: true' } },
  };
}
```

### Sensitive value masking

```ts
function maskEnvVar(env) {
  return { ...env, value: env.is_shown_once ? env.value : '***' };
}
// Reveal opt-in: tool arg `reveal: true` (default false)
```

### Wait-mode deploy polling

Hand-rolled — no SDK primitive. Poll `GET /deployments/{uuid}` every 2s until terminal status. Cap `logs` with `max_chars`.

### package.json

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

## What to Avoid

- **Don't use env vars for single-instance** — PROJECT.md mandates multi-instance via config file
- **Don't use in-memory `use`/`switch` without persisting** — stateless across Cursor restarts
- **Don't vary tool annotations per action call** — annotations are static per tool; use `confirm: true` gate instead
- **Don't rely on `authInfo` for instance selection on stdio** — only flows through HTTP transport
- **Don't use v2.0.0-alpha.2 for v1 production** — build on v1.29.0, migrate later
- **Don't return free-text errors only** — always include `structuredContent.error: { code, message, hint }`
- **Don't skip `outputSchema` + `structuredContent`** — agents parse structured fields more reliably

## Constraints

- SDK version: `@modelcontextprotocol/sdk` v1.29.0 (latest stable at spike time)
- SDK imports use `zod/v4` subpath in latest docs — verify zod version compatibility on install
- v2 renaming: `McpError` → `SdkError`, `StreamableHTTPError` → `SdkHttpError`
- 2026-07-28 spec `requestState` codec not needed for v1 (all tools single-round)
- stdio transport = no per-request auth
- Tool annotations static per tool — can't set `destructiveHint: false` for list and `true` for deploy on same tool

## Origin

Synthesized from spikes: 002
Source files available in: sources/002-mcp-ts-sdk-best-practices/
