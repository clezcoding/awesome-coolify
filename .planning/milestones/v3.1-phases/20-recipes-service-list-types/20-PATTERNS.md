# Phase 20: Recipes & Service List-Types - Pattern Map

**Mapped:** 2026-07-24
**Files analyzed:** 5
**Analogs found:** 5 / 5

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/mcp/tools/recipe.ts` (NEU) | controller | multi-step / batch | `src/mcp/tools/application.ts` & `src/mcp/tools/database.ts` | exact (role/flow) |
| `src/mcp/tools/recipe.test.ts` (NEU) | test | request-response | `src/mcp/tools/service.test.ts` | exact |
| `src/mcp/tools/service.ts` (MODIFIED) | controller | request-response | `src/mcp/tools/service.ts` (itself) | exact |
| `src/mcp/tools/service.test.ts` (MODIFIED) | test | request-response | `src/mcp/tools/service.test.ts` (itself) | exact |
| `src/mcp/server.ts` (MODIFIED) | config | request-response | `src/mcp/server.ts` (itself) | exact |

---

## Pattern Assignments

### `src/mcp/tools/recipe.ts` (controller, multi-step / batch)

**Analog:** `src/mcp/tools/application.ts` & `src/mcp/tools/database.ts`

**Imports Pattern** (from `src/mcp/tools/application.ts` lines 1-35):
```typescript
import * as z from 'zod/v4';
import type { EnvConfig } from '../config/env.js';
import {
  createPublicApplication,
  fetchApplication,
  triggerDeploy,
  bulkUpdateEnvs,
  fetchDatabase,
  triggerDatabaseStart,
  createPostgresqlDatabase,
} from '../../api/client.js';
import {
  createFlatActionSchema,
  mutationResponseParamsFlatShape,
  resolveRoutingEnv,
  safeParseWithInstanceRouting,
  sharedReadParamsFlatShape,
} from './shared-read-params.js';
import { CoolifyApiError, RECOVERY_HINTS, wrapMcpError } from '../../utils/errors.js';
import { buildReadResponse, type ReadResponse } from '../../utils/formatters.js';
```

**Flat Schema & Action Catalog Pattern** (from `src/mcp/tools/application.ts` lines 289-317 / lines 431-487):
```typescript
export const recipeActionsCatalog =
  'Actions: create-git-app(server_uuid, git_repository, git_branch, repo_path?, build_pack?, instant_deploy?) · create-app-db(server_uuid, app_name, db_name, db_engine, env_key?, instant_deploy?) · create-one-click(server_uuid, type, instant_deploy?)';

export const recipeSafetyFooter =
  'Safety: optional instance · reveal opt-in only';

export const recipeActionSchema = createFlatActionSchema(
  [
    'create-git-app',
    'create-app-db',
    'create-one-click',
  ],
  {
    server_uuid: z.string().optional().describe('Target server UUID'),
    project_uuid: z.string().optional().describe('Project UUID'),
    project_name: z.string().optional().describe('Project name for lookup'),
    environment_name: z.string().optional().describe('Environment name'),
    environment_uuid: z.string().optional().describe('Environment UUID'),
    app_name: z.string().optional().describe('Application name'),
    db_name: z.string().optional().describe('Database name'),
    db_engine: z.enum(['postgresql', 'mysql', 'mariadb', 'mongodb', 'redis', 'clickhouse', 'dragonfly', 'keydb']).optional().describe('Database engine'),
    env_key: z.string().optional().describe('Env key to wire (default DATABASE_URL)'),
    git_repository: z.string().optional().describe('Git repository URL'),
    git_branch: z.string().optional().describe('Git branch'),
    repo_path: z.string().optional().describe('Local filesystem path to repo'),
    build_pack: z.enum(['nixpacks', 'railpack', 'static', 'dockerfile']).optional().describe('Build pack override'),
    type: z.string().optional().describe('One-click service type'),
    instant_deploy: z.boolean().optional().describe('Start immediately (default true)'),
    reveal: z.boolean().optional().describe('Reveal masked values'),
    ...sharedReadParamsFlatShape,
    ...mutationResponseParamsFlatShape,
  },
  {
    'create-git-app': ['server_uuid', 'git_repository', 'git_branch', 'repo_path', 'build_pack', 'instant_deploy', 'project_uuid', 'project_name', 'environment_name', 'environment_uuid', 'format', 'max_chars'],
    'create-app-db': ['server_uuid', 'app_name', 'db_name', 'db_engine', 'env_key', 'instant_deploy', 'project_uuid', 'project_name', 'environment_name', 'environment_uuid', 'reveal', 'format', 'max_chars'],
    'create-one-click': ['server_uuid', 'type', 'instant_deploy', 'project_uuid', 'project_name', 'environment_name', 'environment_uuid', 'format', 'max_chars'],
  },
  {
    'create-git-app': ['server_uuid', 'git_repository', 'git_branch'],
    'create-app-db': ['server_uuid', 'app_name', 'db_name', 'db_engine'],
    'create-one-click': ['server_uuid', 'type'],
  }
);
```

**Build-Pack Detection Logic** (from CONTEXT Decisions D-09, D-10, D-11 and RESEARCH Pattern 2):
```typescript
import { statSync } from 'node:fs';
import path from 'node:path';

export function detectBuildPack(repoPath: string): 'dockerfile' | 'nixpacks' {
  try {
    const dockerfilePath = path.join(repoPath, 'Dockerfile');
    const stat = statSync(dockerfilePath);
    if (stat.isFile()) {
      return 'dockerfile';
    }
  } catch {
    // Falls kein Dockerfile vorhanden oder Fehler: nixpacks Standard-Fallback
  }
  return 'nixpacks';
}
```

**Partial Failure / Wiring Logic (Recipe create-app-db)** (from CONTEXT Decisions D-13, D-14, D-15 and RESEARCH Pitfall 2):
```typescript
// Auszug für die sequentielle Erstellung von Datenbank & Anwendung ohne automatischen Rollback bei Teilfehlern
async function handleCreateAppDb(parsed: CreateAppDbAction, env: EnvConfig) {
  // 1. DB erstellen (z.B. Postgresql)
  const dbPayload = { ... };
  const dbResult = await createPostgresqlDatabase(env.COOLIFY_URL, env.COOLIFY_TOKEN, dbPayload);
  const dbUuid = dbResult.uuid;

  // 2. Starten, falls instant_deploy !== false
  if (parsed.instant_deploy !== false) {
    try {
      await triggerDatabaseStart(env.COOLIFY_URL, env.COOLIFY_TOKEN, dbUuid);
    } catch (err) {
      // Weitergehen trotz DB-Startfehler -> Soft-Success / partial failure posture
    }
  }

  // 3. App erstellen
  let appUuid: string;
  try {
    const appPayload = { ... };
    const appResult = await createPublicApplication(env.COOLIFY_URL, env.COOLIFY_TOKEN, appPayload);
    appUuid = appResult.uuid;
  } catch (err) {
    // Kein Auto-Rollback der DB bei App-Fehler! (D-15)
    throw new CoolifyApiError({
      code: 'COOLIFY_RECIPE_PARTIAL_FAILURE',
      message: `Database created successfully (UUID: ${dbUuid}), but application creation failed: ${err.message}`,
      recoveryHints: [
        'Do not delete the database; it is fully functional.',
        'Manually create the application and link the connection string.',
      ],
      data: { database_uuid: dbUuid },
    });
  }

  // 4. Verbindungsdaten ermitteln & verdrahten
  let connectionString = '';
  try {
    const dbDetails = await fetchDatabase(env.COOLIFY_URL, env.COOLIFY_TOKEN, dbUuid);
    connectionString = dbDetails.internal_db_url || constructFallbackUrl(parsed.db_engine, dbDetails);
  } catch (err) {
    // Bei Fehler Verbindungsdaten selbst konstruieren (D-14)
    connectionString = constructFallbackUrl(parsed.db_engine, { ... });
  }

  // 5. Verdrahtung in Anwendung (bulkUpdateEnvs)
  const envKey = parsed.env_key || 'DATABASE_URL';
  await bulkUpdateEnvs('application', env.COOLIFY_URL, env.COOLIFY_TOKEN, appUuid, [
    { key: envKey, value: connectionString }
  ]);

  if (parsed.instant_deploy !== false) {
    await triggerDeploy(env.COOLIFY_URL, env.COOLIFY_TOKEN, appUuid);
  }

  return {
    application_uuid: appUuid,
    database_uuid: dbUuid,
    connection_string: connectionString, // Maskiert im Formatierer über sanitizeFullProjection!
  };
}
```

---

### `src/mcp/tools/recipe.test.ts` (test, request-response)

**Analog:** `src/mcp/tools/service.test.ts`

**Imports and Mock setup Pattern** (from `src/mcp/tools/service.test.ts` lines 1-61):
```typescript
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { handleRecipeAction, recipeActionSchema } from './recipe.js';
import type { EnvConfig } from '../../config/env.js';

vi.mock('../../api/client.js', () => ({
  createPublicApplication: vi.fn(),
  triggerDeploy: vi.fn(),
  bulkUpdateEnvs: vi.fn(),
  fetchDatabase: vi.fn(),
  triggerDatabaseStart: vi.fn(),
  createPostgresqlDatabase: vi.fn(),
  createService: vi.fn(),
}));
```

**Scaffold / Test Cases Pattern** (from `src/mcp/tools/service.test.ts` lines 107-134):
```typescript
describe('recipeActionSchema', () => {
  it('validates correct parameter mappings for create-app-db', () => {
    const result = recipeActionSchema.safeParse({
      action: 'create-app-db',
      server_uuid: 'srv-1',
      app_name: 'test-app',
      db_name: 'test-db',
      db_engine: 'postgresql',
    });
    expect(result.success).toBe(true);
  });
});
```

---

### `src/mcp/tools/service.ts` (controller, request-response)

**Analog:** `src/mcp/tools/service.ts` (itself, expanding the actions)

**Action Registration Pattern** (from `src/mcp/tools/service.ts` lines 258-281):
```typescript
// serviceActionsCatalog erweitern um `list-types(format?, projection?)`
export const serviceActionsCatalog =
  'Actions: get(uuid, format?, projection?, reveal?) · list-types(format?, projection?) · create(server_uuid, type?, compose?) · update(uuid) · ...';

export const serviceActionSchema = createFlatActionSchema(
  [
    'get',
    'list-types', // NEU
    'create',
    // ...
  ],
  {
    // ... existierende Felder ...
  },
  {
    get: ['uuid', ...serviceReadParamKeys],
    'list-types': [...serviceReadParamKeys], // NEU
    create: [ ... ],
    // ...
  }
);
```

**Dynamic Fetch & Version Pinning Pattern** (from RESEARCH Pattern 1):
```typescript
import { ofetch } from 'ofetch';
import { fetchVersion } from '../../api/client.js';

async function handleServiceListTypes(parsed: ListTypesAction, env: EnvConfig) {
  let version = 'v4.x'; // Fallback
  try {
    const versionData = await fetchVersion(env.COOLIFY_URL, env.COOLIFY_TOKEN, env.COOLIFY_VERIFY_SSL);
    const rawVersion = typeof versionData === 'object' && versionData !== null && 'version' in versionData
      ? String((versionData as { version: unknown }).version)
      : String(versionData);
    
    if (rawVersion && rawVersion !== 'unknown') {
      version = rawVersion.startsWith('v') ? rawVersion : `v${rawVersion}`;
    }
  } catch (err) {
    // Soft ignore version fetch failures
  }

  const cdnUrl = `https://cdn.jsdelivr.net/gh/coollabsio/coolify@${version}/templates/service-templates.json`;
  const githubUrl = `https://raw.githubusercontent.com/coollabsio/coolify/${version}/templates/service-templates.json`;

  let rawTemplates: Record<string, unknown>;
  try {
    rawTemplates = await ofetch(cdnUrl, { parseResponse: JSON.parse });
  } catch (err) {
    try {
      rawTemplates = await ofetch(githubUrl, { parseResponse: JSON.parse });
    } catch (gitErr) {
      throw new CoolifyApiError({
        code: 'COOLIFY_FETCH_TEMPLATES_FAILED',
        message: 'Could not fetch service templates from CDN or GitHub Raw.',
        recoveryHints: [
          'Verify that your server has outbound internet access.',
          'Verify that coollabsio/coolify GitHub repository is accessible.',
        ],
      });
    }
  }

  // D-04: Slim list-response mit nur IDs + kurzen Labels
  const slimTemplates = Object.entries(rawTemplates).map(([id, details]: [string, any]) => ({
    id,
    label: details.name || id,
  }));

  return buildReadResponse(slimTemplates, {
    format: parsed.format,
    max_chars: parsed.max_chars,
  });
}
```

---

### `src/mcp/tools/service.test.ts` (test, request-response)

**Analog:** `src/mcp/tools/service.test.ts` (itself)

**Mocking ofetch Pattern** (from `src/mcp/tools/service.test.ts` lines 9-26):
```typescript
vi.mock('ofetch', () => ({
  ofetch: vi.fn(),
}));

import { ofetch } from 'ofetch';
```

**list-types Test Cases Pattern** (from `src/mcp/tools/service.test.ts` lines 107-147):
```typescript
describe('handleServiceAction list-types', () => {
  beforeEach(() => {
    vi.mocked(ofetch).mockReset();
  });

  it('successfully returns slim mapped templates from CDN', async () => {
    vi.mocked(ofetch).mockResolvedValue({
      actualbudget: { name: 'Actual Budget' },
      gitea: { name: 'Gitea' },
    });

    const result = await handleServiceAction(
      { action: 'list-types' },
      testEnv,
    );

    expect(isServiceErrorResult(result)).toBe(false);
    if (isServiceErrorResult(result)) return;

    expect(result.data).toEqual([
      { id: 'actualbudget', label: 'Actual Budget' },
      { id: 'gitea', label: 'Gitea' },
    ]);
  });
});
```

---

### `src/mcp/server.ts` (config, request-response)

**Analog:** `src/mcp/server.ts` (itself)

**Registering New Tool Pattern** (from `src/mcp/server.ts` lines 36-49 / lines 173-176):
```typescript
// Import block:
import {
  handleRecipeAction,
  recipeActionSchema,
  recipeActionsCatalog,
  recipeSafetyFooter,
} from './tools/recipe.js';

// Registration block inside registerCoolifyTools:
server.registerTool(
  'recipe',
  {
    description: composeToolDescription(
      'Multi-resource orchestration recipes & dynamic provisioning.',
      recipeActionsCatalog,
      recipeSafetyFooter,
    ),
    inputSchema: withInstanceRoutingSchema(recipeActionSchema),
    outputSchema: toolOutputSchema,
    annotations: { openWorldHint: true },
  },
  async (args) => {
    const result = await handleRecipeAction(args, env);
    if (isRecipeErrorResult(result)) {
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

## Shared Patterns

### Flat Action Schemas (createFlatActionSchema)
**Source:** `src/mcp/tools/shared-read-params.ts`
**Apply to:** All MCP action files (`recipe.ts` and `service.ts`)
```typescript
export const recipeActionSchema = createFlatActionSchema(
  [ ...actions ],
  { ...fields },
  { ...allowedFieldsPerAction },
  { ...requiredFieldsPerAction }
);
```

### Sanitization and Masking (sanitizeFullProjection)
**Source:** `src/utils/projections.ts`
**Apply to:** All actions returning credentials/connection strings (`recipe.ts` and `service.ts`)
- Connection strings like `internal_db_url` and password fields are dynamically masked using `sanitizeFullProjection(raw, reveal)` unless `reveal: true` is explicitly requested by the agent caller.

---

## No Analog Found

Every file mapped in this phase has a direct exact analog because:
- `recipe.ts` operates on application, database, and service creation methods, which have highly mature analog implementations in `src/mcp/tools/application.ts`, `database.ts`, and `service.ts`.
- `list-types` simply extends the existing `service.ts` CRUD tool.

---

## Metadata

**Analog search scope:** `src/mcp/tools/*.ts`, `src/api/*.ts`, `src/utils/*.ts`
**Files scanned:** 10
**Pattern extraction date:** 2026-07-24
