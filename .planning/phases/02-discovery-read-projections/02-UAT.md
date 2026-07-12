---
status: complete
phase: 02-discovery-read-projections
source: [02-01-SUMMARY.md, 02-02-SUMMARY.md, 02-03-SUMMARY.md, 02-04-SUMMARY.md, 02-05-SUMMARY.md]
started: 2026-07-12T02:52:00Z
updated: 2026-07-12T20:40:00Z
mode: mvp
auto: true
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test
expected: Kill any running server. Build from scratch (`npm run build`) and launch `node dist/index.js` with dummy env. Server boots without errors, no startup race conditions, no missing env validation.
result: pass
source: automated
evidence: |
  - `npm run build` → tsup success (dist/index.js 23.86 KB, 12ms)
  - `COOLIFY_URL=http://localhost:3000 COOLIFY_TOKEN=dummy node dist/index.js < /dev/null` → exit 0, no fatal errors
  - Only output: zod version advisory warning (non-blocking)

### 2. D-05 resource summary projector with health field derivation
expected: projectResourceSummary derives health status from raw API JSON
result: pass
source: automated
coverage_id: 02-01/D1
evidence: src/utils/projections.test.ts#projectResourceSummary (pass)

### 3. D-06 per-type application/service/database summary projectors
expected: projectApplicationSummary, projectServiceSummary, projectDatabaseSummary each return bounded summaries
result: pass
source: automated
coverage_id: 02-01/D2
evidence: src/utils/projections.test.ts (3 unit tests pass)

### 4. sanitizeFullProjection recursive secret masking
expected: /password|token|secret|private|env/i keys masked recursively in full projection
result: pass
source: automated
coverage_id: 02-01/D3
evidence: src/utils/projections.test.ts#sanitizeFullProjection (pass)

### 5. resolveProjection + parseReadParams include_full alias (D-07)
expected: include_full alias resolves to full projection mode
result: pass
source: automated
coverage_id: 02-01/D4
evidence: src/utils/projections.test.ts#resolveProjection + src/mcp/tools/shared-read-params.test.ts (pass)

### 6. formatOutput pretty/json/table with pretty default (D-09)
expected: formatOutput renders pretty by default, json and table on demand
result: pass
source: automated
coverage_id: 02-01/D5
evidence: src/utils/formatters.test.ts#formatOutput (pass)

### 7. paginateArray client-side pagination defaults
expected: page 1, per_page 10, max 100 enforced
result: pass
source: automated
coverage_id: 02-01/D6
evidence: src/utils/formatters.test.ts#paginateArray (pass)

### 8. truncateAndGuard max_chars cap with truncated flag + recovery hint
expected: output hard-capped at max_chars, truncated flag set, recovery hint present
result: pass
source: automated
coverage_id: 02-01/D7
evidence: src/utils/formatters.test.ts#truncateAndGuard (pass)

### 9. applySizeWarning 80% threshold advisory (DX-03/D-16)
expected: advisory warning emitted when output exceeds 80% of max_chars
result: pass
source: automated
coverage_id: 02-01/D8
evidence: src/utils/formatters.test.ts#applySizeWarning (pass)

### 10. sharedReadParamsSchema spreadable with D-21 defaults
expected: schema spreads into read tool actions with defaults applied
result: pass
source: automated
coverage_id: 02-01/D9
evidence: src/mcp/tools/shared-read-params.test.ts (5 tests pass)

### 11. fetchResources/fetchServers/fetchProjects GET helpers
expected: array normalization across response shapes
result: pass
source: automated
coverage_id: 02-02/D1
evidence: src/api/client.test.ts (pass)

### 12. system.infrastructure_overview health rollup per category (D-08)
expected: running/stopped/unhealthy counts rolled up per category
result: pass
source: automated
coverage_id: 02-02/D2
evidence: src/mcp/tools/system.test.ts#handleSystemAction infrastructure_overview (pass)

### 13. resource.list summary-projected unified listing with pagination metadata
expected: list returns summary projection with pagination _meta
result: pass
source: automated
coverage_id: 02-02/D3
evidence: src/mcp/tools/resource.test.ts#handleResourceAction list (pass)

### 14. resource list type filter application (APP-01)
expected: type=application filters to applications only
result: pass
source: automated
coverage_id: 02-02/D4
evidence: src/mcp/tools/resource.test.ts#filters to applications only (pass)

### 15. resource list type filter service and database (SVC-01)
expected: type=service and type=database filter correctly
result: pass
source: automated
coverage_id: 02-02/D5
evidence: src/mcp/tools/resource.test.ts (2 tests pass)

### 16. resource and system tools register with readOnlyHint true (D-22)
expected: MCP registration marks tools readOnlyHint: true
result: pass
source: automated
coverage_id: 02-02/D6
evidence: src/mcp/server.test.ts#registers resource tool with readOnlyHint true (pass)

### 17. application.get summary default + sanitized full via include_full
expected: summary by default, sanitized full projection with include_full
result: pass
source: automated
coverage_id: 02-03/D1
evidence: src/mcp/tools/application.test.ts (2 tests pass)

### 18. service.get and database.get mirror application projection behavior
expected: summary by default, sanitized full with include_full alias
result: pass
source: automated
coverage_id: 02-03/D2
evidence: src/mcp/tools/service.test.ts + src/mcp/tools/database.test.ts (4 tests pass)

### 19. format table rejected on full projection with recovery hint (D-11)
expected: COOLIFY_422 with pretty/json recovery hints when format=table + include_full
result: pass
source: automated
coverage_id: 02-03/D3
evidence: application/service/database tests (3 tests pass)

### 20. application/service/database tools registered readOnlyHint true, get-only
expected: domain tools expose get-only actions per D-02
result: pass
source: automated
coverage_id: 02-03/D4
evidence: src/mcp/server.test.ts (2 tests pass)

### 21. resource.find cross-type discovery with query auto-detect
expected: find scans apps/services/databases/servers with auto-detect and explicit uuid/name/domain/ip fields
result: pass
source: automated
coverage_id: 02-04/D1
evidence: src/mcp/tools/resource.test.ts#handleResourceAction find (pass)

### 22. docs.search static documentation index with truncation
expected: searches 11-entry DOCS_INDEX, returns truncated markdown
result: pass
source: automated
coverage_id: 02-04/D2
evidence: src/mcp/tools/docs.test.ts#handleDocsAction search (pass)

### 23. docs tool and resource find registered with readOnlyHint
expected: 7 tools registered in MCP server including docs
result: pass
source: automated
coverage_id: 02-04/D3
evidence: src/mcp/server.test.ts + npx vitest run (pass)

### 24. Uniform read response envelope with _meta on all P2 tools
expected: ok/data/_meta envelope via buildReadResponse with chars/max_chars/truncated
result: pass
source: automated
coverage_id: 02-05/D1
evidence: docs.test.ts + system.test.ts#infrastructure_overview (pass)

### 25. applySizeWarning 80% threshold via buildReadResponse on all read handlers
expected: advisory warning emitted across all read handlers
result: pass
source: automated
coverage_id: 02-05/D2
evidence: src/utils/formatters.test.ts#applySizeWarning (pass)

### 26. End-to-end P2 read slice integration test
expected: overview → list → get → find → docs happy path with mocked API
result: pass
source: automated
coverage_id: 02-05/D3
evidence: src/mcp/integration.test.ts#P2 read slice integration (pass)

### 27. readOnlyHint true on all read tool registrations
expected: resource/application/service/database/docs all readOnlyHint: true
result: pass
source: automated
coverage_id: 02-05/D4
evidence: src/mcp/integration.test.ts#readOnlyHint (pass)

### 28. Phase 2 validation contract signed off
expected: 02-VALIDATION.md nyquist_compliant: true with traceability for 13 REQ-IDs
result: pass
source: automated
coverage_id: 02-05/D5
evidence: .planning/phases/02-discovery-read-projections/02-VALIDATION.md (pass)

## Summary

total: 28
passed: 28
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none]

## Regressions Surfaced & Resolved in Phase 3

A pre-existing Phase 2 bug in `src/mcp/server.ts:61-71` (`toolOutputSchema`) was discovered during Phase 3 live MCP UAT:

1. **Bug:** `toolOutputSchema` did not declare `_meta`, `_formattedText`, or `_size_warning`, while all read handlers return `structuredContent: { ok, data, _meta }` via `buildReadResponse`. JSON Schema derived from the tool schema sets `additionalProperties: false`, so live MCP clients rejected responses with `MCP error -32602: Structured content does not match the tool's output schema`.

2. **Why Phase 2 UAT missed it:** All 28 Phase 2 tests were marked `source: automated` (handler unit/integration tests). No live MCP stdio runtime verification was performed — handler tests bypass the MCP SDK output schema validation layer.

3. **Fix:** `03-07-PLAN.md` extended `toolOutputSchema` with `_meta` (matching `ReadResponse` in `src/utils/formatters.ts:123-136`) plus optional `_formattedText`/`_size_warning`, added unit tests in `src/mcp/server.test.ts`, and added child-process regression test `tests/integration/mcp-schema-validation.test.ts` covering all six manifest read tools.

4. **Verification:** Live MCP calls to `resource.list`, `system.infrastructure_overview`, `docs.search`, `diagnose.scan`, `diagnose.app`, and `diagnose.server` now return `structuredContent.ok:true` with `_meta` (re-verified 2026-07-12 against puzzlesstool.online). See `.planning/phases/03-diagnose-issue-scan/03-UAT.md` tests 3–6 and 15.

## Automated Verification Manifest

- suite: vitest
- result: 17 files, 119 tests, 0 failures
- build: tsup success (dist/index.js 23.86 KB)
- cold_start: node dist/index.js with dummy env → exit 0
- verification_status: passed
- audit_open: 0 items
- coverage_mode: all 5 SUMMARYs in `coverage` mode, all_auto_covered=true, present=[], errors=[]
- mvp_mode: true
- user_story_check: goal semantically matches user-story shape ("As an AI agent, I want to ..., so that ..."); regex validator failed on "As an" vs "As a" — flagged for /gsd mvp-phase 2 normalization (non-blocking)
