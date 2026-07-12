---
phase: 01-foundation-multi-instance-auth
plan: 01
subsystem: infra
tags: [mcp, coolify, typescript, zod, ofetch, stdio]

requires: []
provides:
  - MCP stdio server scaffold (coolify-mcp@0.1.0)
  - Zod fail-fast env loader (COOLIFY_URL, COOLIFY_TOKEN)
  - Coolify HTTP client with Bearer auth and health probe
  - Action-based system tool with health action
affects: [01-02, 01-03, 01-04, 01-05]

tech-stack:
  added: ["@modelcontextprotocol/server@2.0.0-beta.3", zod, ofetch, tsup, vitest]
  patterns: ["action-based MCP tools", "Zod env fail-fast", "stdio transport"]

key-files:
  created:
    - package.json
    - tsconfig.json
    - tsup.config.ts
    - vitest.config.ts
    - src/index.ts
    - src/config/env.ts
    - src/api/client.ts
    - src/mcp/server.ts
    - src/mcp/tools/system.ts
  modified: []

key-decisions:
  - "Used zod/v4 subpath for MCP SDK v2 Standard Schema compatibility"
  - "fetchHealth tries GET /api/health then falls back to GET /api/v1/version per D-23"

patterns-established:
  - "Action-based tool registration: system({ action: 'health' }) via z.discriminatedUnion"
  - "Env fail-fast: loadEnv() throws ZodError before MCP connect when credentials missing"

requirements-completed: [CTX-01, DX-01]

coverage:
  - id: D1
    description: npm run build produces dist/index.js and node dist/index.js starts MCP stdio without leaking token
    requirement: CTX-01
    verification:
      - kind: unit
        ref: "src/mcp/tools/system.test.ts#returns connected true and host from URL hostname"
        status: pass
      - kind: integration
        ref: "npm run build && COOLIFY_URL=... COOLIFY_TOKEN=... node dist/index.js"
        status: pass
    human_judgment: false
  - id: D2
    description: loadEnv fail-fast on missing COOLIFY_URL or COOLIFY_TOKEN
    requirement: CTX-01
    verification:
      - kind: unit
        ref: "src/config/env.test.ts"
        status: pass
    human_judgment: false
  - id: D3
    description: Human verified @modelcontextprotocol/server package legitimacy before npm install
    verification: []
    human_judgment: true
    rationale: "Blocking checkpoint Task 1 — user approved package audit 2026-07-12"

duration: 12min
completed: 2026-07-12
status: complete
---

# Phase 01 Plan 01 Summary

**Walking skeleton: MCP stdio server with Zod env fail-fast and `system({ action: 'health' })` returning `{ connected: true, host }` without token leakage**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-07-12T00:48:00Z
- **Completed:** 2026-07-12T01:00:00Z
- **Tasks:** 3
- **Files modified:** 11

## Accomplishments

- Project scaffold: `coolify-mcp@0.1.0` with tsup, vitest, MCP SDK v2
- `loadEnv()` Zod fail-fast for COOLIFY_URL + COOLIFY_TOKEN
- `createCoolifyClient` + `fetchHealth` with `/api/health` → `/api/v1/version` fallback
- `system` tool registered action-based; health returns hostname only
- `node dist/index.js` starts stdio server; stderr clean of token

## Task Commits

1. **Task 1: Scaffold + npm install** — pending commit
2. **Task 2: Env loader + health tests** — pending commit
3. **Task 3: Walking skeleton** — pending commit

## Files Created/Modified

- `package.json` — coolify-mcp package, MCP SDK deps, bin entry
- `src/config/env.ts` — loadEnv with Zod schema
- `src/api/client.ts` — ofetch client + fetchHealth probe
- `src/mcp/tools/system.ts` — systemActionSchema + handleSystemAction
- `src/mcp/server.ts` — McpServer + StdioServerTransport
- `src/index.ts` — CLI entry

## Decisions Made

- `zod/v4` import path for MCP SDK v2 registerTool compatibility (SDK warns to upgrade zod >=4.2.0 for jsonSchema — non-blocking)
- Health probe uses Bearer on both endpoints via shared fetch options

## Deviations from Plan

None — plan executed as written after user approved Task 1 checkpoint.

## Issues Encountered

- Import path fix in `system.ts` (`../../api/client.js` vs `../api/client.js`) caught by vitest

## User Setup Required

Optional manual verify against real Coolify instance:
- `COOLIFY_URL` — instance base URL
- `COOLIFY_TOKEN` — API token from Coolify UI → Keys & Tokens

## Next Phase Readiness

- Ready for 01-02: structured error envelope + retry client on top of `createCoolifyClient`
- Walking skeleton proves stdio → HTTP → tool response pipeline

---
*Phase: 01-foundation-multi-instance-auth*
*Completed: 2026-07-12*
