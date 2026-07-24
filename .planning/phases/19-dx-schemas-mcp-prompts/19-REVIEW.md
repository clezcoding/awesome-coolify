---
phase: 19-dx-schemas-mcp-prompts
reviewed: 2026-07-24T01:38:00Z
depth: standard
files_reviewed: 21
files_reviewed_list:
  - src/mcp/tools/shared-read-params.ts
  - src/mcp/tools/system.ts
  - src/mcp/tools/resource.ts
  - src/mcp/tools/docs.ts
  - src/mcp/tools/meta.ts
  - src/mcp/tools/diagnose.ts
  - src/mcp/tools/deployment.ts
  - src/mcp/tools/instance.ts
  - src/mcp/tools/manifest.ts
  - src/mcp/tools/application.ts
  - src/mcp/tools/service.ts
  - src/mcp/tools/database.ts
  - src/mcp/tools/private_key.ts
  - src/mcp/tools/server.ts
  - src/mcp/tools/project.ts
  - src/mcp/tools/environment.ts
  - src/mcp/tools/emergency.ts
  - src/mcp/prompts.ts
  - src/mcp/server.ts
  - tests/mcp/prompts.test.ts
  - src/mcp/server.test.ts
findings:
  critical: 1
  warning: 5
  info: 2
  total: 8
status: issues_found
---

# Phase 19: Code Review Report

**Reviewed:** 2026-07-24T01:38:00Z
**Depth:** standard
**Files Reviewed:** 21
**Status:** issues_found

## Summary

Phase 19 flat-schema migration and prompts wiring are structurally sound: `createFlatActionSchema` enforces per-action allowed/required keys, Zod v4 keeps refinements after `withInstanceRoutingSchema` `.extend()`, confirm gates remain at prior layers, and `registerCoolifyPrompts` matches D-13/D-14/D-16. Primary defects are agent-facing catalog/schema mismatches that will cause failed tool calls when agents follow the new DX-01 descriptions, plus incomplete catalogs and a few validation regressions from flat-shape field merging.

## Critical Issues

### CR-01: Actions catalogs advertise wrong env-mutation parameter names

**File:** `src/mcp/tools/application.ts:301-302`
**Also:** `src/mcp/tools/service.ts:271-272`
**Issue:** Hand-maintained catalogs (wired into every tool description via `composeToolDescription`) document parameters that the flat schemas reject:

- `applicationActionsCatalog` / `serviceActionsCatalog`: `envs:delete(uuid, key, confirm)` — schema requires `env_uuid` and rejects `key` (`actionRequiredFields['envs:delete'] = ['env_uuid']`; `key` absent from allowed fields).
- `applicationActionsCatalog`: `envs:bulk-update(uuid, envs, confirm)` — schema field is `entries`; `.strict()` rejects `envs` with `Unrecognized key: "envs"`.

Agents that follow the DX-01 catalog text will emit invalid payloads and get `COOLIFY_VALIDATION_ERROR`. Pre-migration schemas already used `env_uuid` / `entries`; the new catalogs introduced the wrong names.

**Fix:**
```typescript
// application.ts / service.ts catalogs — align with schema field names:
'… · envs:delete(uuid, env_uuid, confirm) · envs:bulk-update(uuid, entries, confirm) · …'
```

## Warnings

### WR-01: applicationActionsCatalog omits CRUD lifecycle actions

**File:** `src/mcp/tools/application.ts:301-302`
**Issue:** Catalog tokens cover get/start/stop/restart/deploy/logs/envs:* only. Schema enum includes `create`, `update`, `delete`, `delete_preview`, but those actions never appear as catalog entries (D-05: one entry per action). Agents reading the description may miss application create/update/delete despite them existing in the action enum.

**Fix:** Append concrete tokens, e.g. `create(source_type, server_uuid) · update(uuid) · delete(uuid, confirm) · delete_preview(uuid)`, wrapping at ≤120 chars with `· ` continuations per UI-SPEC.

### WR-02: databaseActionsCatalog uses wildcard stubs instead of concrete actions

**File:** `src/mcp/tools/database.ts:224-225`
**Issue:** Catalog ends with `envs:* · backup:*`. Schema registers many concrete actions (`envs:list`…`envs:bulk-update`, `backup:create`…`backup:now`). D-05 requires `action(param…)` tokens; wildcards hide confirm-gated and required-field guidance from the description surface.

**Fix:** Expand to explicit tokens for each env/backup action (1–3 key params each), matching `serviceActionsCatalog` / `applicationActionsCatalog` style.

### WR-03: Flat log-param merge weakens logs validation (format + max_chars)

**File:** `src/mcp/tools/shared-read-params.ts:322-349`
**Also:** `src/mcp/tools/application.ts:345-437`
**Issue:**

1. `sharedLogParamsFlatShape.max_chars` uses `.min(1)` while legacy `sharedLogParamsSchema.max_chars` used `.min(1000)`.
2. In `applicationActionSchema`, shape spreads end with `mutationResponseParamsFlatShape`, whose `format` enum is `pretty|json|table`. That overwrites the log-specific `pretty|json` constraint. Result: `application({ action: "logs", uuid, format: "table", max_chars: 500 })` parses successfully — a regression vs pre-migration `applicationLogsSchema`.

**Fix:** Keep a dedicated log format/max_chars in the flat shape (or exclude `format`/`max_chars` from the mutation spread for logs via per-action refine). Restore `max_chars.min(1000)` on log fields; reject `format: "table"` for `action === "logs"` in `extraRefine`.

### WR-04: composeToolDescription spacing violates UI-SPEC blank-line anatomy

**File:** `src/mcp/server.ts:165-171`
**Issue:** UI-SPEC requires a blank line between purpose sentence and `Actions:` catalog, and between catalog and `Safety:` footer. Implementation joins with single `\n`, so Cursor descriptions are denser than the approved contract.

**Fix:**
```typescript
function composeToolDescription(
  purpose: string,
  catalog: string,
  footer: string,
): string {
  return `${purpose}\n\n${catalog}\n\n${footer}`;
}
```

### WR-05: manifest validation path drops action-aware recoveryHints

**File:** `src/mcp/tools/manifest.ts:88-97`
**Issue:** `parseManifestAction` uses `manifestActionSchema.safeParse` and always attaches generic `RECOVERY_HINTS.COOLIFY_VALIDATION_ERROR`. Symbol metadata from `createFlatActionSchema` is never read. Other domain tools get action-specific required/optional field hints via `parseWithInstanceRouting` (D-04). Manifest upsert/set/remove failures therefore give weaker recovery guidance.

**Fix:** Route through `parseWithInstanceRouting(manifestActionSchema, args)` (or call the same `buildActionAwareRecoveryHints` path), preserving the in-schema `instance` field for sync/diff.

## Info

### IN-01: Duplicate dockercompose reject in application create refine

**File:** `src/mcp/tools/application.ts:690-692`
**Issue:** `rejectDockercomposeBuildPack(data, ctx)` is invoked twice when `build_pack === 'dockercompose'` (once unconditionally for that value via the function’s internal check, then again inside an identical `if`). Harmless duplicate issue emission.
**Fix:** Keep a single call: `rejectDockercomposeBuildPack(data, ctx);`

### IN-02: Prompt/server tests depend on private MCP SDK fields

**File:** `tests/mcp/prompts.test.ts:11-18`
**Also:** `src/mcp/server.test.ts:233-237`
**Issue:** Tests cast to `_registeredPrompts` / `_registeredTools`. Documented as intentional (SDK lacks public list helpers). Fragile if SDK renames internals.
**Fix:** Keep as-is for now; add a short comment linking to SUMMARY decision, or wrap access in a tiny test helper with a single cast site.

---

_Reviewed: 2026-07-24T01:38:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
