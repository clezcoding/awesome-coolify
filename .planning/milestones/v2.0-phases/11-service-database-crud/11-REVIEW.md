---
phase: 11-service-database-crud
reviewed: 2026-07-19T07:35:00Z
depth: standard
files_reviewed: 9
files_reviewed_list:
  - src/api/client.test.ts
  - src/api/client.ts
  - src/mcp/server.ts
  - src/mcp/tools/database.test.ts
  - src/mcp/tools/database.ts
  - src/mcp/tools/service.test.ts
  - src/mcp/tools/service.ts
  - src/utils/yaml-validator.test.ts
  - src/utils/yaml-validator.ts
findings:
  critical: 1
  warning: 3
  info: 2
  total: 6
status: issues_found
---

# Phase 11: Code Review Report

**Reviewed:** 2026-07-19T07:35:00Z
**Depth:** standard
**Files Reviewed:** 9
**Status:** issues_found

## Summary

Phase 11 CRUD surface is largely solid: confirm gates fail closed (`confirm === true` / Zod `is_public` refine), `compose_file` path traversal is blocked via `realpathSync` + cwd prefix, client wrappers match Coolify routes, and DB credential fields are masked via `sanitizeFullProjection` for key/URL patterns. Main gap: decoded `compose` YAML bypasses `reveal:false` masking despite product requirement to mask compose bodies. Secondary gaps: compose size limits (post-read / missing for inline) and silent invalid-base64 decode.

## Critical Issues

### CR-01: Decoded `compose` YAML leaks secrets when `reveal:false`

**File:** `src/mcp/tools/service.ts:1017-1022`, `src/mcp/tools/service.ts:1170-1188`, `src/mcp/tools/service.ts:829-860`
**Issue:** `projectServiceCompose` exposes plaintext `compose` before/alongside `sanitizeFullProjection`. `sanitizeFullProjection` only masks keys matching `password|token|secret|private|env` / `*_db_url` / credential URIs — the `compose` key never matches, so env passwords and secrets inside Docker Compose YAML are returned on full get/update (and create success) even when `reveal` is false. This violates `mcp_features.md` (“Credentials in Full-Payloads maskieren … compose bodies”) and the tool description’s reveal contract.
**Fix:** Treat `compose` as sensitive unless `reveal:true`. Example:

```typescript
function maskComposeIfNeeded(
  projected: Record<string, unknown>,
  reveal: boolean,
): Record<string, unknown> {
  if (reveal || typeof projected.compose !== 'string') return projected;
  return { ...projected, compose: '***' };
}

// get / update:
const projected = projectServiceCompose(rawRecord);
const data = sanitizeFullProjection(
  maskComposeIfNeeded(projected, parsed.reveal),
  parsed.reveal,
) as Record<string, unknown>;

// create: either omit compose, or gate on a reveal flag
```

Prefer masking the whole field (simple, matches other secrets) or scrubbing `environment:` / `*PASSWORD*` values inside YAML if agents must still see structure without secrets.

## Warnings

### WR-01: `compose_file` size limit enforced only after full read

**File:** `src/mcp/tools/service.ts:748`, `src/mcp/tools/service.ts:764-771`, `src/mcp/tools/service.ts:957-964`
**Issue:** `readBoundedComposeFile` calls `readFileSync(realPath, 'utf8')` with no pre-check. The 1 MiB limit runs only after the entire file is loaded. A huge `.yml` inside the allowlisted cwd (or symlink to a large in-tree file) can OOM / stall the MCP process before validation rejects it.
**Fix:** Stat (or open + fstat) before reading; reject if `size > COMPOSE_FILE_SIZE_LIMIT`, then read:

```typescript
import { openSync, readFileSync, fstatSync, closeSync } from 'node:fs';

function readBoundedComposeFile(composeFilePath: string): string {
  // ... existing ext + realpath allowlist checks ...
  const fd = openSync(realPath, 'r');
  try {
    if (fstatSync(fd).size > COMPOSE_FILE_SIZE_LIMIT) {
      throw new CoolifyApiError({
        code: 'COOLIFY_VALIDATION_ERROR',
        message: 'compose_file exceeds 1 MiB limit',
        recoveryHints: RECOVERY_HINTS.COOLIFY_VALIDATION_ERROR,
      });
    }
    return readFileSync(fd, 'utf8');
  } finally {
    closeSync(fd);
  }
}
```

### WR-02: Inline `compose` has no size bound

**File:** `src/mcp/tools/service.ts:773-774`, `src/mcp/tools/service.ts:966-967`
**Issue:** `compose_file` is capped at 1 MiB, but inline `compose` is accepted at any length, base64-encoded, and POSTed. Agents can submit multi‑MB YAML and pressure memory / Coolify request size with no MCP-side guard.
**Fix:** Apply the same `COMPOSE_FILE_SIZE_LIMIT` to inline compose after resolution:

```typescript
if (composeYaml !== undefined) {
  if (Buffer.byteLength(composeYaml, 'utf8') > COMPOSE_FILE_SIZE_LIMIT) {
    throw new CoolifyApiError({
      code: 'COOLIFY_VALIDATION_ERROR',
      message: 'compose exceeds 1 MiB limit',
      recoveryHints: RECOVERY_HINTS.COOLIFY_VALIDATION_ERROR,
    });
  }
  // validateCompose + encodeCompose ...
}
```

### WR-03: Invalid `docker_compose_raw` base64 silently becomes empty `compose`

**File:** `src/utils/yaml-validator.ts:7-18`, `src/utils/yaml-validator.ts:44-45`
**Issue:** `decodeCompose` returns `''` for invalid base64 (and on decode failure) without signaling error. `projectServiceCompose` then replaces `docker_compose_raw` with `compose: ''`, so full get/update can look like “no compose” instead of “corrupt/undecodable compose,” hiding data-loss / API shape bugs.
**Fix:** Surface decode failure to callers:

```typescript
export function decodeCompose(base64: string): string | null {
  if (base64 === '') return '';
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) return null;
  try {
    return Buffer.from(base64, 'base64').toString('utf8');
  } catch {
    return null;
  }
}

export function projectServiceCompose(raw: Record<string, unknown>): Record<string, unknown> {
  const dockerComposeRaw = raw.docker_compose_raw;
  if (typeof dockerComposeRaw !== 'string' || dockerComposeRaw === '') return raw;
  const decoded = decodeCompose(dockerComposeRaw);
  if (decoded === null) {
    const result = { ...raw, compose_decode_error: 'invalid base64 in docker_compose_raw' };
    delete result.docker_compose_raw;
    return result;
  }
  const result = { ...raw, compose: decoded };
  delete result.docker_compose_raw;
  return result;
}
```

## Info

### IN-01: Public-access confirm message always says “create”

**File:** `src/mcp/tools/database.ts:170-181`
**Issue:** `requireConfirmForPublicAccess` message hard-codes “for database create” but the same refine runs on update (`updateDatabaseSchema` superRefine). Agents see a misleading action name on update confirm failures.
**Fix:** Parameterize the action name, e.g. `for database ${actionName}`.

### IN-02: Create success embeds unredacted start-failure `error` string

**File:** `src/mcp/tools/database.ts:904-914`, `src/mcp/tools/service.ts:872-884`
**Issue:** On `instant_deploy` follow-up start failure, `deploy.error` is set to raw `error.message` without `redactSecrets`. Unlikely to include DB passwords, but inconsistent with `wrapMcpError` redaction.
**Fix:** `error: redactSecrets(message)`.

---

_Reviewed: 2026-07-19T07:35:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
