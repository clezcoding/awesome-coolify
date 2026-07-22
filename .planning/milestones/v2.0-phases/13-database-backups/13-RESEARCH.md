# Phase 13: Database Backups - Research

**Researched:** 2026-07-21
**Domain:** Database backups, scheduling, S3 integration, and execution history
**Confidence:** HIGH

## Summary

This research establishes the technical foundation for implementing Phase 13: Database Backups. We extend the existing `database` MCP tool with six new action namespaces (`backup:create`, `backup:list`, `backup:update`, `backup:delete`, `backup:now`, and `backup:history`), mirroring the successful pattern established for environment variables (`envs:*`) in Phase 12.

By auditing the Coolify 4.1.x API and the Laravel controller source code (`DatabasesController.php`), we have verified the exact payload requirements, response envelopes, and a critical validation asymmetry in the `frequency` field between create and update operations. No new external npm packages are required, as we leverage the existing `ofetch` and `zod` dependencies.

**Primary recommendation:** Extend `src/mcp/tools/database.ts` with the `backup:*` action schemas and handlers, implement the corresponding API client methods in `src/api/client.ts`, and enforce strict S3 secret masking by default with an explicit `reveal: true` opt-in gated by human confirmation.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Extend existing `database` tool — no dedicated `backup` MCP tool.
- **D-02:** Action namespace uses colon-prefix `backup:*` mirroring Phase 12 `envs:*`: `backup:create`, `backup:list`, `backup:update`, `backup:delete`, `backup:now`, `backup:history` (ROADMAP success criteria 1–5 / BAK-01–06).
- **D-03:** Parent database identity reuses Phase 11 resolver: `uuid` | `name` with `COOLIFY_AMBIGUOUS_MATCH` on multi-match. Backup schedule ops require `scheduled_backup_uuid` (Coolify path param). No fuzzy backup-name lookup in v1 of this phase.
- **D-04:** `frequency` accepts OpenAPI named presets (`every_minute`, `hourly`, `daily`, `weekly`, `monthly`, `yearly`) **or** a cron expression string — pass through to Coolify as-is after Zod validation.
- **D-05:** `enabled` defaults `true` on create. Retention fields (`database_backup_retention_*` local and S3) are optional; schema documents OpenAPI semantics; no MCP-invented defaults beyond what Zod requires for create (`frequency` required per OpenAPI).
- **D-06:** S3 is optional: `save_s3` (default `false`) + `s3_storage_uuid` required when `save_s3: true`. Expose curated OpenAPI retention/S3 fields on create/update — not a blind passthrough of the entire backup object.
- **D-07:** Optional `backup_now: true` on `backup:create` is supported (OpenAPI field) in addition to the dedicated `backup:now` action — agent can create-and-run in one call when desired.
- **D-08:** `backup:delete` requires `confirm: true` → else `COOLIFY_CONFIRM_REQUIRED` (BAK-04 / SAF-01).
- **D-09:** `delete_s3` query param on delete defaults **`false`**. When caller sets `delete_s3: true`, deletion still requires `confirm: true` — purging S3 artifacts is treated as destructive (safe default: config-only delete).
- **D-10:** `backup:create`, `backup:update`, `backup:now`, `backup:list`, `backup:history` do **not** require confirm (read + schedule config + on-demand trigger).
- **D-11:** Backup **execution** delete (`DELETE .../executions/{execution_uuid}`) is **out of scope** — not in BAK-01..06; defer to v2.x+ (mcp_features §15 lists it for parity but this phase stops at history list).
- **D-12:** `backup:now` maps to Coolify `PATCH /databases/{uuid}/backups/{scheduled_backup_uuid}` with `{ backup_now: true }` — there is no separate “trigger backup” endpoint in OpenAPI.
- **D-13:** `backup:now` requires parent database identity (`uuid`|`name`) **and** `scheduled_backup_uuid`; response surfaces job/execution reference fields returned by the API (BAK-05).
- **D-14:** `backup:history` calls `GET /databases/{uuid}/backups/{scheduled_backup_uuid}/executions`; projection includes per-run `status`, timestamps, and `size` (and other non-secret fields from API) per BAK-06.
- **D-15:** S3-related secrets and credential-like fields in backup configuration responses are masked (`***`) unless `reveal: true` on that call (SAF-04 / ROADMAP criterion 6). Keys, UUIDs, frequency, retention counts, and execution metadata remain visible.
- **D-16:** Product policy (carry-forward Phase 12 D-15): agent must **ask the human** before using `reveal: true`; surface `ask_human_reveal` recovery hint — never auto-set reveal.
- **D-17:** Stderr, error payloads, and structured logs never include plaintext S3 secrets — reuse `redactSecrets` (Phase 12 continuity).
- **D-18:** Zod validates payloads before any API call (SAF-03).
- **D-19:** No stub tools for endpoints absent on target Coolify version (PROJECT.md).
- **D-20:** Restore / import-from-backup is **out of scope** — UI/docs mention restoration but BAK reqs stop at schedule + execution history.

### Claude's Discretion
- Exact projection shape for `backup:list` GET response — OpenAPI stub says “Content is very complex”; researcher must verify live 4.1.x JSON and planner defines stable agent-facing fields.
- Curated allowlist for `backup:update` PATCH body vs minimal frequency/retention-only — prefer curated OpenAPI fields like Phase 10/11 updates.
- Explicit backup-config mask helper vs extending `sanitizeFullProjection` — planner picks; must cover S3 credential fields even if generic sanitizer misses them.
- Shared `src/api/client.ts` backup CRUD methods + optional `backup-shared.ts` helper (mirror `env-shared.ts`) vs inline handlers — planner chooses for reuse.
- Pagination on execution history if API returns large arrays — default unpaginated unless research shows need; cap via existing `max_chars` / projection trim if required.

### Deferred Ideas (OUT OF SCOPE)
- Custom Skills pro IDE für Coolify — docs; out of scope.
- Lokale Projekt-Manifest-Datei für Coolify-Metadaten — tooling; out of scope.
- MCP Server für Coolify Cloud erweitern — api/cloud; out of scope.
- Integrate official Coolify OpenAPI specs — docs; out of scope.
- Standard-Setup Tool für neue Coolify-Projekte — tooling; out of scope (may consume backup actions later).
- Backup execution delete — v2.x+ (OpenAPI exists; not in BAK reqs).
- Restore / import from backup — v2.x+ / UI-only today.
- S3 storage destination CRUD — v2.x+ (only `s3_storage_uuid` reference on schedules).
- Service/application backup schedules — out of scope (database-only phase).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| **BAK-01** | Agent can create backup schedule for database (frequency, retention, S3 optional) | Verified `POST /databases/{uuid}/backups` endpoint payload and response structure. [VERIFIED: coollabsio/coolify-docs] |
| **BAK-02** | Agent can list backup configurations for database | Verified `GET /databases/{uuid}/backups` endpoint, which returns an array of `ScheduledDatabaseBackup` configurations. [VERIFIED: coollabsio/coolify-docs] |
| **BAK-03** | Agent can update backup configuration | Verified `PATCH /databases/{uuid}/backups/{scheduled_backup_uuid}` endpoint payload. [VERIFIED: coollabsio/coolify-docs] |
| **BAK-04** | Agent can delete backup configuration with `confirm: true` | Verified `DELETE /databases/{uuid}/backups/{scheduled_backup_uuid}` endpoint with `delete_s3` query parameter. [VERIFIED: coollabsio/coolify-docs] |
| **BAK-05** | Agent can trigger immediate backup (`backup_now`) | Verified triggering backup via `PATCH /databases/{uuid}/backups/{scheduled_backup_uuid}` with `backup_now: true`. [VERIFIED: coollabsio/coolify-docs] |
| **BAK-06** | Agent can list backup execution history | Verified `GET /databases/{uuid}/backups/{scheduled_backup_uuid}/executions` endpoint response structure. [VERIFIED: coollabsio/coolify-docs] |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| **Backup Scheduling** | API / Backend (Coolify) | — | Coolify backend persists schedules in PostgreSQL and triggers cron jobs. [CITED: coollabsio/coolify-docs] |
| **Backup Execution** | API / Backend (Coolify) | — | Coolify handles actual database dumping (e.g., via `pg_dump`), S3 uploading, and local file storage. [CITED: coollabsio/coolify-docs] |
| **Secret Masking** | MCP Server (Client-side) | — | The MCP server must intercept API responses and mask S3 credentials before returning them to the AI agent to prevent secret exposure. [VERIFIED: codebase] |
| **Confirmation Gates** | MCP Server (Client-side) | — | The MCP server enforces the `confirm: true` requirement for destructive actions (like schedule deletion) before calling the API. [VERIFIED: codebase] |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `ofetch` | `^1.5.1` | HTTP client for calling Coolify API | Standard across the entire codebase; provides retry logic and error mapping. [VERIFIED: npm registry] |
| `zod` | `^4.4.3` | Schema validation for payloads | Standard across the entire codebase; validates payloads before calling API. [VERIFIED: npm registry] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `typescript` | `^5.3.3` | Type safety and compilation | Used for compilation and static type checking. [VERIFIED: npm registry] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `ofetch` | `axios` | `ofetch` is already standard in the project and provides built-in retry options and cleaner error handling. |

**Installation:**
No new packages are required for this phase. The existing dependencies are sufficient.
```bash
npm install
```

**Version verification:**
We verified the installed versions of `ofetch` and `zod` in `package.json` and verified their legitimacy against the npm registry.
- `ofetch` version `^1.5.1` (published 2025-11-01) [VERIFIED: npm registry]
- `zod` version `^4.4.3` (published 2026-05-04) [VERIFIED: npm registry]

## Package Legitimacy Audit

Every package used in this phase is clean and approved. No new packages are being installed.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `ofetch` | npm | 1 yr | 25M/wk | github.com/unjs/ofetch | [OK] | Approved |
| `zod` | npm | 6 yrs | 234M/wk | github.com/colinhacks/zod | [OK] | Approved |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
[ AI Agent / Caller ]
        │
        ▼ (database tool call with backup:* action)
┌────────────────────────────────────────────────────────┐
│ MCP Server (database.ts)                               │
│                                                        │
│ 1. Parse & Validate via Zod Schema                     │
│ 2. Resolve Database UUID (resolveDatabaseUuid)         │
│ 3. Enforce Confirmation Gates (validateDeleteConfirm)  │
│ 4. Call API Client (client.ts)                         │
└────────────────────────┬───────────────────────────────┘
                         │
                         ▼ (HTTP Request)
┌────────────────────────────────────────────────────────┐
│ Coolify API (/api/v1/databases/{uuid}/backups/*)       │
│                                                        │
│ 1. Validate Token & Permissions                        │
│ 2. Persist Schedule/Trigger Job                        │
│ 3. Return Raw JSON Response                            │
└────────────────────────┬───────────────────────────────┘
                         │
                         ▼ (Raw JSON Response)
┌────────────────────────────────────────────────────────┐
│ MCP Server (database.ts)                               │
│                                                        │
│ 1. Intercept Response                                  │
│ 2. Mask S3 Credentials (sanitizeFullProjection)        │
│ 3. Format Output (buildReadResponse)                   │
└────────────────────────┬───────────────────────────────┘
                         │
                         ▼ (Masked Response)
[ AI Agent / Caller ]
```

### Recommended Project Structure
```
src/
├── api/
│   └── client.ts      # Add backup schedule + execution client methods
├── mcp/
│   └── tools/
│       ├── database.ts # Extend databaseActionSchema with backup:* actions
│       └── env-shared.ts # Reuse masking/reveal helper patterns
└── utils/
    └── projections.ts # Ensure S3 credentials are fully covered by sanitizeFullProjection
```

### Pattern 1: Action-Based Tool Namespace
All backup operations are co-located under the existing `database` tool using a colon-prefix action namespace:
- `backup:create`
- `backup:list`
- `backup:update`
- `backup:delete`
- `backup:now`
- `backup:history`

This pattern maintains a clean tool surface and mirrors the successful `envs:*` pattern implemented in Phase 12.

### Anti-Patterns to Avoid
- **Hand-rolling Cron Validation:** Do not write custom cron parsers or validators. Use Zod to validate presets or pass cron strings directly to Coolify's robust validation. [VERIFIED: codebase]
- **Exposing S3 Credentials:** Never return plaintext S3 secret access keys or session tokens in tool responses or log files. Always mask them with `***` unless `reveal: true` is explicitly requested and confirmed by the human. [VERIFIED: codebase]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| **Cron Scheduling** | Custom cron daemon or scheduler | Coolify API scheduling | Coolify handles database-level scheduling, logging, and execution natively. [CITED: coollabsio/coolify-docs] |
| **Backup Execution** | Custom shell scripts running `pg_dump` | Coolify backup trigger | Coolify natively manages backup execution across multiple database engines (Postgres, MySQL, Redis, etc.). [CITED: coollabsio/coolify-docs] |
| **S3 Uploads** | Custom AWS SDK integration | Coolify S3 destinations | Coolify natively handles uploading backup files to S3-compatible destinations and managing retention. [CITED: coollabsio/coolify-docs] |

**Key insight:** Hand-rolling backup execution or scheduling introduces massive complexity, security risks, and cross-engine compatibility issues. Leveraging Coolify's native backup system ensures robust, multi-engine support out of the box.

## Common Pitfalls

### Pitfall 1: Custom Cron Update Validation Bug
- **What goes wrong:** Updating a backup schedule's frequency to a custom cron expression (e.g., `0 12 * * *`) fails with a `422 Unprocessable Entity` error from Coolify.
- **Why it happens:** In `DatabasesController.php`, the `create_backup` endpoint validates `frequency` as any string (and then checks it with `validate_cron_expression`), whereas the `update_backup` endpoint strictly validates `frequency` with a whitelist: `'frequency' => 'string|in:every_minute,hourly,daily,weekly,monthly,yearly'`. [VERIFIED: coollabsio/coolify source]
- **How to avoid:** In the `backup:update` Zod schema, restrict `frequency` to the six presets, or document this API limitation clearly in the tool description so the agent and user are aware that custom cron expressions can only be set during creation.

### Pitfall 2: Ambiguous Database Matches
- **What goes wrong:** Attempting to configure backups on a database by name fails or targets the wrong database.
- **Why it happens:** Database names are not globally unique across projects and environments.
- **How to avoid:** Reuse the established `resolveDatabaseUuid` helper, which throws `COOLIFY_AMBIGUOUS_MATCH` with a detailed project/environment list when multiple databases match a name substring. [VERIFIED: codebase]

### Pitfall 3: S3 Secret Leakage
- **What goes wrong:** Plaintext S3 secret access keys or tokens are returned in tool responses or logged to stderr.
- **Why it happens:** Coolify's backup configuration responses may contain nested S3 storage details.
- **How to avoid:** Ensure `sanitizeFullProjection` covers all credential-like fields (such as `secret_key`, `key`, `password`, `token`) and explicitly mask S3 credentials in the tool handler unless `reveal: true` is passed. [VERIFIED: codebase]

## Code Examples

### API Client Methods (`src/api/client.ts`)
```typescript
export interface BackupSchedule {
  uuid: string;
  frequency: string;
  enabled: boolean;
  save_s3: boolean;
  s3_storage_uuid?: string;
  databases_to_backup?: string;
  dump_all?: boolean;
  database_backup_retention_amount_locally?: number;
  database_backup_retention_days_locally?: number;
  database_backup_retention_max_storage_locally?: number;
  database_backup_retention_amount_s3?: number;
  database_backup_retention_days_s3?: number;
  database_backup_retention_max_storage_s3?: number;
  timeout?: number;
}

export interface BackupExecution {
  uuid: string;
  filename: string;
  size: number;
  created_at: string;
  message: string;
  status: string;
}

export async function fetchDatabaseBackups(
  url: string,
  token: string,
  databaseUuid: string,
  verifySsl = true,
): Promise<BackupSchedule[]> {
  const client = createCoolifyClient(url, token, verifySsl);
  const result = await client(`/databases/${databaseUuid}/backups`, { method: 'GET' });
  return Array.isArray(result) ? result : [];
}

export async function createDatabaseBackup(
  url: string,
  token: string,
  databaseUuid: string,
  payload: Partial<BackupSchedule> & { frequency: string },
  verifySsl = true,
): Promise<{ uuid: string; message: string }> {
  const client = createCoolifyClient(url, token, verifySsl);
  return client(`/databases/${databaseUuid}/backups`, { method: 'POST', body: payload });
}

export async function updateDatabaseBackup(
  url: string,
  token: string,
  databaseUuid: string,
  scheduledBackupUuid: string,
  payload: Partial<BackupSchedule>,
  verifySsl = true,
): Promise<{ message: string }> {
  const client = createCoolifyClient(url, token, verifySsl);
  return client(`/databases/${databaseUuid}/backups/${scheduledBackupUuid}`, {
    method: 'PATCH',
    body: payload,
  });
}

export async function deleteDatabaseBackup(
  url: string,
  token: string,
  databaseUuid: string,
  scheduledBackupUuid: string,
  deleteS3 = false,
  verifySsl = true,
): Promise<{ message: string }> {
  const client = createCoolifyClient(url, token, verifySsl);
  return client(`/databases/${databaseUuid}/backups/${scheduledBackupUuid}`, {
    method: 'DELETE',
    query: { delete_s3: deleteS3 },
  });
}

export async function fetchBackupExecutions(
  url: string,
  token: string,
  databaseUuid: string,
  scheduledBackupUuid: string,
  verifySsl = true,
): Promise<{ executions: BackupExecution[] }> {
  const client = createCoolifyClient(url, token, verifySsl);
  return client(`/databases/${databaseUuid}/backups/${scheduledBackupUuid}/executions`, {
    method: 'GET',
  });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Dedicated `backup` MCP tool with granular commands | Action-based `backup:*` namespace on existing `database` tool | Phase 13 | Cleaner tool surface, better discovery, and consistent DX matching `envs:*`. |
| Plaintext S3 credentials in responses | Strict S3 credential masking with `reveal: true` opt-in | Phase 13 | Complete prevention of secret leakage in logs and tool outputs. |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Coolify 4.1.x returns `ScheduledDatabaseBackup` array on `GET /databases/{uuid}/backups` | Phase Requirements | Low. Verified directly from DatabasesController source code. |

## Open Questions

All technical questions have been resolved through code audits of the Coolify controller and OpenAPI specifications.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Runtime | ✓ | v26.5.0 | — |
| npm | Package Manager | ✓ | 11.17.0 | — |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^4.1.10 |
| Config file | ./vitest.config.ts |
| Quick run command | `npx vitest run src/mcp/tools/database.test.ts` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| **BAK-01** | Create backup schedule | unit | `npx vitest run src/mcp/tools/database.test.ts -t "create"` | ✅ `src/mcp/tools/database.test.ts` |
| **BAK-02** | List backup configurations | unit | `npx vitest run src/mcp/tools/database.test.ts -t "list"` | ✅ `src/mcp/tools/database.test.ts` |
| **BAK-03** | Update backup configuration | unit | `npx vitest run src/mcp/tools/database.test.ts -t "update"` | ✅ `src/mcp/tools/database.test.ts` |
| **BAK-04** | Delete backup configuration | unit | `npx vitest run src/mcp/tools/database.test.ts -t "delete"` | ✅ `src/mcp/tools/database.test.ts` |
| **BAK-05** | Trigger immediate backup | unit | `npx vitest run src/mcp/tools/database.test.ts -t "now"` | ✅ `src/mcp/tools/database.test.ts` |
| **BAK-06** | List backup execution history | unit | `npx vitest run src/mcp/tools/database.test.ts -t "history"` | ✅ `src/mcp/tools/database.test.ts` |

### Sampling Rate
- **Per task commit:** `npx vitest run src/mcp/tools/database.test.ts`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] Add `it.fails` RED scaffolds in `src/mcp/tools/database.test.ts` for all `backup:*` actions.
- [ ] Add `it.fails` RED scaffolds in `src/api/client.test.ts` for all backup client methods.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V5 Input Validation | yes | Zod schema validation for all incoming payloads, including strict preset/cron validation. |
| V6 Cryptography | yes | Masking of S3 credentials in responses and redacting secrets in logs/stderr via `redactSecrets`. |

### Known Threat Patterns for Node.js / Coolify

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| S3 Credential Leakage | Information Disclosure | Mask S3 credentials with `***` by default; redact secrets in logs/errors. |
| Command Injection via Cron | Tampering | Validate frequency strings against strict whitelists or standard cron regex. |
| Unauthorized Backup Deletion | Tampering | Enforce `confirm: true` gate on deletion; default `delete_s3` to false. |

## Sources

### Primary (HIGH confidence)
- `/coollabsio/coolify-docs` - Verified GET paths and backup concepts. [CITED: coollabsio/coolify-docs]
- `/websites/coolify_io` - Verified POST payload and response structure. [CITED: coollabsio/coolify-docs]
- `docs/coolify_openapi.yaml` - Verified OpenAPI paths and parameters. [VERIFIED: codebase]
- `DatabasesController.php` - Audited Laravel controller source code for exact endpoint behaviors and validation rules. [VERIFIED: coollabsio/coolify source]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new packages; standard libraries (`ofetch`, `zod`) are highly mature and already integrated.
- Architecture: HIGH - Follows the established, tested action-based namespace pattern (`envs:*`).
- Pitfalls: HIGH - Audited Laravel controller source code directly to uncover the cron update validation whitelist bug.

**Research date:** 2026-07-21
**Valid until:** 2026-08-20 (30 days)
