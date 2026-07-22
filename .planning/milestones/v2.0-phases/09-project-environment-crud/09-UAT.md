---
status: complete
phase: 09-project-environment-crud
source: 09-VERIFICATION.md
started: 2026-07-17T03:53:00Z
updated: 2026-07-21T03:32:00Z
notes: "UAT fully complete — 19/19 passed. Milestone optional re-run 2026-07-21: Test 10 live MCP COOLIFY_422 confirmed."
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test
expected: Kill any running MCP/server processes. Run npm run build. Reload awesome-coolify-mcp in Cursor. Server boots without errors. Tool list shows 14 tools including project and environment.
result: pass
reported: "Cold start verified — build ok, MCP reload, 14 tools incl. project + environment"

### 2. Auto-coverage confirmation — Phase 9 project & environment CRUD
expected: |
  All Phase 9 deliverables are covered by passing automated tests. Confirm from your perspective that this matches reality (tools usable / suite green / no known gaps):
  - D1/09-00 through D3/09-04 (17 auto-covered deliverables)
result: pass
reported: "User confirmed — tools usable, suite green, no known gaps"

### 3. project.test.ts RED scaffold with 15 behaviors for PROJ-01..03 and locked decisions
expected: project.test.ts RED scaffold with 15 behaviors for PROJ-01..03 and locked decisions
result: pass
source: automated
coverage_id: D1
reported: "15/15 vitest"

### 4. environment.test.ts RED scaffold with 17 behaviors including SC#4 resource.list integration
expected: environment.test.ts RED scaffold with 17 behaviors including SC#4 resource.list integration
result: pass
source: automated
coverage_id: D2
reported: "17/17 vitest"

### 5. 7 project/environment CRUD client functions with createCoolifyClient + withMappedErrors
expected: 7 project/environment CRUD client functions with createCoolifyClient + withMappedErrors
result: pass
source: automated
coverage_id: D1
reported: "9 exports, client tests grün"

### 6. resource.list serves type=project summaries with environment_count
expected: resource.list serves type=project summaries with environment_count
result: pass
source: automated
coverage_id: D2
reported: "vitest + live MCP liefert Feld"

### 7. resource.list serves type=environment summaries with project_uuid + project_name
expected: resource.list serves type=environment summaries with project_uuid + project_name
result: pass
source: automated
coverage_id: D3
reported: "vitest grün; live MCP liefert [] (API liefert keine nested envs in project list)"

### 8. resolveProjectUuid and resolveEnvironmentUuid with structured error envelopes
expected: resolveProjectUuid and resolveEnvironmentUuid with structured error envelopes
result: pass
source: automated
coverage_id: D4
reported: "11/11 vitest"

### 9. project tool list/get/create/update/delete/delete_preview actions
expected: project tool list/get/create/update/delete/delete_preview actions
result: pass
source: automated
coverage_id: D1
reported: "live MCP gegen Coolify — Project CRUD ok"

### 10. create requires initial_environment and ensures env exists
expected: create requires initial_environment and ensures env exists; missing/empty → COOLIFY_422 with recovery hints
result: pass
reported: "Live MCP re-run 2026-07-21 — COOLIFY_422 + 3 recoveryHints (missing + empty initial_environment), no SDK -32602"

### 11. delete confirm gate + COOLIFY_409 on non-empty project
expected: delete confirm gate + COOLIFY_409 on non-empty project
result: pass
source: automated
coverage_id: D3
reported: "live MCP — COOLIFY_CONFIRM_REQUIRED + COOLIFY_409 mit environment_uuids"

### 12. name resolution COOLIFY_AMBIGUOUS_MATCH on multi-match
expected: name resolution COOLIFY_AMBIGUOUS_MATCH on multi-match
result: pass
source: automated
coverage_id: D4
reported: "live MCP — Substring MCP → 3 matches"

### 13. environment tool list/get/create/delete/delete_preview actions
expected: environment tool list/get/create/delete/delete_preview actions
result: pass
source: automated
coverage_id: D1
reported: "live MCP"

### 14. create with project_name resolution and duplicate 409 recovery hint
expected: create with project_name resolution and duplicate 409 recovery hint
result: pass
source: automated
coverage_id: D2
reported: "live MCP — COOLIFY_409 + Hint Use the existing UUID or pick a new name"

### 15. delete confirm gate + COOLIFY_409 on non-empty env with child_resource_uuids
expected: delete confirm gate + COOLIFY_409 on non-empty env with child_resource_uuids
result: pass
source: automated
coverage_id: D3
reported: "live MCP — 5 child resources"

### 16. delete_preview returns child_resources without DELETE call
expected: delete_preview returns child_resources without DELETE call
result: pass
source: automated
coverage_id: D4
reported: "live MCP — 5 resources, kein DELETE"

### 17. project and environment registered in registerCoolifyTools with action schemas from 09-02/09-03
expected: project and environment registered in registerCoolifyTools with action schemas from 09-02/09-03
result: pass
source: automated
coverage_id: D1
reported: "server.test.ts"

### 18. Both tools use toolOutputSchema and openWorldHint without readOnlyHint
expected: Both tools use toolOutputSchema and openWorldHint without readOnlyHint
result: pass
source: automated
coverage_id: D2
reported: "grep server.ts"

### 19. Full test suite green including Phase 9 handler tests
expected: Full test suite green including Phase 9 handler tests
result: pass
source: automated
coverage_id: D3
reported: "599/599"

## Summary

total: 19
passed: 19
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

- gap_id: G-09-10
  truth: "project create without initial_environment returns COOLIFY_422 with recovery hints (D-09/D-10)"
  status: resolved
  resolved_by: 09-05-PLAN.md
  resolved_at: 2026-07-17
  reason: "Live MCP re-test passed — COOLIFY_422 + recoveryHints, no SDK validation error."
  severity: major
  test: 10
  root_cause: "projectActionSchema marks initial_environment as required z.string().min(1). MCP SDK validates inputSchema via JSON Schema before handleProjectAction runs. Missing field rejected at SDK layer with generic validation error. Unit tests call handleProjectAction directly and bypass SDK validation — throwValidationError path never exercised on live MCP."
  artifacts:
    - path: "src/mcp/tools/project.ts"
      issue: "createActionSchema.initial_environment is required at Zod/JSON Schema layer"
    - path: "src/mcp/server.ts"
      issue: "inputSchema: projectActionSchema triggers pre-handler SDK validation"
    - path: "src/mcp/tools/private_key.ts"
      issue: "D-11 precedent: optional schema field + handler-level COOLIFY_422 rejection"
  missing:
    - "Make initial_environment optional in createActionSchema (MCP layer passthrough)"
    - "Add handler-level guard in create case before createProject — throw CoolifyApiError COOLIFY_422 + INITIAL_ENV_RECOVERY_HINTS when missing/empty"
    - "Add server.test.ts or integration test that exercises MCP-layer validation path (optional, mirrors 08-05 D-11 pattern)"
  debug_session: ".planning/debug/09-initial-environment-mcp-validation.md"

- gap_id: G-09-2
  truth: "All Phase 9 deliverables auto-covered and live-verified with no known gaps"
  status: resolved
  resolved_by: 09-05-PLAN.md
  resolved_at: 2026-07-18
  reason: "Test 2 auto-coverage confirmation passed after G-09-10 live re-test."
  severity: major
  test: 2
  root_cause: "Derivative of G-09-10 — auto-coverage confirmation aggregates deliverables; Test 10 live failure breaks end-to-end confidence despite green unit suite"
  artifacts:
    - path: ".planning/phases/09-project-environment-crud/09-UAT.md"
      issue: "Test 2 blocked by Test 10 gap"
  missing:
    - "Resolve G-09-10, then re-run Test 2 confirmation"
  debug_session: ""
