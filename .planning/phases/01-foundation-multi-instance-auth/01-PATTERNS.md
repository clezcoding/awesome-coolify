# Phase 1: Foundation & Multi-Instance Auth - Pattern Map

**Mapped:** 2026-07-12
**Files analyzed:** 14
**Analogs found:** 14 / 14

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/index.ts` | entry | bootstrap | `.cursor/skills/spike-findings-awesome-coolify/references/mcp-sdk-patterns.md` (lines 13-22) | exact |
| `src/mcp/server.ts` | service | bootstrap | `.cursor/skills/spike-findings-awesome-coolify/references/mcp-sdk-patterns.md` (lines 28-60) | exact |
| `src/mcp/tools/system.ts` | controller | request-response | `.planning/phases/01-foundation-multi-instance-auth/01-RESEARCH.md` (lines 182-196) | exact |
| `src/mcp/tools/meta.ts` | controller | request-response | `.planning/phases/01-foundation-multi-instance-auth/01-RESEARCH.md` (lines 55-56) | exact |
| `src/api/client.ts` | service | request-response | `.planning/phases/01-foundation-multi-instance-auth/01-RESEARCH.md` (lines 232-260) | exact |
| `src/config/env.ts` | config | transform | `.planning/phases/01-foundation-multi-instance-auth/01-RESEARCH.md` (lines 182-190) | role-match |
| `src/utils/errors.ts` | utility | transform | `.cursor/skills/spike-findings-awesome-coolify/references/coolify-api.md` (lines 80-90) & `01-CONTEXT.md` (lines 28-38) | exact |
| `src/utils/redact.ts` | utility | transform | `.planning/phases/01-foundation-multi-instance-auth/01-RESEARCH.md` (lines 257-260) | exact |
| `src/utils/logger.ts` | utility | logging | `.planning/phases/01-foundation-multi-instance-auth/01-CONTEXT.md` (lines 53-55) | role-match |
| `tsup.config.ts` | config | build | `.planning/phases/01-foundation-multi-instance-auth/01-RESEARCH.md` (lines 268-270) | role-match |
| `tsconfig.json` | config | transform | `.planning/research/ARCHITECTURE.md` (lines 66-68) | role-match |
| `package.json` | config | transform | `.cursor/skills/spike-findings-awesome-coolify/references/mcp-sdk-patterns.md` (lines 114-126) | role-match |
| `vitest.config.ts` | config | test | `.planning/phases/01-foundation-multi-instance-auth/01-RESEARCH.md` (lines 294-300) | role-match |
| `src/**/*.test.ts` | test | assert | `.planning/phases/01-foundation-multi-instance-auth/01-RESEARCH.md` (lines 302-310) | role-match |

---

## Pattern Assignments

### `src/index.ts` (entry, bootstrap)

**Analog:** `.cursor/skills/spike-findings-awesome-coolify/references/mcp-sdk-patterns.md`

**Server bootstrap pattern** (lines 11-22):
```typescript
import { McpServer } from '@modelcontextprotocol/server';
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import * as z from 'zod/v4';

const server = new McpServer({ name: 'coolify-mcp', version: '0.1.0' });
// register tools...
const transport = new StdioServerTransport();
await server.connect(transport);
```

---

### `src/mcp/server.ts` (service, bootstrap)

**Analog:** `.cursor/skills/spike-findings-awesome-coolify/references/mcp-sdk-patterns.md`

**McpServer setup & registration pattern** (lines 24-60):
```typescript
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

---

### `src/mcp/tools/system.ts` (controller, request-response)

**Analog:** `.planning/phases/01-foundation-multi-instance-auth/01-RESEARCH.md`

**Zod DiscriminatedUnion tool pattern** (lines 182-196):
```typescript
import { McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';

const server = new McpServer({ name: 'coolify-mcp', version: '1.0.0' });

server.registerTool(
  'system',
  {
    description: 'System actions for Coolify',
    inputSchema: z.discriminatedUnion('action', [
      z.object({ action: z.literal('health') }),
      z.object({ action: z.literal('version') }),
      z.object({ action: z.literal('verify') })
    ])
  },
  async (args) => {
    // Dispatch based on args.action
  }
);
```

---

### `src/mcp/tools/meta.ts` (controller, request-response)

**Analog:** `.planning/phases/01-foundation-multi-instance-auth/01-RESEARCH.md`

**Separate meta tool pattern** (lines 55-56):
Exposes `meta({ action: 'version' })` as a separate domain macro-tool to prevent system tool clutter. Exposes package version.

---

### `src/api/client.ts` (service, request-response)

**Analog:** `.planning/phases/01-foundation-multi-instance-auth/01-RESEARCH.md`

**Coolify Client with Retry and Redaction pattern** (lines 232-260):
```typescript
import { ofetch } from 'ofetch';

export function createCoolifyClient(url: string, token: string, verifySsl: boolean = true) {
  return ofetch.create({
    baseURL: `${url}/api/v1`,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json'
    },
    // Support ignoring self-signed certs for homelabs
    agent: verifySsl ? undefined : new (require('https').Agent)({ rejectUnauthorized: false }),
    retry: 3,
    retryDelay: 1000, // Exponential backoff is handled automatically by ofetch
    retryStatusCodes: [429, 500, 502, 503, 504],
    onRequestError({ error }) {
      // Redact sensitive info from errors
      error.message = redactSecrets(error.message);
    },
    onResponseError({ response }) {
      // Redact sensitive info from response errors
    }
  });
}
```

---

### `src/config/env.ts` (config, transform)

**Analog:** `.planning/phases/01-foundation-multi-instance-auth/01-RESEARCH.md` (lines 182-190) & `.planning/phases/01-foundation-multi-instance-auth/01-CONTEXT.md` (lines 19-20)

**Env validation & load pattern:**
Fails fast if `COOLIFY_URL` or `COOLIFY_TOKEN` is missing, using a Zod schema to parse and validate `process.env`.
```typescript
import { z } from 'zod';

const envSchema = z.object({
  COOLIFY_URL: z.string().url(),
  COOLIFY_TOKEN: z.string().min(1),
  COOLIFY_VERIFY_SSL: z.preprocess((val) => val !== 'false', z.boolean()).default(true),
  COOLIFY_MCP_LOG: z.enum(['debug', 'info', 'error']).default('info'),
});

export const env = envSchema.parse(process.env);
```

---

### `src/utils/errors.ts` (utility, transform)

**Analog:** `.cursor/skills/spike-findings-awesome-coolify/references/coolify-api.md` (lines 80-90) & `.planning/phases/01-foundation-multi-instance-auth/01-CONTEXT.md` (lines 28-38)

**Error envelope mapping pattern:**
Maps REST status codes to a structured JSON response and sets `isError: true` at the MCP protocol layer.
```typescript
export interface CoolifyErrorEnvelope {
  code: 'COOLIFY_401' | 'COOLIFY_404' | 'COOLIFY_422' | 'COOLIFY_500' | 'COOLIFY_NETWORK' | 'COOLIFY_TIMEOUT';
  message: string;
  recoveryHints: string[];
  httpStatus?: number;
}
```

---

### `src/utils/redact.ts` (utility, transform)

**Analog:** `.planning/phases/01-foundation-multi-instance-auth/01-RESEARCH.md`

**Secrets redaction pattern** (lines 257-260):
```typescript
export function redactSecrets(text: string): string {
  return text.replace(/(Bearer\s+)[a-zA-Z0-9\-_.]+/gi, '$1***')
             .replace(/(token|api_key|password|secret)=[a-zA-Z0-9\-_.]+/gi, '$1=***');
}
```

---

### `src/utils/logger.ts` (utility, logging)

**Analog:** `.planning/phases/01-foundation-multi-instance-auth/01-CONTEXT.md`

**Stderr logging pattern** (lines 53-55):
Stderr-only logging based on `COOLIFY_MCP_LOG` level to avoid interfering with stdout JSON-RPC stream.
```typescript
export const logger = {
  debug: (msg: string) => { if (env.COOLIFY_MCP_LOG === 'debug') console.error(`[DEBUG] ${msg}`); },
  info: (msg: string) => { if (['debug', 'info'].includes(env.COOLIFY_MCP_LOG)) console.error(`[INFO] ${msg}`); },
  error: (msg: string) => console.error(`[ERROR] ${msg}`),
};
```

---

### Build and Package Config Files

**Analogs:** `.planning/phases/01-foundation-multi-instance-auth/01-RESEARCH.md` & `.cursor/skills/spike-findings-awesome-coolify/references/mcp-sdk-patterns.md`

**`tsup.config.ts` pattern:**
Zero-config bundler compiling everything into a single minified `dist/index.js` file for ultra-fast stdio boot times.
```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  clean: true,
  minify: true,
  sourcemap: true,
});
```

**`package.json` pattern:**
Imports `@modelcontextprotocol/server` v2, `zod` and `ofetch`. Uses native `"type": "module"`.
```json
{
  "name": "coolify-mcp",
  "version": "0.1.0",
  "type": "module",
  "bin": {
    "coolify-mcp": "./dist/index.js"
  },
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "vitest run"
  },
  "dependencies": {
    "@modelcontextprotocol/server": "^2.0.0-beta.3",
    "ofetch": "^1.4.0",
    "zod": "^3.24.2"
  },
  "devDependencies": {
    "@types/node": "^20.11.0",
    "tsup": "^8.0.0",
    "typescript": "^5.3.3",
    "vitest": "^1.4.0"
  }
}
```

---

## Shared Patterns

### Error Handling
**Source:** `src/utils/errors.ts`
**Apply to:** All MCP tools and HTTP client wrappers
```typescript
export function wrapMcpError(err: unknown): { isError: true, content: [{ type: 'text', text: string }] } {
  const envelope = toStructuredError(err);
  return {
    isError: true,
    content: [{
      type: 'text',
      text: JSON.stringify(envelope, null, 2)
    }]
  };
}
```

### Sensitive Data Masking
**Source:** `src/utils/redact.ts`
**Apply to:** All stderr logging and tool response formatting
```typescript
logger.info(`Request path: ${redactSecrets(path)}`);
```

---

## No Analog Found

Files with no close match in the codebase (planner should use RESEARCH.md patterns instead):

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/config/env.ts` | config | transform | Truly novel environment load and fail-fast validation logic using Zod |
| `src/utils/logger.ts` | utility | logging | Truly novel stderr-only console logger matching the log level env var |

---

## Metadata

**Analog search scope:** `.cursor/skills/spike-findings-awesome-coolify/references/`, `.planning/research/`
**Files scanned:** 8
**Pattern extraction date:** 2026-07-12
