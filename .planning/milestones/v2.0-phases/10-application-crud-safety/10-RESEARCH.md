# Phase 10: Application CRUD & Safety - Research

**Researched:** 2026-07-19
**Domain:** Coolify Application CRUD, validation, masking, and safe deletion
**Confidence:** HIGH

## Summary

This research establishes the technical foundation, standard stack, API endpoints, and safety patterns required to implement Phase 10: `application-crud-safety`. In this phase, the existing `application` MCP tool is extended to support creating all five application source types, updating their configuration (including HTTP basic authentication), and deleting them safely. 

**Primary recommendation:** Use a single, unified `create` action with a `source_type` discriminator mapping to five distinct Coolify POST endpoints, backed by strict Zod schema validation, secret masking (`reveal: true` opt-in), and mandatory delete confirmation gates with safe defaults.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Application Creation | API / Backend | Frontend Server (SSR) | Handled by Coolify's REST API endpoints; initiated via MCP client. |
| Configuration Update | API / Backend | Frontend Server (SSR) | PATCH `/applications/{uuid}` endpoint updates application state. |
| Deletion & Safe Defaults | API / Backend | — | DELETE `/applications/{uuid}` with query parameters for volumes and configs. |
| Input Validation | Frontend Server (SSR) | — | Zod validates payloads on the MCP server side before any API call is made. |
| Secret Masking | Frontend Server (SSR) | — | MCP server sanitizes responses (`reveal: true` unmasks) to prevent leaking credentials. |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `ofetch` | 1.5.1 | HTTP Client | Lightweight, robust, and supports custom retry options and error mapping. `[VERIFIED: npm registry]` |
| `zod` | 4.4.3 | Schema Validation | Standard validation library in the project; parses action payloads at the entry. `[VERIFIED: npm registry]` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `vitest` | 1.x / 2.x | Test Framework | Existing test runner configuration in `vitest.config.ts`. `[CITED: vitest.config.ts]` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `ofetch` | `axios` | `ofetch` is already integrated in `src/api/client.ts` and has custom error handling; switching would introduce duplication. |
| `zod` | `yup` | `zod` is the project standard; using another library violates consistency. |

**Installation:**
No new npm packages need to be installed for this phase. The core dependencies are already present in the workspace.

**Version verification:**
```bash
npm view ofetch version          # 1.5.1 (Published: 2025-11-01)
npm view zod version             # 4.4.3 (Published: 2026-05-04)
```

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `ofetch` | npm | ~8 months | 22.9M/wk | github.com/unjs/ofetch | [OK] | Approved |
| `zod` | npm | ~2 months | 212.7M/wk | github.com/colinhacks/zod | [OK] | Approved |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

*All packages discovered are verified against the npm registry and have no postinstall scripts.*

## Architecture Patterns

### System Architecture Diagram

```
[User / Agent] 
      │
      ▼ (MCP Tool Call)
┌────────────────────────────────────────────────────────┐
│ src/mcp/tools/application.ts                           │
│  ├─► Zod Validation (SAF-03)                           │
│  ├─► Mutation Identity Resolution (D-21)               │
│  ├─► Delete Confirmation Gate (SAF-01)                 │
│  └─► Secret Masking / Projection (SAF-04)              │
└──────────────────────────┬─────────────────────────────┘
                           │ (Client Call)
                           ▼
┌────────────────────────────────────────────────────────┐
│ src/api/client.ts                                      │
│  ├─► POST /applications/public                         │
│  ├─► POST /applications/private-github-app             │
│  ├─► POST /applications/private-deploy-key             │
│  ├─► POST /applications/dockerfile                     │
│  ├─► POST /applications/dockerimage                    │
│  ├─► PATCH /applications/{uuid}                        │
│  └─► DELETE /applications/{uuid}                       │
└──────────────────────────┬─────────────────────────────┘
                           │ (HTTP REST)
                           ▼
                  ┌─────────────────┐
                  │   Coolify API   │
                  └─────────────────┘
```

### Recommended Project Structure
The files to modify are located in the existing project structure:
```
src/
├── api/
│   └── client.ts       # Add application CRUD endpoints (POST, PATCH, DELETE)
├── mcp/
│   └── tools/
│       └── application.ts # Extend with create, update, delete, delete_preview actions
└── utils/
    └── errors.ts       # Ensure COOLIFY_409 maps domain conflicts correctly
```

### Pattern 1: Single `create` with Source Type Discriminator
**What:** A single `create` action on the `application` tool that uses a `source_type` discriminator to route the request to the correct Coolify API endpoint.
**When to use:** On `application` tool calls with `action: 'create'`.
**Example:**
```typescript
// Source: docs/coolify_openapi.yaml
const createActionSchema = z.discriminatedUnion('source_type', [
  z.object({
    action: z.literal('create'),
    source_type: z.literal('public_git'),
    project_uuid: z.string().optional(),
    project_name: z.string().optional(),
    environment_name: z.string().optional(),
    environment_uuid: z.string().optional(),
    server_uuid: z.string().describe('Server UUID'),
    git_repository: z.string().describe('Git repository URL'),
    git_branch: z.string().describe('Git branch'),
    build_pack: z.enum(['nixpacks', 'railpack', 'static', 'dockerfile']).describe('Build pack type'),
    instant_deploy: z.boolean().default(false).optional(),
    // ... other curated fields ...
  }),
  z.object({
    action: z.literal('create'),
    source_type: z.literal('private_deploy_key'),
    private_key_uuid: z.string().describe('Private key UUID'),
    // ... private git fields ...
  }),
  // ... other source types ...
]);
```

### Anti-Patterns to Avoid
- **Silent Defaults for Project/Environment:** Do not default to `production` or a default project if they are missing. Require either `project_uuid` XOR `project_name` and `environment_name` or `environment_uuid` to prevent deploying to the wrong environment.
- **Leaking Secrets in Logs/Responses:** Never return unmasked basic-auth passwords or deploy keys in the main response unless `reveal: true` is explicitly requested.
- **Hand-rolling Domain Preflights:** Do not attempt to query domains before creation. Let Coolify return a 409, and map it to `COOLIFY_409` with structured conflicts and recovery hints.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Domain Preflight Checks | Custom DNS/HTTP lookups | Coolify 409 mapping | Coolify already performs robust domain conflict checks; mapping its 409 response is cleaner and less error-prone. |
| Password Generation | Auto-generated passwords | Caller-supplied credentials | MCP should not own password generation; passwords must be provided by the caller/agent. |
| Volume/Config Cleanup | Custom Docker commands | Coolify DELETE query params | Coolify's DELETE endpoint natively supports `delete_volumes` and `delete_configurations` parameters. |

**Key insight:** Leveraging Coolify's native API capabilities (such as query parameters on DELETE and domain conflict detection on POST/PATCH) keeps the MCP server simple, robust, and aligned with the platform's state.

## Common Pitfalls

### Pitfall 1: Duplicate FQDN / Domain Conflict (HTTP 409)
**What goes wrong:** Creating or updating an application with an FQDN already in use returns a 409 error.
**Why it happens:** Coolify prevents routing conflicts by blocking duplicate domains.
**How to avoid:** Map the HTTP 409 response to a structured `COOLIFY_409` error, returning `data.conflicts` and a recovery hint suggesting retry with `force_domain_override: true`.
**Warning signs:** Response status is 409 with a message containing "Domain conflicts detected".

### Pitfall 2: Partial Failure on `instant_deploy`
**What goes wrong:** The application is successfully created, but the instant deployment fails to queue.
**Why it happens:** The server is busy, or the git source cannot be reached immediately.
**How to avoid:** Return a soft success (`ok: true` with the app UUID) and set `deploy: { status: 'failed_to_queue', error: '...' }` along with recovery hints. Do not roll back or delete the created application.
**Warning signs:** Create POST returns 201 but the subsequent deploy trigger fails.

## Code Examples

Verified patterns from official sources:

### Application Create (Public Git)
```typescript
// Source: docs/coolify_openapi.yaml (Line 41)
export async function createPublicApplication(
  url: string,
  token: string,
  payload: unknown,
  verifySsl = true,
): Promise<unknown> {
  const client = createCoolifyClient(url, token, verifySsl);
  return client('/applications/public', {
    method: 'POST',
    body: payload,
  });
}
```

### Application Update (PATCH)
```typescript
// Source: docs/coolify_openapi.yaml (Line 1431)
export async function updateApplication(
  url: string,
  token: string,
  uuid: string,
  payload: unknown,
  verifySsl = true,
): Promise<unknown> {
  const client = createCoolifyClient(url, token, verifySsl);
  return client(`/applications/${uuid}`, {
    method: 'PATCH',
    body: payload,
  });
}
```

### Application Delete (DELETE with query params)
```typescript
// Source: docs/coolify_openapi.yaml (Line 1367)
export async function deleteApplication(
  url: string,
  token: string,
  uuid: string,
  params: {
    delete_configurations?: boolean;
    delete_volumes?: boolean;
    docker_cleanup?: boolean;
    delete_connected_networks?: boolean;
  },
  verifySsl = true,
): Promise<unknown> {
  const client = createCoolifyClient(url, token, verifySsl);
  return client(`/applications/${uuid}`, {
    method: 'DELETE',
    query: params,
  });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Flat deploy actions | Discriminator-based CRUD | Phase 10 | Allows full lifecycle management of apps from creation to safe deletion. |
| Plain errors | Structured `COOLIFY_409` | Phase 10 | Provides actionable recovery hints for duplicate domains. |
| Unmasked secrets | Always masked unless `reveal: true` | Phase 10 | Ensures basic-auth passwords and secrets are never leaked by default. |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `delete_preview` behavior for running apps | Summary / Context | Running apps might require stopping before deletion; if so, we must handle the API error gracefully. |

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Runtime | ✓ | v26.5.0 | — |
| npm | Package Manager | ✓ | 11.17.0 | — |
| Docker | Containerization | ✓ | 29.3.1 | — |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run src/mcp/tools/application.test.ts` |
| Full suite command | `npm run test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| APP-12 | Create from public Git | unit | `npx vitest run src/mcp/tools/application.test.ts` | ✅ |
| APP-13 | Create from private Git via deploy key | unit | `npx vitest run src/mcp/tools/application.test.ts` | ✅ |
| APP-14 | Create from private Git via GitHub App | unit | `npx vitest run src/mcp/tools/application.test.ts` | ✅ |
| APP-15 | Create from inline Dockerfile | unit | `npx vitest run src/mcp/tools/application.test.ts` | ✅ |
| APP-16 | Create from Docker registry image | unit | `npx vitest run src/mcp/tools/application.test.ts` | ✅ |
| APP-17 | Update application configuration | unit | `npx vitest run src/mcp/tools/application.test.ts` | ✅ |
| APP-18 | Delete application with safe defaults | unit | `npx vitest run src/mcp/tools/application.test.ts` | ✅ |
| APP-19 | Configure HTTP basic auth | unit | `npx vitest run src/mcp/tools/application.test.ts` | ✅ |
| APP-20 | Enable instant deploy on create | unit | `npx vitest run src/mcp/tools/application.test.ts` | ✅ |
| APP-21 | Structured recovery hints on 409 | unit | `npx vitest run src/mcp/tools/application.test.ts` | ✅ |
| SAF-01 | Delete requires `confirm: true` | unit | `npx vitest run src/mcp/tools/application.test.ts` | ✅ |
| SAF-02 | Delete defaults to false | unit | `npx vitest run src/mcp/tools/application.test.ts` | ✅ |
| SAF-03 | Zod validates before API | unit | `npx vitest run src/mcp/tools/application.test.ts` | ✅ |
| SAF-04 | Secrets masked unless reveal | unit | `npx vitest run src/mcp/tools/application.test.ts` | ✅ |

### Wave 0 Gaps
- None — existing test infrastructure covers all phase requirements.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V5 Input Validation | yes | Zod validation on all create/update actions before API calls. |
| V6 Cryptography | yes | Sensitive credentials (passwords, private keys) are masked in responses unless explicitly unmasked via `reveal: true`. |

### Known Threat Patterns for Coolify

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Credential Leakage | Information Disclosure | Sanitize all full projections using `sanitizeFullProjection` and mask secrets. |
| Unauthorized Deletion | Tampering | Require `confirm: true` query parameter to guard destructive DELETE actions. |

## Sources

### Primary (HIGH confidence)
- `docs/coolify_openapi.yaml` - Verified endpoints for `/applications/public`, `/applications/private-github-app`, `/applications/private-deploy-key`, `/applications/dockerfile`, `/applications/dockerimage`, and `/applications/{uuid}` (GET, PATCH, DELETE).

### Secondary (MEDIUM confidence)
- `src/mcp/tools/application.ts` - Existing codebase patterns for mutation resolution, deploy polling, and logs.
- `src/utils/projections.ts` - Sanitization and masking helpers.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Core dependencies are already verified and in use.
- Architecture: HIGH - Follows existing discriminator and action patterns.
- Pitfalls: HIGH - Documented domain 409 conflict and instant deploy error cases.

**Research date:** 2026-07-19
**Valid until:** 2026-08-19
