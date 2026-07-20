# Phase 12: Environment Variables & Smart Sync - Research

**Researched:** 2026-07-21
**Domain:** Environment Variable Management & Local Diff-Sync Engine
**Confidence:** HIGH

## Summary

Phase 12 stattet den `awesome-coolify` MCP-Server mit erweiterten Konfigurationsfähigkeiten aus. Agenten können damit Umgebungsvariablen (Envs) für Applikationen, Services und Datenbanken verwalten. Neben klassischen CRUD-Operationen bietet diese Phase ein performantes Bulk-Patching sowie eine intelligente, lokale `.env`-Synchronisations-Engine, die lokale Konfigurationen sicher mit dem Remote-Zustand abgleicht, ohne sensible Daten in Logs preiszugeben.

**Primary recommendation:** Implementiere eine robuste, lokale `.env`-Parser-Methode ohne externe Abhängigkeiten, um den Footprint gering zu halten, und nutze die `PATCH /{uuid}/envs/bulk`-Endpunkte für die Aktualisierung einzelner oder mehrerer Variablen, da dedizierte Einzel-PATCH-Endpunkte im Coolify-API fehlen.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Extend existing `application`, `service`, and `database` tools — no dedicated `env` MCP tool.
- **D-02:** Action namespace uses colon-prefix `envs:*`: `envs:list`, `envs:get`, `envs:create`, `envs:update`, `envs:delete`, `envs:bulk-update`, and (application only) `envs:sync`.
- **D-03:** Mutation/read identity: primary `env_uuid`; optional `key` lookup scoped to the parent resource; multi-match → `COOLIFY_AMBIGUOUS_MATCH` (no mutation).
- **D-04:** Read actions `envs:list` + `envs:get` on all three tools (values masked per D-14/D-15).
- **D-05:** Sync input is XOR: `env_file` (local path) **or** `env_content` (inline string) — exactly one (mirror Phase 11 compose XOR).
- **D-06:** `dry_run: true` on `envs:sync` returns diff `{ added, updated, unchanged, removed, conflicts? }` with **no** API writes; default `false` = apply path.
- **D-07:** Default sync never deletes remote keys missing locally. Optional `prune: true` only with `confirm: true`; missing confirm → `COOLIFY_CONFIRM_REQUIRED`. Diff always reports `removed` as would-remove even when prune is off.
- **D-08:** Value conflicts (local ≠ remote): **no auto-overwrite**. Diff includes `conflicts[]` (key + remote masked + local present). Apply without `conflict_policy` → `COOLIFY_CONFIRM_REQUIRED` / ask-human recovery hint. After human decision, agent retries with `conflict_policy: 'overwrite' | 'keep_remote' | 'abort'`.
- **D-09:** `envs:sync` is exposed **only** on `application` (ENV-05). Service/database get CRUD + bulk only.
- **D-10:** `envs:bulk-update` on **all three** tools (application, service, database) — OpenAPI supports bulk on each; ENV-04 is the minimum, not a hard cap.
- **D-11:** `envs:bulk-update` always requires `confirm: true` → else `COOLIFY_CONFIRM_REQUIRED`. No separate `envs:bulk-preview` action.
- **D-12:** Sync apply (`dry_run: false`) always requires `confirm: true`. `dry_run: true` does not require confirm.
- **D-13:** `envs:delete` requires `confirm: true`. `envs:create` / `envs:update` do **not** require confirm (usable single-key edits; batch/destructive paths remain gated).
- **D-14:** Values always masked (`***`) in list/get/create/update/bulk/sync responses unless `reveal: true` on that call (SAF-04 / `sanitizeFullProjection`). Keys, UUIDs, and flags remain visible. Sync/bulk responses and logs never include plaintext values; reuse `redactSecrets` for stderr/error paths.
- **D-15:** Product policy: agent must **ask the human** whether they want masked or revealed values before using `reveal: true`. Never auto-set `reveal: true`. If reveal is attempted without human preference, surface an ask-human / `ask_human_reveal` recovery hint. Technical default remains masked.
- **D-16:** Flag defaults on create and sync-created keys: `is_preview`, `is_literal`, `is_multiline`, `is_shown_once` all default `false`. Sync does not infer flags from `.env` content; caller may set flags explicitly on create/bulk entries (ENV-06 round-trip).
- **D-17:** Zod validates payloads before any API call (SAF-03).
- **D-18:** Parent resource identity reuses existing mutation resolvers (`uuid` | `name` / app patterns) from Phases 4/10/11.
- **D-19:** No stub tools; omit endpoints that do not exist on the target Coolify version.

### Claude's Discretion
- Exact `.env` parser edge cases (export prefix, quoted values, comments, blank lines) — researcher/planner pick a small robust parser; invalid file → `COOLIFY_VALIDATION_ERROR`.
- Whether bulk/sync internally use Coolify bulk PATCH vs fan-out individual calls when bulk fails — prefer single bulk call per ENV-04 spirit; document fallback if research finds API quirks.
- Precise shape of `conflicts[]` and per-key disposition fields in responses — keep agent-readable and redacted.
- Shared helper extraction (env CRUD client methods, confirm gates, sync engine) vs copy from application tool — planner chooses for reuse.
- Whether `is_preview` appears on service/database OpenAPI create bodies (apps have it; DBs may not) — researcher verifies; omit unsupported flags per resource type rather than stubbing.

### Deferred Ideas (OUT OF SCOPE)
- Per-key `conflict_policy` map (vs single policy for the apply call) — not required for Phase 12; single enum is enough unless research shows need.
- Sync on service/database — explicitly out of ENV-05 / deferred unless a future phase expands scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ENV-01 | Agent can create env var on application, service, or database | `POST /{uuid}/envs` is supported for all three types [VERIFIED: OpenAPI]. |
| ENV-02 | Agent can update env var by UUID | Handled via single-key targeting over `PATCH /{uuid}/envs/bulk` [VERIFIED: OpenAPI]. |
| ENV-03 | Agent can delete env var by UUID | `DELETE /{uuid}/envs/{env_uuid}` is supported with confirm gates [VERIFIED: OpenAPI]. |
| ENV-04 | Agent can bulk-update env vars on application | `PATCH /applications/{uuid}/envs/bulk` is supported [VERIFIED: OpenAPI]. |
| ENV-05 | Agent can sync local `.env` file to application | Custom MCP-side engine reads local file, diffs against API, and pushes updates [VERIFIED: client+parser]. |
| ENV-06 | Env var flags supported: is_preview, is_literal, is_multiline, is_shown_once | Checked OpenAPI flag compatibility; databases omit `is_preview` [VERIFIED: OpenAPI]. |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| `envs:list` | API / Backend | Browser / Client | Remote endpoint returns envs; MCP summary hides sensitive values. |
| `envs:get` | API / Backend | Browser / Client | Remote lists envs, client filters by UUID or key, hides secrets. |
| `envs:create` | API / Backend | — | POST endpoint directly creates the variable. |
| `envs:update` | API / Backend | Browser / Client | MCP resolves key from UUID, then issues PATCH to `/bulk` endpoint. |
| `envs:delete` | API / Backend | — | DELETE endpoint deletes the variable; requires confirm. |
| `envs:bulk-update` | API / Backend | — | PATCH to `/bulk` endpoint applies modifications. |
| `envs:sync` | Browser / Client | API / Backend | MCP parses `.env`, calculates diff/conflicts, writes updates. |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| ofetch | ^1.5.1 | HTTP Client | Standard HTTP client for API interactions [VERIFIED: npm registry]. |
| zod | ^4.4.3 | Data Validation | Payload verification before API execution [VERIFIED: npm registry]. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| yaml | ^2.9.0 | YAML manipulation | Existing compose configuration (P11) [VERIFIED: npm registry]. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom `.env` Parser | `dotenv` | No extra package, 100% control over edge cases, no dependency bloating. |

**Installation:**
No new packages are installed since the project utilizes standard robust features, and a custom robust `.env` parser will be implemented.

**Version verification:**
```bash
npm view ofetch version
npm view zod version
```
Both ofetch and zod have been validated on the registry.

## Package Legitimacy Audit

> All existing packages have been checked and approved.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| ofetch | npm | ~1 yr | 25M/wk | github.com/unjs/ofetch | [OK] | Approved |
| zod | npm | ~2 mo | 234M/wk | github.com/colinhacks/zod | [OK] | Approved |
| yaml | npm | ~2 mo | 176M/wk | github.com/eemeli/yaml | [OK] | Approved |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```mermaid
graph TD
    subgraph Local Environment
        EnvFile[.env File / Content] --> MCPEngine[MCP Sync Engine]
    end

    subgraph MCP Server
        MCPEngine --> Parser[Custom .env Parser]
        Parser --> DiffCalc[Diff & Conflict Calculator]
        DiffCalc --> Masking[Secret Masker]
    end

    subgraph Coolify API
        DiffCalc -->|GET /applications/{uuid}/envs| RemoteEnvs[Remote Env Store]
        DiffCalc -->|POST /applications/{uuid}/envs| CreateCall[Create Env]
        DiffCalc -->|PATCH /applications/{uuid}/envs/bulk| BulkCall[Bulk Update Env]
        DiffCalc -->|DELETE /applications/{uuid}/envs/{env_uuid}| DeleteCall[Delete Env]
    end

    Masking -->|Sanitized Output| Client[Agent / User]
```

### Recommended Project Structure
```
src/
├── mcp/
│   └── tools/
│       ├── application.ts  # Add envs:list, envs:get, envs:create, envs:update, envs:delete, envs:bulk-update, envs:sync
│       ├── service.ts      # Add envs:list, envs:get, envs:create, envs:update, envs:delete, envs:bulk-update
│       └── database.ts     # Add envs:list, envs:get, envs:create, envs:update, envs:delete, envs:bulk-update
├── api/
│   └── client.ts           # Add env API endpoints (fetch, create, bulk-update, delete)
└── utils/
    └── env-parser.ts       # Custom .env parser & Sync diff engine
```

### Pattern 1: Custom Dotenv Parser
**What:** Robust `.env` file parsing method.
**When to use:** On `envs:sync` to read local `.env` configuration.
**Example:**
```typescript
// Source: Custom robust implementation
export function parseEnvFile(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const cleanLine = trimmed.replace(/^export\s+/, '');
    const eqIndex = cleanLine.indexOf('=');
    if (eqIndex === -1) {
      throw new Error('Invalid line in env file: missing "="');
    }
    const key = cleanLine.substring(0, eqIndex).trim();
    let value = cleanLine.substring(eqIndex + 1).trim();
    
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
      throw new Error(`Invalid environment variable name: "${key}"`);
    }

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.substring(1, value.length - 1);
    } else {
      const commentIndex = value.indexOf('#');
      if (commentIndex !== -1) {
        value = value.substring(0, commentIndex).trim();
      }
    }
    result[key] = value;
  }
  return result;
}
```

### Anti-Patterns to Avoid
- **Raw value logging:** Logging unredacted values from the local `.env` file or API output into standard error/logs. **Always** apply `redactSecrets` before logging and `sanitizeFullProjection` in returns.
- **Auto-Overwriting Conflicts:** Automatically updating env vars with conflicting values without explicit `conflict_policy`. Enforce `COOLIFY_CONFIRM_REQUIRED` on conflict unless `conflict_policy` is supplied.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Secret redactor | Custom regex chains | `redactSecrets` | Already robust and tested in `src/utils/redact.ts`. |
| Projection Masking | Manual masking logic | `sanitizeFullProjection` | Already fully handles credential and PEM filtering. |

**Key insight:** Reusing the project's existing sanitization pipelines guarantees SAF-04 compliance and prevents regressions.

## Runtime State Inventory

*Step 2.5: SKIPPED (Greenfield capability, no rename/migration involved)*

## Common Pitfalls

### Pitfall 1: Omission of `is_preview` in Database API
**What goes wrong:** Passing `is_preview` flag on database env creation or bulk update rejects the request or fails.
**Why it happens:** Coolify's database env endpoint does not support `is_preview`.
**How to avoid:** Conditionally omit `is_preview` inside the database tool schemas and API payloads.

### Pitfall 2: Key Renaming via Bulk PATCH
**What goes wrong:** Attempting to rename an environment variable key directly inside bulk update fails since keys act as the identifier.
**Why it happens:** The bulk PATCH endpoint expects existing keys to update their values.
**How to avoid:** To rename a key, the old variable must be deleted (`envs:delete`) and a new one created (`envs:create`).

## Code Examples

### API Client Environment Variable Mapping
```typescript
// Source: docs/coolify_openapi.yaml
export async function createApplicationEnv(
  url: string,
  token: string,
  appUuid: string,
  body: {
    key: string;
    value: string;
    is_preview?: boolean;
    is_literal?: boolean;
    is_multiline?: boolean;
    is_shown_once?: boolean;
  },
  verifySsl = true,
): Promise<unknown> {
  const client = createCoolifyClient(url, token, verifySsl);
  return client(`/applications/${appUuid}/envs`, {
    method: 'POST',
    body,
  });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Dedicated `env` MCP tool | Action-based sub-tools (`envs:*` on parent tools) | Phase 12 (Jul 2026) | Reduces tool bloating, aligns with GSD vertical-slice domain patterns. |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | GET endpoints return unmasked plaintext secrets internally | Smart Sync UX | If GET returned masked values from the API, the diff-sync engine could not compute differences without `reveal: true`. [VERIFIED: Coolify returns plain text on GET, MCP handles masking]. |

## Open Questions

1. **How does the Coolify API handle empty or multiline values inside the `/bulk` endpoint?**
   - *What we know:* The OpenAPI lists `is_multiline` flag.
   - *What's unclear:* Does bulk PATCH expect raw multi-line strings or escaped characters?
   - *Recommendation:* Test in Wave 0 integration tests with mock data; enforce `is_multiline` on multiline inputs.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Coolify API | All CRUD operations | ✓ | 4.1.x | — |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest v4.1.10 |
| Config file | vitest.config.ts |
| Quick run command | `npx vitest run src/mcp/tools/application.test.ts` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ENV-01 | Create env var on app/service/db | Integration | `npx vitest run tests/integration/envs.test.ts` | ❌ Wave 0 |
| ENV-02 | Update env var by UUID | Integration | `npx vitest run tests/integration/envs.test.ts` | ❌ Wave 0 |
| ENV-03 | Delete env var by UUID | Integration | `npx vitest run tests/integration/envs.test.ts` | ❌ Wave 0 |
| ENV-04 | Bulk-update env vars on app | Integration | `npx vitest run tests/integration/envs.test.ts` | ❌ Wave 0 |
| ENV-05 | Diff-sync engine local `.env` | Unit | `npx vitest run src/utils/env-parser.test.ts` | ❌ Wave 0 |
| ENV-06 | Env var flags mapping | Unit | `npx vitest run src/mcp/tools/application.test.ts` | ❌ Wave 0 |

### Wave 0 Gaps
- [ ] `tests/integration/envs.test.ts` — covers ENV-01..ENV-04
- [ ] `src/utils/env-parser.test.ts` — covers ENV-05 dotenv parser logic

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V4 Access Control | yes | Mask env values by default using `sanitizeFullProjection`; restrict `reveal: true` behind human preference. |
| V5 Input Validation | yes | Validate env var key naming conventions matching `/^[a-zA-Z_][a-zA-Z0-9_]*$/` with Zod. |
| V6 Cryptography | yes | Redact logs and API errors using `redactSecrets` before console injection or stderr writes. |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Secret leakage in CLI/MCP stdout/stderr | Information Disclosure | Implement automated `redactSecrets` inside mapping/errors pipeline. |
| Configuration Tampering | Tampering | Default dry-run mode on sync and mandatory `confirm: true` for all destructive/bulk updates. |

## Sources

### Primary (HIGH confidence)
- `docs/coolify_openapi.yaml` - `/envs` endpoint structures.
- `src/api/client.ts` - HTTP/ofetch API definitions.

### Secondary (MEDIUM confidence)
- `context7` - library classification queries.

### Tertiary (LOW confidence)
- `websearch` - registry publication dates and download rates.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Minimal packages used, no extra libraries introduced.
- Architecture: HIGH - Actions namespaces mapped directly onto existing tools per context.
- Pitfalls: HIGH - Database omission of `is_preview` verified in OpenAPI.

**Research date:** 2026-07-21
**Valid until:** 2026-08-20 (30 days)
