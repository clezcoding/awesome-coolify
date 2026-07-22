# Debug Session: initial_environment MCP Validation Gap

**Gap:** G-09-10  
**Symptom:** Live MCP returns generic SDK validation error instead of COOLIFY_422  
**Date:** 2026-07-17

## Reproduction

```
project({ action: 'create', name: 'test' })
// without initial_environment
```

**Live result:**
```
Input validation error: initial_environment: Invalid input: expected string, received undefined
```

**Expected:**
```json
{
  "ok": false,
  "error": {
    "code": "COOLIFY_422",
    "recoveryHints": ["Ask user for production vs custom environment name", ...]
  }
}
```

## Root Cause

Two validation layers:

1. **MCP SDK layer** — `registerTool({ inputSchema: projectActionSchema })` converts Zod to JSON Schema. Required fields rejected before handler invocation.
2. **Handler layer** — `parseProjectAction` → `throwValidationError` maps Zod failures to COOLIFY_422. Only reached when SDK validation passes.

Unit tests call `handleProjectAction` directly → layer 1 skipped → tests green, live MCP fails.

## Fix

Mirror Phase 8 D-11 (`private_key.list` + `reveal`):
- Optional at schema layer
- Required at handler layer with CoolifyApiError

## Files

- `src/mcp/tools/project.ts` — schema + create handler
- `src/mcp/tools/project.test.ts` — verify handler path still covered

---

## Resolution

**Status:** resolved  
**Verified:** 2026-07-20  
**Verification:** `npm test -- --run src/mcp/tools/project.test.ts` → 16/16 passed

### Fix confirmation

| Layer | Expected | Actual |
|-------|----------|--------|
| Schema | `initial_environment` optional (MCP JSON Schema passes) | ✓ `z.string().optional()` at createActionSchema |
| Handler | Missing/empty → `COOLIFY_422` + recovery hints | ✓ CoolifyApiError with INITIAL_ENV_RECOVERY_HINTS |
| Schema parse | Missing field → safeParse success | ✓ covered by unit test |
| Tool description | Documents required + COOLIFY_422 | ✓ server.ts project tool desc |

### Files changed (already shipped)

- `src/mcp/tools/project.ts` — schema optional + handler gate
- `src/mcp/tools/project.test.ts` — 4 D-09/D-10 coverage tests
- `src/mcp/server.ts` — tool description parity

**Root cause:** Two-layer validation — MCP SDK rejected required Zod fields before handler; unit tests bypassed SDK layer.

**Fix:** Optional at schema layer; required at handler with `COOLIFY_422` (Phase 8 D-11 pattern).
