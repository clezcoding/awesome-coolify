---
phase: 24-capabilities-deployment-logs
reviewed: 2026-07-27T21:30:00Z
depth: standard
files_reviewed: 9
files_reviewed_list:
  - src/mcp/capabilities.ts
  - src/utils/package-version.ts
  - src/mcp/tools/system.ts
  - src/mcp/tools/meta.ts
  - src/utils/log-helpers.ts
  - src/mcp/tools/deployment.ts
  - src/mcp/tools/application.ts
  - src/utils/errors.ts
  - src/mcp/prompts.ts
findings:
  critical: 0
  warning: 3
  info: 2
  total: 5
status: issues_found
---

# Phase 24: Code Review Report

**Reviewed:** 2026-07-27T21:30:00Z
**Depth:** standard
**Files Reviewed:** 9
**Status:** issues_found

## Summary

Phase 24 adds capability discovery on `system.version`, package-backed `mcpVersion`, shared `processDeploymentBuildLogs`, and `deployment.logs` with XOR uuid resolution and `COOLIFY_NO_DEPLOYMENTS`. Core flows align with locked decisions (static capabilities table, coolifyVersion rename, soft empty logs, sensitive guard).

**Security (coolifyVersion / token leak):** `system.version` and `verify` return only derived fields — no raw `fetchVersion` payload, no env token in success paths. Tests assert formatted JSON excludes `COOLIFY_TOKEN`. `wrapMcpError` redacts secrets on failure paths.

**Gaps:** `deployment.logs` has `max_chars` default mismatch between log processor and response envelope; schema allows `format: table` contrary to D-15; `entries_shown` metadata can disagree with returned `logs_lines` after cap.

## Warnings

### WR-01: `deployment.logs` max_chars split — processor 20000 vs envelope 16000

**File:** `src/mcp/tools/deployment.ts:519-530`
**Issue:** `processDeploymentBuildLogs` uses `parsed.max_chars ?? 20000`, but `buildReadResponse` passes `parsed.max_chars` without the same fallback. When callers omit `max_chars` (flat schema has no Zod default), logs are capped at 20k inside the processor while formatted output truncates at `DEFAULT_MAX_CHARS` (16000). Large build logs can be silently cut again in `_formattedText` / `_meta`.
**Fix:**
```typescript
const maxChars = parsed.max_chars ?? 20000;
const logPayload = processDeploymentBuildLogs(deploymentUuid, rec, {
  lines: parsed.lines ?? 100,
  offset: parsed.offset ?? 0,
  include_hidden: parsed.include_hidden ?? false,
  type: parsed.type ?? 'all',
  max_chars: maxChars,
});
return buildReadResponse(logPayload, {
  format: parsed.format,
  max_chars: maxChars,
});
```

### WR-02: `deployment.logs` schema accepts `format: table` (D-15 violation)

**File:** `src/mcp/tools/deployment.ts:110-111,126-136`
**Issue:** `sharedReadParamsFlatShape` spreads after `sharedLogParamsFlatShape`, so `format` enum becomes `pretty | json | table`. `application.logs` explicitly rejects `table` in its superRefine; `deployment.logs` has no equivalent guard. D-15 requires pretty|json only for log actions.
**Fix:** Add to the existing `data.action === 'logs'` refine block in `deploymentToolSchema`:
```typescript
if (data.format === 'table') {
  ctx.addIssue({
    code: 'custom',
    message: 'format table is not supported for logs — use pretty or json',
    params: { code: 'COOLIFY_VALIDATION_ERROR' },
  });
}
```

### WR-03: `entries_shown` counts pre-slice entries, not returned lines

**File:** `src/utils/log-helpers.ts:141-157`
**Issue:** `entries_shown` is set to `visibleEntries.length` before `sliceLogBlob` and `capLogOutput` reduce `logs_lines`. Agents comparing `entries_shown` to `logs_lines.length` after `lines`/`offset`/`max_chars` can misread truncation. Plain-text fallback sets `entries_shown: allLines.length` (post-slice, pre-cap filter) — same class of inconsistency.
**Fix:** Derive `entries_shown` from `cappedLines.length` (or document that it means “entries after filter” not “lines returned”). Example:
```typescript
return {
  ...
  entries_shown: cappedLines.length,
  logs_lines: cappedLines,
  ...
};
```

## Info

### IN-01: `extractCoolifyVersion` yields `[object Object]` on unexpected API shape

**File:** `src/mcp/tools/system.ts:115-120`
**Issue:** If `GET /version` returns an object without a `version` property, `String(versionData)` becomes `"[object Object]"` instead of a semver string. Not a token leak; wrong `coolifyVersion` for capability comparison.
**Fix:** Fall back to a structured error or `unknown` string only after checking known fields; e.g. reject non-string/non-number version values with `COOLIFY_500` or scan for a `version` nested path.

### IN-02: Capabilities `supported: true` is static — no live version gate

**File:** `src/mcp/capabilities.ts:1-25`, `src/mcp/tools/system.ts:179-184`
**Issue:** All four D-03 keys always report `supported: true` regardless of live `coolifyVersion`. Intentional per D-02/D-04 (static 4.1.2 table, soft guidance). Agents on older Coolify must compare `coolifyVersion` to per-key `coolify_min_version` themselves.
**Fix:** No code change required unless product wants dynamic `supported` flags later.

## Verified (no issue)

| Area | Verdict |
|------|---------|
| Token leak on `system.version` / `verify` | Pass — response omits token; tests enforce |
| `COOLIFY_412_CAPABILITIES` four keys + shape | Pass — matches D-03 |
| `deployment.logs` XOR schema | Pass — rejects both/neither uuid |
| `COOLIFY_NO_DEPLOYMENTS` + hints | Pass — `application.deploy`, `deployment.list` in `RECOVERY_HINTS` |
| Empty logs soft OK (D-16) | Pass — `EMPTY_LOGS_HINT` on `logs.length === 0` |
| Missing/non-string `logs` | Pass — `COOLIFY_403_SENSITIVE_REQUIRED` |
| `readPackageVersion` path fallback | Pass — `../` and `../../` package.json |
| `application.logs` build path | Pass — uses shared `processDeploymentBuildLogs` |
| `resolveLatestDeploymentUuid` sort | Pass — `created_at` desc, uuid fallback |
| Deploy prompt cites `deployment.logs` | Pass — failure/cancelled path in `prompts.ts` |

---

_Reviewed: 2026-07-27T21:30:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
