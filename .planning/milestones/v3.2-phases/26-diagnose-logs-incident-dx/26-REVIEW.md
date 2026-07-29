---
phase: 26-diagnose-logs-incident-dx
reviewed: 2026-07-28T03:17:00Z
depth: standard
files_reviewed: 6
files_reviewed_list:
  - src/mcp/tools/diagnose.ts
  - src/utils/log-helpers.ts
  - src/mcp/tools/application.ts
  - src/mcp/capabilities.ts
  - src/mcp/prompts.ts
  - skills/coolify-setup/SKILL.md
findings:
  critical: 0
  warning: 2
  info: 2
  total: 4
status: issues_found
---

# Phase 26: Code Review Report

**Reviewed:** 2026-07-28T03:17:00Z
**Depth:** standard
**Files Reviewed:** 6
**Status:** issues_found

## Summary

Reviewed Phase 26 production surfaces for `diagnose.logs`: composite handler + schema in `diagnose.ts`, `buildRuntimeLogPayload` extraction in `log-helpers.ts` / `application.ts`, `diagnose_logs` capability, incident/diagnose prompt copy, and coolify-setup troubleshooting skill.

Core composition (XOR runtime vs build, `mode` full/logs-only, soft-partial `diagnose_failed`, empty-runtime hint, OBS-03 helper extraction) is coherent and matches locked CONTEXT decisions. Two warnings: soft-partial error messages skip the `wrapMcpError` redaction path, and the logs-identity refine message omits the valid `deployment_uuid` alternative.

## Narrative Findings (AI reviewer)

## Warnings

### WR-01: Soft-partial `diagnose_failed` skips secret redaction

**File:** `src/mcp/tools/diagnose.ts:543-547`
**Issue:** When `mode:full` triage fails, the catch path embeds `envelope.message` into a successful `buildReadResponse` without `redactSecrets`. The total-failure path uses `wrapMcpError`, which always redacts `message` / hints / data. Soft-partial therefore bypasses the project's defense-in-depth redaction layer. API-mapped errors often already pass `sanitizeMessage`, but directly constructed `CoolifyApiError` envelopes and any unsanitized remainder can leak token-shaped strings into `data.diagnose_failed.message` (and thus MCP structured content). Sibling soft-error paths in `service.ts` / `database.ts` call `redactSecrets` explicitly.
**Fix:**
```typescript
import { redactSecrets } from '../../utils/redact.js';

// inside catch:
diagnose_failed = {
  code: envelope.code,
  message: redactSecrets(envelope.message),
};
```

### WR-02: Missing-identifier refine message omits `deployment_uuid`

**File:** `src/mcp/tools/diagnose.ts:206-212`
**Issue:** Refine rejects `action:logs` when neither a runtime identifier nor `deployment_uuid` is set, but the issue text only says runtime identifiers are required: `At least one identifier (query|uuid|name|domain) required for action logs`. Schema and catalog correctly allow build-only calls via `deployment_uuid` alone. Agents following the refine message (or action-aware recovery hints built from it) get a misleading recovery path and may never discover the XOR build-logs option.
**Fix:**
```typescript
ctx.addIssue({
  code: 'custom',
  message:
    'Provide a runtime identifier (query|uuid|name|domain) or deployment_uuid for action logs',
  params: { code: 'COOLIFY_422' },
});
```
Update the matching assertion in `src/mcp/tools/diagnose.test.ts` (`schema rejects logs action without identifier`).

## Info

### IN-01: Runtime log payload type omits optional `hint`

**File:** `src/mcp/tools/diagnose.ts:278-284`, `src/mcp/tools/diagnose.ts:594-596`
**Issue:** `DiagnoseLogsResult.logs` is typed as `ReturnType<typeof buildRuntimeLogPayload> | ReturnType<typeof processDeploymentBuildLogs>`. Runtime empty-tail attaches `hint: EMPTY_RUNTIME_LOGS_HINT`, but `buildRuntimeLogPayload`'s return type has no `hint`. Works at runtime; TypeScript/docs drift for consumers and future refactors.
**Fix:** Extend `buildRuntimeLogPayload` return type with `hint?: string`, or define an explicit `RuntimeLogPayload` type used by both the helper and `DiagnoseLogsResult`.

### IN-02: `page` / `per_page` accepted on `logs` but unused

**File:** `src/mcp/tools/diagnose.ts:168-180` (via `...diagnoseReadParamKeys`)
**Issue:** `logs` actionAllowedFields inherits `page` / `per_page` from shared diagnose read keys. `handleDiagnoseLogs` never paginates; schema accepts them with no effect. Same shared-key pattern exists on other diagnose actions, but on a log-tail composite it is especially easy for agents to assume pagination applies.
**Fix:** Drop `page` and `per_page` from the `logs` allowed-fields list (keep `format` / `max_chars` / `projection` / `include_full` / `reveal` as needed for the diagnose half).

---

_Reviewed: 2026-07-28T03:17:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
