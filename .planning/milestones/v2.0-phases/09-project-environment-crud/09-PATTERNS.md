# Phase 09: Project & Environment CRUD - Pattern Map

**Mapped:** 2026-07-17
**Files analyzed:** 7
**Analogs found:** 7 / 7

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/api/client.ts` | service | CRUD / request-response | `src/api/client.ts` | exact |
| `src/mcp/tools/project.ts` | controller / tool | CRUD / request-response | `src/mcp/tools/private_key.ts` | exact |
| `src/mcp/tools/environment.ts` | controller / tool | CRUD / request-response | `src/mcp/tools/private_key.ts` | exact |
| `src/mcp/tools/resource.ts` | controller / tool | request-response / list | `src/mcp/tools/resource.ts` | exact |
| `src/mcp/server.ts` | config / registration | request-response | `src/mcp/server.ts` | exact |
| `src/mcp/tools/project.test.ts` | test | request-response | `src/mcp/tools/private_key.test.ts` | exact |
| `src/mcp/tools/environment.test.ts` | test | request-response | `src/mcp/tools/private_key.test.ts` | exact |

## Pattern Assignments

### `src/api/client.ts` (service, CRUD / request-response)

**Analog:** `src/api/client.ts` (itself)

**POST Request Pattern** (lines 284-292):
```typescript
export async function createPrivateKey(
  url: string,
  token: string,
  payload: { name: string; private_key: string; description?: string },
  verifySsl = true,
): Promise<unknown> {
  const client = createCoolifyClient(url, token, verifySsl);
  return client('/security/keys', { method: 'POST', body: payload });
}
```

**PATCH Request Pattern** (lines 294-303):
```typescript
export async function updatePrivateKey(
  url: string,
  token: string,
  uuid: string,
  payload: { name?: string; description?: string; private_key?: string },
  verifySsl = true,
): Promise<unknown> {
  const client = createCoolifyClient(url, token, verifySsl);
  return client(`/security/keys/${uuid}`, { method: 'PATCH', body: payload });
}
```

**DELETE Request Pattern** (lines 305-313):
```typescript
export async function deletePrivateKey(
  url: string,
  token: string,
  uuid: string,
  verifySsl = true,
): Promise<unknown> {
  const client = createCoolifyClient(url, token, verifySsl);
  return client(`/security/keys/${uuid}`, { method: 'DELETE' });
}
```

---

### `src/mcp/tools/project.ts` (controller / tool, CRUD / request-response)

**Analog:** `src/mcp/tools/private_key.ts`

**Action-based Schema Pattern** (lines 112-127):
```typescript
const deletePreviewActionSchema = z
  .object({
    action: z.literal('delete_preview'),
    uuid: z.string().describe('Private key UUID'),
    ...mutationResponseParamsSchema,
  })
  .strict();

export const privateKeyActionSchema = z.discriminatedUnion('action', [
  listActionSchema,
  getActionSchema,
  createActionSchema,
  updateActionSchema,
  deleteActionSchema,
  deletePreviewActionSchema,
]);
```

**Confirm Gate Pattern** (lines 248-262):
```typescript
function validateDeleteConfirm(confirm: boolean, uuid: string): void {
  if (confirm === true) {
    return;
  }

  throw new CoolifyApiError({
    code: 'COOLIFY_CONFIRM_REQUIRED',
    message: `Action 'delete' on private key '${uuid}' requires explicit confirmation.`,
    recoveryHints: RECOVERY_HINTS.COOLIFY_CONFIRM_REQUIRED,
    data: {
      action: 'delete',
      uuid,
    },
  });
}
```

**COOLIFY_409 Error Pattern** (lines 417-428):
```typescript
        const dependents = await findDependentServers(env, parsed.uuid);
        if (dependents.length > 0) {
          throw new CoolifyApiError({
            code: 'COOLIFY_409',
            message:
              'Private key is still referenced by one or more servers and cannot be deleted.',
            recoveryHints: RECOVERY_HINTS.COOLIFY_409,
            data: {
              dependent_server_uuids: dependents.map((server) => server.uuid),
            },
          });
        }
```

---

### `src/mcp/tools/environment.ts` (controller / tool, CRUD / request-response)

**Analog:** `src/mcp/tools/private_key.ts`

**Action-based Schema Pattern** (lines 112-127):
```typescript
export const privateKeyActionSchema = z.discriminatedUnion('action', [
  listActionSchema,
  getActionSchema,
  createActionSchema,
  updateActionSchema,
  deleteActionSchema,
  deletePreviewActionSchema,
]);
```

**Confirm Gate Pattern** (lines 248-262):
```typescript
function validateDeleteConfirm(confirm: boolean, uuid: string): void {
  if (confirm === true) {
    return;
  }

  throw new CoolifyApiError({
    code: 'COOLIFY_CONFIRM_REQUIRED',
    message: `Action 'delete' on private key '${uuid}' requires explicit confirmation.`,
    recoveryHints: RECOVERY_HINTS.COOLIFY_CONFIRM_REQUIRED,
    data: {
      action: 'delete',
      uuid,
    },
  });
}
```

**COOLIFY_409 Error Pattern** (lines 417-428):
```typescript
        const dependents = await findDependentServers(env, parsed.uuid);
        if (dependents.length > 0) {
          throw new CoolifyApiError({
            code: 'COOLIFY_409',
            message:
              'Private key is still referenced by one or more servers and cannot be deleted.',
            recoveryHints: RECOVERY_HINTS.COOLIFY_409,
            data: {
              dependent_server_uuids: dependents.map((server) => server.uuid),
            },
          });
        }
```

---

### `src/mcp/tools/resource.ts` (controller / tool, request-response / list)

**Analog:** `src/mcp/tools/resource.ts` (itself)

**Resource Action Schema Pattern** (lines 10-25):
```typescript
export const resourceActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('list'),
    type: z.enum(['application', 'service', 'database', 'server']).optional(),
    ...sharedReadParamsSchema,
  }),
  z.object({
    action: z.literal('find'),
    query: z.string().optional(),
    uuid: z.string().optional(),
    name: z.string().optional(),
    domain: z.string().optional(),
    ip: z.string().optional(),
    ...sharedReadParamsSchema,
  }),
]);
```

**Resource Processing Pattern** (lines 208-235):
```typescript
        const rawResources = await fetchResources(
          env.COOLIFY_URL,
          env.COOLIFY_TOKEN,
          env.COOLIFY_VERIFY_SSL,
        );
        const lookup = await buildProjectEnvironmentIndex(env);
        const projected = rawResources
          .filter(isRecord)
          .map((raw) => projectResourceSummary(raw, lookup));

        const filtered = parsed.type
          ? projected.filter((resource) => resource.type === parsed.type)
          : projected;
```

---

### `src/mcp/server.ts` (config / registration, request-response)

**Analog:** `src/mcp/server.ts` (itself)

**Tool Registration Pattern** (lines 388-417):
```typescript
  server.registerTool(
    'private_key',
    {
      description:
        'Private key CRUD (list, get, create, update, delete, delete_preview) for SSH keys registered in Coolify. PEM material is never returned by any action — full projection masks the private_key field even with reveal:true (D-02). list accepts reveal on the schema but rejects reveal:true at the handler with COOLIFY_422 (D-11) — PEM material is never returned. delete requires confirm:true (D-14); deleting a key still referenced by servers returns COOLIFY_409 with dependent_server_uuids (D-15). delete_preview lists dependents without deleting.',
      inputSchema: privateKeyActionSchema,
      outputSchema: toolOutputSchema,
      annotations: { openWorldHint: true },
    },
    async (args) => {
      const result = await handlePrivateKeyAction(args, env);
      if (isPrivateKeyErrorResult(result)) {
        return {
          ...result,
          structuredContent: {
            ok: false,
            error: result.structuredContent.error,
          },
        };
      }
      return {
        content: [{ type: 'text', text: result._formattedText }],
        structuredContent: {
          ok: true,
          data: result.data,
          _meta: result._meta,
        },
      };
    },
  );
```

---

### `src/mcp/tools/project.test.ts` & `src/mcp/tools/environment.test.ts` (test, request-response)

**Analog:** `src/mcp/tools/private_key.test.ts`

**Mocking Pattern** (lines 10-21):
```typescript
vi.mock('../../api/client.js', () => ({
  fetchPrivateKeys: vi.fn(),
  fetchPrivateKey: vi.fn(),
  createPrivateKey: vi.fn(),
  updatePrivateKey: vi.fn(),
  deletePrivateKey: vi.fn(),
  fetchServers: vi.fn(),
}));

vi.mock('node:fs', () => ({
  readFileSync: vi.fn(),
}));
```

**Test Structure Pattern** (lines 51-72):
```typescript
describe('private_key list', () => {
  beforeEach(() => {
    vi.mocked(fetchPrivateKeys).mockReset();
    vi.mocked(fetchPrivateKeys).mockResolvedValue([mockKey]);
  });

  it('returns summary projection with uuid, name, fingerprint, description per D-04', async () => {
    const result = await handlePrivateKeyAction({ action: 'list' }, testEnv);

    expect(isPrivateKeyErrorResult(result)).toBe(false);
    if (isPrivateKeyErrorResult(result)) return;

    const data = result.data as Array<Record<string, unknown>>;
    expect(Array.isArray(data)).toBe(true);
    expect(data[0]).toMatchObject({
      uuid: 'key-uuid-7',
      name: 'deploy-key',
      fingerprint: 'SHA256:abc123',
      description: 'CI deploy key',
    });
    expect(data[0]).not.toHaveProperty('private_key');
  });
```

## Shared Patterns

### Authentication
**Source:** `src/api/client.ts`
**Apply to:** All project and environment CRUD actions
```typescript
export function createCoolifyClient(
  url: string,
  token: string,
  verifySsl = true,
) {
  return withMappedErrors(
    ofetch.create({
      baseURL: `${url.replace(/\/$/, '')}/api/v1`,
      ...createRetryOptions(token, verifySsl),
    }),
  );
}
```

### Error Handling
**Source:** `src/utils/errors.ts`
**Apply to:** All project and environment controller files
```typescript
export function wrapMcpError(error: unknown): McpErrorResult {
  const envelope =
    error instanceof CoolifyApiError
      ? error.envelope
      : mapApiError(error);

  return {
    isError: true,
    structuredContent: {
      ok: false,
      error: {
        code: envelope.code,
        message: envelope.message,
        hint: envelope.recoveryHints?.[0],
        recoveryHints: envelope.recoveryHints,
        httpStatus: envelope.httpStatus,
        data: envelope.data,
      },
    },
  };
}
```

### Validation & superRefine
**Source:** `src/mcp/tools/private_key.ts`
**Apply to:** All controller POST/PUT handlers and XOR constraints
```typescript
const createActionSchema = z
  .object({
    action: z.literal('create'),
    name: z.string().describe('Private key name'),
    description: z.string().optional().describe('Optional description'),
    private_key: z.string().optional().describe('Inline PEM material'),
    key_file: z.string().optional().describe('Local filesystem path to PEM file'),
    ...mutationResponseParamsSchema,
  })
  .strict()
  .superRefine((data, ctx) => {
    const hasInline = typeof data.private_key === 'string' && data.private_key.length > 0;
    const hasFile = typeof data.key_file === 'string' && data.key_file.length > 0;

    if (hasInline === hasFile) {
      ctx.addIssue({
        code: 'custom',
        message:
          'Exactly one of private_key (inline PEM) or key_file (local path) is required',
        params: { code: 'COOLIFY_422' },
      });
    }
  });
```

### Name-to-UUID Resolution
**Source:** `src/mcp/tools/emergency.ts`
**Apply to:** All project and environment actions accepting `project_uuid` XOR `project_name`
```typescript
export async function resolveProjectUuid(
  project_uuid: string | undefined,
  project_name: string | undefined,
  env: EnvConfig,
): Promise<string> {
  if (project_uuid) {
    return project_uuid;
  }

  const rawProjects = await fetchProjects(
    env.COOLIFY_URL,
    env.COOLIFY_TOKEN,
    env.COOLIFY_VERIFY_SSL,
  );

  const matched = rawProjects
    .filter(isRecord)
    .filter((project) => {
      const name = project.name;
      return (
        typeof name === 'string' &&
        name.toLowerCase().includes(project_name!.toLowerCase())
      );
    });

  if (matched.length === 0) {
    throw new CoolifyApiError({
      code: 'COOLIFY_404',
      message: `No project matched name substring '${project_name}'`,
      recoveryHints: [
        'Verify the project name exists on this Coolify instance.',
      ],
    });
  }

  if (matched.length > 1) {
    throw new CoolifyApiError({
      code: 'COOLIFY_AMBIGUOUS_MATCH',
      message: `Multiple projects matched name substring '${project_name}' — refusing to mutate.`,
      recoveryHints: [
        'Re-run the mutation with an explicit project_uuid.',
        ...matched.map(
          (project) => `- ${String(project.name)} (${String(project.uuid)})`,
        ),
      ],
    });
  }

  return String(matched[0].uuid);
}
```

## No Analog Found

All files to be created or modified have close analogs in the existing codebase.

## Metadata

**Analog search scope:** `src/mcp/tools/`, `src/api/`, `src/utils/`
**Files scanned:** 54
**Pattern extraction date:** 2026-07-17
