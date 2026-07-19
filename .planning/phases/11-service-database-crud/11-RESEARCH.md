# Phase 11: Service & Database CRUD - Research

**Researched:** Sunday Jul 19, 2026
**Domain:** Coolify Service and Database CRUD operations
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Service create surface
- **D-01:** Single `create` action with discriminator: one-click `type` XOR compose input (`compose` / `compose_file`) — maps to Coolify `POST /services`.
- **D-02:** Optional `urls[]` of `{ name, url }` on create (OpenAPI-shaped); domains also settable later via update. Not required for compose create.
- **D-03:** Create scoping mirrors Phase 10 applications: `server_uuid` required; `project_uuid` XOR `project_name`; `environment_name` or environment UUID; no silent `production` default — missing → `COOLIFY_VALIDATION_ERROR` with ask-human hint.

#### Compose I/O (SVC-07)
- **D-04:** Compose input accepts **either** inline YAML (`compose` string) **or** local `compose_file` path — XOR, exactly one when creating/updating via compose path.
- **D-05:** MCP field name is `compose` (YAML). Coolify `docker_compose_raw` is internal only after base64 encode; agent never sees or supplies base64.
- **D-06:** `service.get` / create/update responses always return **decoded YAML** in `compose` (or equivalent projection field) — never base64.
- **D-07:** Light validation before API: non-empty + parseable YAML; invalid → `COOLIFY_VALIDATION_ERROR`. No full Compose schema enforcement.

#### Database create surface
- **D-08:** Single `create` action with `engine` discriminator: `postgresql` | `mysql` | `mariadb` | `mongodb` | `redis` | `clickhouse` | `dragonfly` | `keydb` — maps internally to the eight Coolify POST routes.
- **D-09:** Credentials/passwords are **caller-supplied only** — MCP does not generate secrets. Responses mask passwords/connection strings unless `reveal: true` (SAF-04).
- **D-10:** Database create scoping same as services/apps (D-03). Connection strings and secrets always masked by default on get/create/update unless `reveal: true`.

#### Instant deploy & public access
- **D-11:** `instant_deploy` defaults to **`true`** for service and database create (intentional product override vs Phase 10 apps default `false`). Wait model remains **fire-and-forget** — return UUID + start/deploy queued status + follow-up hints; no wait/poll until running. Agent uses existing `start`/`restart`/`deploy` for follow-up.
- **D-12:** Enabling public access on **database create** (`is_public: true` and related port fields) requires `confirm: true`; default remains private. Missing confirm → `COOLIFY_CONFIRM_REQUIRED`. (Exception to delete-only confirm pattern — security-sensitive exposure.)
- **D-13:** Partial failure (create OK, instant start/deploy fails to queue): soft success — `ok: true`, UUID returned, `deploy`/`start: { status: 'failed_to_queue', ... }` + recovery hints; **no auto-rollback/delete**.

#### Carry-forward (not re-discussed)
- **D-14:** Extend existing `service` and `database` tools — no new MCP tools.
- **D-15:** Delete requires `confirm: true` → else `COOLIFY_CONFIRM_REQUIRED`; optional `delete_preview` (Phase 8/9/10 parity).
- **D-16:** Safe delete defaults: `delete_volumes=false`, `delete_configurations=false`, `docker_cleanup=false` (SAF-02).
- **D-17:** Zod validates create/update before any API call (SAF-03).
- **D-18:** Mutation identity reuse: `uuid` | `name` with `COOLIFY_AMBIGUOUS_MATCH` on multi-match.
- **D-19:** Domain conflict on service create/update: map Coolify HTTP 409 → structured `COOLIFY_409` with `data.conflicts` + recovery hint to retry with `force_domain_override: true` (SVC-10 / Phase 10 APP-21 parity). Override gate is the flag alone — no extra confirm (`confirm` remains delete + D-12 public-create).
- **D-20:** Service `update` may change compose/configuration using the same compose I/O rules (D-04–D-07); curated non-compose fields left to research within Phase 10 update spirit.

### Claude's Discretion
- One-click `type` constraint: free string + examples vs curated Zod enum — researcher verifies Coolify/OpenAPI type list and planner picks maintainable path (prefer free string if list is large/unstable).
- Exact curated field allowlists for service update and per-engine database create/update — researcher builds from OpenAPI; keep curated (not near-full passthrough) unless API forces otherwise.
- Whether enabling `is_public: true` on **database update** needs `confirm: true` (mirror D-12) or flag-alone (like `force_domain_override`) — planner chooses; document in plan.
- Shared helper extraction for base64 compose encode/decode, confirm/safe-delete, domain-409 vs copy from Phase 10 — planner chooses for reuse.
- Whether databases expose `instant_deploy` under that exact Coolify field name or map to start-after-create — researcher verifies API per engine.

### Specifics
- User wants recommendations marked on every discuss question; discussion language German; decisions recorded in English for downstream agents (this file).
- Intentional product overrides vs Phase 10 apps: **`instant_deploy` default `true`** for services/DBs; **`confirm: true` required to create a publicly exposed database**.
- Todos matching Phase 11 keyword search were reviewed and explicitly not folded (`none`).

### Deferred Ideas (OUT OF SCOPE)
- MCP Server für Coolify Cloud erweitern — api/cloud; out of Phase 11
- Custom Skills pro IDE für Coolify — docs; out of scope
- Lokale Projekt-Manifest-Datei für Coolify-Metadaten — tooling; out of scope
- Standard-Setup Tool für neue Coolify-Projekte — tooling; out of scope (may consume service/DB create later)
- Integrate official Coolify OpenAPI specs — docs; out of scope
- Env var CRUD / `.env` sync — Phase 12
- Database backup schedules — Phase 13
- Service/DB bounded logs (SVC-04) — v1.1
- Application Docker Compose create — already out of scope (use service)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| **SVC-06** | Create one-click service by type | Handled via `POST /services` with `type` param (`docs/coolify_openapi.yaml`). |
| **SVC-07** | Create custom service from Docker Compose YAML | Handled via `POST /services` with base64 encoded `docker_compose_raw` (`docs/coolify_openapi.yaml`). |
| **SVC-08** | Update service configuration and compose | Handled via `PATCH /services/{uuid}` with base64 encoded `docker_compose_raw` + curated fields. |
| **SVC-09** | Delete service with `confirm: true` and safe defaults | Handled via `DELETE /services/{uuid}` with defaults: `delete_volumes=false`, `delete_configurations=false`, `docker_cleanup=false`. |
| **SVC-10** | Structured recovery hints on domain conflict (409) | Aligned with Phase 10 domain conflict mapping for standard REST 409 responses. |
| **DB-01** | Create database across 8 supported engines | Aligned with 8 engine-specific `POST /databases/{engine}` endpoints in OpenAPI. |
| **DB-02** | Update database configuration | Handled via `PATCH /databases/{uuid}` with curated engine-specific fields. |
| **DB-03** | Delete database with `confirm: true` and safe defaults | Handled via `DELETE /databases/{uuid}` with defaults: `delete_volumes=false`, `delete_configurations=false`, `docker_cleanup=false`. |
| **DB-04** | Configure public access and public port on database | Exposing `is_public` and `public_port` on database create (with `confirm: true`) and update. |
</phase_requirements>

## Summary

This research establishes the implementation path for Phase 11: `service-database-crud`. In this phase, GSD core resources `service` and `database` are extended from read/lifecycle-only capabilities to support full creation, update, and safe deletion. 

Key technical requirements include transparent Base64 encoding/decoding of Docker Compose YAML at the MCP boundary, providing structured Zod-validated entrypoints for one-click services and 8 database engines, and introducing specialized security-related confirm gates for database public access toggles.

**Primary recommendation:** Use a modular schema design extending existing `service` and `database` MCP tools, utilizing a `yaml` package for compose validation, translating `public_access` to `is_public` transparently, and enforcing robust safety defaults (confirm-gates, masked credentials, safe-delete defaults) across both systems.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Service Creation / Update | API / Backend | Frontend Server (SSR) | Managed via `POST /services` and `PATCH /services/{uuid}`; base64 compose encoded by MCP. |
| Database Provisioning | API / Backend | Frontend Server (SSR) | Managed via 8 engine-specific REST endpoints on Coolify. |
| Safety Confirm Gates | Frontend Server (SSR) | — | Handled by MCP Zod schemas and tool handlers before calling API. |
| Credentials & Secrets Masking | Frontend Server (SSR) | — | Handled by `sanitizeFullProjection` on full database response schemas. |
| Service Deletion / Volumes | API / Backend | — | Managed via `DELETE /services/{uuid}` with query parameters. |
| Database Deletion / Volumes | API / Backend | — | Managed via `DELETE /databases/{uuid}` with query parameters. |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `ofetch` | 1.5.1 | HTTP Client | Integrated in `src/api/client.ts` with custom retry options and error mapping. `[CITED: package.json]` |
| `zod` | 4.4.3 | Schema Validation | Standard validation library in the project; parses action payloads at the entry. `[CITED: package.json]` |
| `yaml` | 2.9.0 | YAML Validation | Lightweight, extremely popular, and verified safe tool dependency for parse validations. `[VERIFIED: npm registry]` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `vitest` | 4.1.10 | Test Framework | Existing test runner configuration in `vitest.config.ts`. `[CITED: package.json]` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `yaml` | manual regex | Regex is highly brittle for multi-line Docker Compose blocks; `yaml` ensures exact syntax validity. |
| `yaml` | `js-yaml` | `yaml` has no dependencies, is faster, and has smaller footprint. |

**Installation:**
```bash
npm install yaml@2.9.0
```

**Version verification:**
```bash
npm view yaml version          # 2.9.0 (Published: 2026-05-11) `[VERIFIED: npm registry]`
```

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `yaml` | npm | 2 months | 162.1M/wk | github.com/eemeli/yaml | [OK] | Approved |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

*The `yaml` package was successfully validated through the package legitimacy gate, showing zero postinstall scripts and highly reputable maintenance.*

## Architecture Patterns

### System Architecture Diagram

```
[Agent / MCP Caller]
       │
       ▼ (service / database tool action)
┌─────────────────────────────────────────────────────────────┐
│ src/mcp/tools/{service,database}.ts                         │
│  ├─► Zod Validation (SAF-03)                                │
│  ├─► Project/Environment Scoping Resolvers (D-03)           │
│  ├─► Delete & Public Confirm Gates (SAF-01 / D-12)          │
│  ├─► Docker Compose YAML ↔ Base64 conversion (SVC-07)       │
│  └─► Secret Masking Projection (SAF-04)                     │
└───────────────────────────┬─────────────────────────────────┘
                            │ (Client CRUD call)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ src/api/client.ts                                           │
│  ├─► POST /services                                         │
│  ├─► PATCH /services/{uuid}                                 │
│  ├─► DELETE /services/{uuid}                                │
│  ├─► POST /databases/{engine} (8 routes)                    │
│  ├─► PATCH /databases/{uuid}                                │
│  └─► DELETE /databases/{uuid}                               │
└───────────────────────────┬─────────────────────────────────┘
                            │ (HTTP REST)
                            ▼
                     ┌─────────────┐
                     │ Coolify API │
                     └─────────────┘
```

### Recommended Project Structure
```
src/
├── api/
│   └── client.ts             # Extend with service/database CRUD endpoint calls
├── mcp/
│   └── tools/
│       ├── service.ts        # Extend with create, update, delete, delete_preview actions
│       └── database.ts       # Extend with create, update, delete, delete_preview actions
└── utils/
    └── yaml-validator.ts     # Add helper for light YAML compose parsing
```

### Pattern 1: Transparent Base64 Compose Encoding & Decoding
**What:** The MCP client translates plain-text Docker Compose YAML `compose` into/from base64 `docker_compose_raw` required by the Coolify API.
**When to use:** On Service creation, updates, and fetch details.
**Example:**
```typescript
// Source: GSD-Core feasibility spike
export function encodeCompose(yaml: string): string {
  return Buffer.from(yaml, 'utf8').toString('base64');
}

export function decodeCompose(base64: string): string {
  try {
    return Buffer.from(base64, 'base64').toString('utf8');
  } catch {
    return '';
  }
}
```

### Anti-Patterns to Avoid
- **Hard-coded Default Environments:** Do not fallback to `production` or `default` project if they are missing in creation. Throw `COOLIFY_VALIDATION_ERROR` with a prompt asking the human.
- **Leaking Secrets in Database JSON:** Never return password/connection strings of databases in the main response unless `reveal: true` is explicitly supplied.
- **Silent Database Public Exposure:** Never set `is_public: true` on database creation or database update without checking that `confirm: true` was also passed. If missing, return `COOLIFY_CONFIRM_REQUIRED`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| YAML Validation | String regex checking | `yaml` package parse | Hand-rolled regex fails on nested structures and valid escape sequences. |
| Port Collision Checks | SSH-based port scan | Coolify API error mapping | Coolify handles server-side port conflicts natively; catching 409/422 responses is much cleaner. |
| Auto Password Generation | Custom string randomizers | Caller-supplied secrets | Password generation belongs in the agent/caller domain to maintain clear security ownership. |

**Key insight:** Keeping all state verification, validation, and database setup centralized on Coolify prevents drift and keeps the MCP server light and resilient.

## Common Pitfalls

### Pitfall 1: Service Domain Conflicts (HTTP 409)
**What goes wrong:** Deploying services with conflicting FQDNs returns an API 409 error.
**Why it happens:** Coolify blocks duplicate domains to avoid proxy routing conflicts.
**How to avoid:** Map the HTTP 409 response to `COOLIFY_409`, return the conflicts array, and prompt the agent to retry with `force_domain_override: true` as carried forward from Phase 10.

### Pitfall 2: MongoDB Spec Omission
**What goes wrong:** The Coolify OpenAPI spec does not list `mongo_initdb_root_password` or `mongo_initdb_database` under the `POST /databases/mongodb` request body, only under PATCH.
**Why it happens:** Document mismatch in original Coolify OpenAPI definition.
**How to avoid:** Support these custom fields under the MongoDB creator and translate them cleanly to the API payload.

### Pitfall 3: Database start/restart timing
**What goes wrong:** Slow database engine initialization leads to timing failures if we poll state too fast.
**Why it happens:** Database image pull and internal entrypoint scripting take time.
**How to avoid:** Stick to fire-and-forget start/creation response with status `requested` as defined in D-11.

## Code Examples

Verified patterns from official sources:

### Service Create via API
```typescript
// Source: docs/coolify_openapi.yaml (Line 6870)
export async function createService(
  url: string,
  token: string,
  payload: {
    server_uuid: string;
    project_uuid: string;
    environment_name?: string;
    environment_uuid?: string;
    name?: string;
    description?: string;
    type?: string;
    docker_compose_raw?: string;
    instant_deploy?: boolean;
    force_domain_override?: boolean;
    urls?: Array<{ name: string; url: string }>;
  },
  verifySsl = true,
): Promise<unknown> {
  const client = createCoolifyClient(url, token, verifySsl);
  return client('/services', {
    method: 'POST',
    body: payload,
  });
}
```

### PostgreSQL Database Create via API
```typescript
// Source: docs/coolify_openapi.yaml (Line 3124)
export async function createPostgresqlDatabase(
  url: string,
  token: string,
  payload: {
    server_uuid: string;
    project_uuid: string;
    environment_name?: string;
    environment_uuid?: string;
    name?: string;
    description?: string;
    image?: string;
    is_public?: boolean;
    public_port?: number;
    postgres_user?: string;
    postgres_password?: string;
    postgres_db?: string;
    instant_deploy?: boolean;
  },
  verifySsl = true,
): Promise<unknown> {
  const client = createCoolifyClient(url, token, verifySsl);
  return client('/databases/postgresql', {
    method: 'POST',
    body: payload,
  });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Lifecycle actions only | Full Creation & CRUD | Phase 11 | Enables the agent to provision complete multi-container service stacks and DBs from scratch. |
| Plaintext expose | Confirm guard on Public DB | Phase 11 | Prevents accidental public exposure of database ports. |
| Raw API values | Decoded compose translation | Phase 11 | Conceals Base64 serialization entirely from the LLM context. |

**Deprecated/outdated:**
- Application Docker Compose Create: Replaced entirely by `service.create` (compose custom service path) on Coolify 4.x.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Database update supports all engine fields | Pitfalls / Open Questions | Some specific engines might ignore PATCH parameters silently; we mitigate by letting Coolify API handle updates. |

## Open Questions (RESOLVED)

1. **How should we handle database update (`PATCH /databases/{uuid}`) parameter mapping?**
   - *What we know:* The generic PATCH endpoint accepts all fields.
   - *What was unclear:* Whether Coolify validates engine compatibility of patched fields (e.g. patching `postgres_user` on mysql).
   - **Resolution:** Curated pass-through. The MCP handler builds a curated, engine-specific payload (per-variant Zod schema in 11-05 Task 1 — only fields valid for that engine are on the variant), omits undefined fields, and sends the PATCH. Coolify is the source of truth for engine compatibility — if an invalid combination slips through, Coolify returns HTTP 422 and the existing `mapApiError` surfaces it as `COOLIFY_422` with the API's error message. The MCP does NOT pre-validate engine-field compatibility (would duplicate server logic and drift). This mirrors the Phase 10 application update approach (curated allowlist + server-side 422).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Coolify API v1 | Integration | ✓ | 4.1.x | — |
| Node.js | Runtime | ✓ | 22.14+ | — |
| npm | Dependency Management | ✓ | 11.17+ | — |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run src/mcp/tools/service.test.ts src/mcp/tools/database.test.ts` |
| Full suite command | `npm run test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| **SVC-06** | Create one-click service | unit | `npx vitest run src/mcp/tools/service.test.ts` | ❌ Wave 0 |
| **SVC-07** | Create custom service (plain YAML) | unit | `npx vitest run src/mcp/tools/service.test.ts` | ❌ Wave 0 |
| **SVC-08** | Update service config / compose | unit | `npx vitest run src/mcp/tools/service.test.ts` | ❌ Wave 0 |
| **SVC-09** | Service safe delete defaults | unit | `npx vitest run src/mcp/tools/service.test.ts` | ❌ Wave 0 |
| **SVC-10** | Service FQDN 409 conflicts hints | unit | `npx vitest run src/mcp/tools/service.test.ts` | ❌ Wave 0 |
| **DB-01** | Create database (8 engines) | unit | `npx vitest run src/mcp/tools/database.test.ts` | ❌ Wave 0 |
| **DB-02** | Update database configuration | unit | `npx vitest run src/mcp/tools/database.test.ts` | ❌ Wave 0 |
| **DB-03** | Database safe delete defaults | unit | `npx vitest run src/mcp/tools/database.test.ts` | ❌ Wave 0 |
| **DB-04** | Configure database public access | unit | `npx vitest run src/mcp/tools/database.test.ts` | ❌ Wave 0 |

### Wave 0 Gaps
- [ ] `src/mcp/tools/service.test.ts` — Add test specs for Service Create/Update/Delete (currently contains Get/lifecycle only).
- [ ] `src/mcp/tools/database.test.ts` — Add test specs for Database Create/Update/Delete (currently contains Get/lifecycle only).
- [ ] `src/api/client.test.ts` — Add specs for 8 database poster calls and service POST/PATCH/DELETE wrappers.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V5 Input Validation | yes | Pre-API Zod validations on all database create payloads and YAML compose blocks. |
| V6 Cryptography | yes | Masking database passwords and connection URIs via `sanitizeFullProjection` on summary and detail projections. |

### Known Threat Patterns for databases

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Accidental Port Exposure | Information Disclosure | Mandatory `confirm: true` check before allowing database creation or update with public port mapping. |
| Credentials Exposure | Information Disclosure | `sanitizeFullProjection` and redact logs to remove all occurrences of `password`, `key`, and URLs. |

## Sources

### Primary (HIGH confidence)
- `docs/coolify_openapi.yaml` - Verified `/services` and `/databases` API endpoints, including POST, GET, PATCH, and DELETE.
- `/Users/puzzless/Desktop/awesome-coolify/package.json` - Verified dependency structure.

### Secondary (MEDIUM confidence)
- `src/mcp/tools/application.ts` - Verified CRUD patterns, soft successes, and error mappings.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Extends existing verified stack without complex tooling additions.
- Architecture: HIGH - Reuses existing robust action-dispatcher patterns.
- Pitfalls: HIGH - Documented MongoDB and database public port confirmation gotchas.

**Research date:** Sunday Jul 19, 2026
**Valid until:** Tuesday Aug 18, 2026
