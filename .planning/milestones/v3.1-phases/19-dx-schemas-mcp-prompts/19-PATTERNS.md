# Phase 19: DX Schemas & MCP Prompts - Pattern Map

**Mapped:** 2026-07-24
**Files analyzed:** 20
**Analogs found:** 19 / 20

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/mcp/prompts.ts` | provider | request-response | `src/mcp/server.ts` | role-match |
| `src/mcp/server.ts` | config | request-response | `src/mcp/server.ts` (self) | exact |
| `src/mcp/tools/shared-read-params.ts` | utility | transform | `src/mcp/tools/shared-read-params.ts` (self) | exact |
| `src/mcp/tools/system.ts` | route | request-response | `src/mcp/tools/system.ts` (self) | exact |
| `src/mcp/tools/application.ts` | route | CRUD | `src/mcp/tools/application.ts` (self) | exact |
| `src/mcp/tools/database.ts` | route | CRUD | `src/mcp/tools/database.ts` (self) | exact |
| `src/mcp/tools/service.ts` | route | CRUD | `src/mcp/tools/service.ts` (self) | exact |
| `src/mcp/tools/resource.ts` | route | request-response | `src/mcp/tools/resource.ts` (self) | exact |
| `src/mcp/tools/project.ts` | route | CRUD | `src/mcp/tools/project.ts` (self) | exact |
| `src/mcp/tools/environment.ts` | route | CRUD | `src/mcp/tools/environment.ts` (self) | exact |
| `src/mcp/tools/server.ts` | route | CRUD | `src/mcp/tools/server.ts` (self) | exact |
| `src/mcp/tools/private_key.ts` | route | CRUD | `src/mcp/tools/private_key.ts` (self) | exact |
| `src/mcp/tools/manifest.ts` | route | file-I/O | `src/mcp/tools/manifest.ts` (self) | exact |
| `src/mcp/tools/instance.ts` | route | file-I/O | `src/mcp/tools/instance.ts` (self) | exact |
| `src/mcp/tools/diagnose.ts` | route | request-response | `src/mcp/tools/diagnose.ts` (self) | exact |
| `src/mcp/tools/deployment.ts` | route | request-response | `src/mcp/tools/deployment.ts` (self) | exact |
| `src/mcp/tools/emergency.ts` | route | batch | `src/mcp/tools/emergency.ts` (self) | exact |
| `src/mcp/tools/meta.ts` | route | request-response | `src/mcp/tools/meta.ts` (self) | exact |
| `src/mcp/tools/docs.ts` | route | request-response | `src/mcp/tools/docs.ts` (self) | exact |
| `src/mcp/prompts.test.ts` | test | request-response | `src/mcp/server.test.ts` | role-match |

---

## Pattern Assignments

### `src/mcp/prompts.ts` (provider, request-response)

**Analog:** `src/mcp/server.ts` (for MCP registration patterns)

**Imports pattern**:
```typescript
import { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
```

**Core Prompt Registration pattern**:
```typescript
export function registerCoolifyPrompts(server: McpServer): void {
  server.registerPrompt(
    'deploy',
    {
      title: 'Deploy Application',
      description: 'Deploy an application on your Coolify instance and monitor its status.',
      argsSchema: z.object({
        instance: z.string().optional().describe('Coolify instance name (optional)'),
        uuid: z.string().optional().describe('Target application UUID (optional)'),
        force: z.string().optional().describe('Force deployment without cache (true/false)'),
      }),
    },
    async ({ instance, uuid, force }) => {
      const parsedForce = force === 'true';
      return {
        messages: [
          {
            role: 'user',
            content: `Please guide me through deploying the application ${uuid ? `with UUID ${uuid}` : ''} on ${instance ? `instance ${instance}` : 'the default instance'}.${parsedForce ? ' Please perform a force deploy.' : ''}`,
          },
          {
            role: 'assistant',
            content: `Deploy application workflow:
1. Locate your target application UUID${uuid ? '' : ' from .coolify/manifest.json or ask the user'}.
2. Run the deployment action:
   \`\`\`
   application.deploy(action: "deploy", uuid: "${uuid || '<uuid>'}", force: ${parsedForce}, wait: false${instance ? `, instance: "${instance}"` : ''})
   \`\`\`
3. Take the returned \`deployment_uuid\` and monitor the status using:
   \`\`\`
   deployment.watch(action: "get", deployment_uuid: "<deployment_uuid>"${instance ? `, instance: "${instance}"` : ''})
   \`\`\`
   Note: If deployment.watch does not exist yet (Phase 21), poll the deployment details via \`deployment.get\` until the status is terminal (finished/failed).`,
          },
        ],
      };
    }
  );
}
```

---

### `src/mcp/server.ts` (config, request-response)

**Analog:** `src/mcp/server.ts` (self)

**Prompt Registry Integration pattern**:
```typescript
import { registerCoolifyPrompts } from './prompts.js';

export async function createAndConnectServer(
  env: EnvConfig,
): Promise<McpServer> {
  const server = new McpServer({
    name: 'awesome-coolify-mcp',
    version: '0.1.0',
    title: 'Awesome Coolify',
    description: 'MCP server for Coolify 4.1.x — deploy, diagnose, and CRUD...',
    // ...
  });

  registerCoolifyTools(server, env);
  registerCoolifyPrompts(server); // Greenfield prompts registration hook

  const transport = new StdioServerTransport();
  await server.connect(transport);

  return server;
}
```

---

### `src/mcp/tools/shared-read-params.ts` (utility, transform)

**Analog:** `src/mcp/tools/shared-read-params.ts` (self)

**Simplified `withInstanceRoutingSchema` pattern**:
```typescript
/**
 * MCP `registerTool` inputSchema wrapper: extends every object option with
 * `optionalInstanceParam` so SDK `validateToolInput` retains `instance`
 * (does not strip/reject) and `tools/list` JSON Schema advertises the field.
 */
export function withInstanceRoutingSchema(schema: z.ZodType): z.ZodType {
  const ctor = schema.constructor.name;
  if (ctor === 'ZodObject') {
    return (schema as z.ZodObject).extend(optionalInstanceParam);
  }
  throw new Error(`withInstanceRoutingSchema: unsupported schema type ${ctor}`);
}
```

---

### `src/mcp/tools/system.ts` (route, request-response)

**Analog:** `src/mcp/tools/system.ts` (self)

**Flat Schema with `superRefine` pattern**:
```typescript
import * as z from 'zod/v4';
import { sharedReadParamsSchema } from './shared-read-params.js';

export const systemActionsCatalog = 
  'Actions: health() · version() · verify() · infrastructure_overview(format?, projection?, max_chars?)';

export const systemActionSchema = z
  .object({
    action: z.enum(['health', 'version', 'verify', 'infrastructure_overview']).describe('The system action to run'),
    format: sharedReadParamsSchema.format.optional(),
    projection: sharedReadParamsSchema.projection.optional(),
    include_full: sharedReadParamsSchema.include_full.optional(),
    page: sharedReadParamsSchema.page.optional(),
    per_page: sharedReadParamsSchema.per_page.optional(),
    max_chars: sharedReadParamsSchema.max_chars.optional(),
    reveal: sharedReadParamsSchema.reveal.optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    const allowedKeys = new Set<string>(['action']);
    
    if (data.action === 'infrastructure_overview') {
      allowedKeys.add('format');
      allowedKeys.add('projection');
      allowedKeys.add('include_full');
      allowedKeys.add('page');
      allowedKeys.add('per_page');
      allowedKeys.add('max_chars');
      allowedKeys.add('reveal');
    }

    const actualKeys = Object.keys(data);
    for (const key of actualKeys) {
      if (!allowedKeys.has(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Parameter '${key}' is not allowed for action '${data.action}'`,
          path: [key],
        });
      }
    }
  });
```

---

### `src/mcp/prompts.test.ts` (test, request-response)

**Analog:** `src/mcp/server.test.ts` (for MCP client/server testing pattern)

**Vitest Prompts Verification pattern**:
```typescript
import { describe, expect, it } from 'vitest';
import { McpServer } from '@modelcontextprotocol/server';
import { registerCoolifyPrompts } from '../../src/mcp/prompts.js';

describe('MCP prompts registration', () => {
  it('registers deploy, diagnose, new-project, and incident prompts', async () => {
    const server = new McpServer({ name: 'test-server', version: '1.0.0' });
    registerCoolifyPrompts(server);

    const prompts = await server.listPrompts();
    const promptNames = prompts.prompts.map(p => p.name);

    expect(promptNames).toContain('deploy');
    expect(promptNames).toContain('diagnose');
    expect(promptNames).toContain('new-project');
    expect(promptNames).toContain('incident');
  });

  it('deploy prompt returns correct step-by-step guidance', async () => {
    const server = new McpServer({ name: 'test-server', version: '1.0.0' });
    registerCoolifyPrompts(server);

    const result = await server.getPrompt('deploy', { uuid: 'app-123', force: 'true' });
    expect(result.messages).toHaveLength(2);
    expect(result.messages[1].content.text).toContain('application.deploy');
    expect(result.messages[1].content.text).toContain('deployment.watch');
  });
});
```

---

## Shared Patterns

### 1. Flat Schema Helper (`createFlatActionSchema`)

To prevent massive boilerplate across all 16 domain tools, we define a reusable schema builder in `src/mcp/tools/shared-read-params.ts`. This builder creates a flat `z.object` and automatically enforces allowed and required parameters per action via `superRefine`.

```typescript
import { z } from 'zod';
import { CoolifyApiError } from '../../utils/errors.js';

export function createFlatActionSchema<
  TAction extends string,
  TShape extends z.ZodRawShape,
>(
  actions: [TAction, ...TAction[]],
  shape: TShape,
  actionAllowedFields: Record<TAction, (keyof TShape)[]>,
  actionRequiredFields?: Partial<Record<TAction, (keyof TShape)[]>>,
) {
  return z
    .object({
      action: z.enum(actions).describe('The action to run'),
      ...shape,
    })
    .strict()
    .superRefine((data, ctx) => {
      const action = data.action;
      const allowed = new Set<string>(['action', ...(actionAllowedFields[action] as string[] || [])]);
      const required = actionRequiredFields?.[action] || [];

      // Enforce action-specific required fields
      for (const reqField of required) {
        if (data[reqField as string] === undefined) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Action '${action}' requires field '${reqField as string}'`,
            path: [reqField as string],
          });
        }
      }

      // Enforce strict parameter exclusivity (no extra params)
      for (const key of Object.keys(data)) {
        if (!allowed.has(key)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Parameter '${key}' is not allowed for action '${action}'`,
            path: [key],
          });
        }
      }
    });
}
```

### 2. Actions Catalog & Safety Footer Formatting

Every domain tool description must follow the exact scannable UI layout contract. It contains a one-sentence purpose, a hand-maintained compact action catalog, and a trailing safety footer.

```typescript
// Located co-located in src/mcp/tools/<domain>.ts
export const applicationActionsCatalog =
  'Actions: get(uuid, format?, projection?, reveal?) · start(uuid) · stop(uuid) · restart(uuid) · deploy(uuid, force?) · logs(uuid, lines?) · envs:list(uuid) · envs:get(uuid, key) · envs:create(uuid, key, value) · envs:update(uuid, key, value) · envs:delete(uuid, key, confirm) · envs:bulk-update(uuid, envs, confirm) · envs:sync(uuid, env_file?, env_content?, dry_run?, confirm?, conflict_policy?)';

export const applicationSafetyFooter =
  'Safety: confirm for destructive ops · optional instance · reveal opt-in only';

// Registered in src/mcp/server.ts
server.registerTool(
  'application',
  {
    description: `Application lifecycle, deploy, log, and environment-variable actions.\n${applicationActionsCatalog}\n${applicationSafetyFooter}`,
    inputSchema: withInstanceRoutingSchema(applicationActionSchema),
    outputSchema: toolOutputSchema,
  },
  async (args) => { ... }
);
```

### 3. Strict Validation Error Handling

When validation fails at the MCP layer, the server must throw a `COOLIFY_VALIDATION_ERROR` with actionable `recoveryHints` detailing the selected action and its parameter expectations.

```typescript
// In src/mcp/tools/shared-read-params.ts
export function parseWithInstanceRouting<T extends Record<string, unknown>>(
  schema: z.ZodType<T>,
  args: unknown,
): T & { instance?: string } {
  const result = safeParseWithInstanceRouting(schema, args);
  if (!result.success) {
    // Extract selected action to build highly specific recovery hints
    const selectedAction = (args as any)?.action ?? 'unknown';
    throw new CoolifyApiError({
      code: 'COOLIFY_VALIDATION_ERROR',
      message: result.error.issues.map((i) => i.message).join('; '),
      recoveryHints: [
        `Action '${selectedAction}' validation failed.`,
        `Verify required parameters and ensure no disallowed parameters are supplied.`,
        `Refer to the tool description's Actions catalog for valid parameter combinations.`,
      ],
    });
  }
  return result.data;
}
```

---

## No Analog Found

All files modified or created in Phase 19 have existing analogs in the codebase.

---

## Metadata

**Analog search scope:** `src/mcp/`, `src/mcp/tools/`, `src/utils/`  
**Files scanned:** 39  
**Pattern extraction date:** 2026-07-24  
