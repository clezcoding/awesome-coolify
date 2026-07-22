---
status: complete
phase: 15-multi-instance-registry-routing
source: 15-00-SUMMARY.md, 15-01-SUMMARY.md, 15-02-SUMMARY.md, 15-03-SUMMARY.md, 15-04-SUMMARY.md
started: 2026-07-21T23:03:23Z
updated: 2026-07-21T23:12:53Z
---

## Current Test

[testing complete]


## Tests

### 1. Cold Start Smoke Test
expected: Kill any running server/service. Clear ephemeral state (temp DBs, caches, lock files). Start the application from scratch. Server boots without errors, any seed/migration completes, and a primary query (health check, homepage load, or basic API call) returns live data.
result: pass

### 2. Confirm auto-covered deliverables
expected: |
  All Phase 15 coverage deliverables are already green via automated tests. Confirm this matches reality from your perspective (MCP soft-start + instance registry + instance tool + optional instance routing on API tools).

  Auto-covered (15-00 RED scaffolds):
  - D1 InstanceManager RED contract — src/utils/instance-registry.test.ts
  - D2 instance tool CRUD RED scaffolds — src/mcp/tools/instance.test.ts
  - D3 Credential resolution precedence RED — instance-registry.test.ts resolveCredentials
  - D4 Registry permissions + token redaction RED — saveRegistry 0o700/0o600 + list redact
  - D5 Atomic write + concurrent save serialization RED — concurrent saveRegistry
  - D6 loadEnv soft-start + COOLIFY_PARTIAL_ENV RED — src/config/env.test.ts
  - D7 application.get instance routing RED stubs — src/mcp/integration.test.ts CTX-06

  Auto-covered (15-01 InstanceManager):
  - D1 load/add/list/set-default/delete/saveRegistry — InstanceManager describe (9 tests)
  - D2 resolveCredentials precedence — 4 tests
  - D3 Registry dir 0o700 + file 0o600 + token redaction
  - D4 Atomic temp+rename + concurrent save serialization
  - D5 Multi-instance error codes + RECOVERY_HINTS — errors.test.ts

  Auto-covered (15-02 instance tool + soft-start):
  - D1 instance tool 7 actions + token redaction — instance.test.ts (12)
  - D2 loadEnv soft-start + COOLIFY_PARTIAL_ENV — env.test.ts
  - D3 instance.list _meta.envOverride — envOverride test
  - D4 Server registers 15 tools including instance — server.test.ts
  - D5 npm run build GREEN

  Auto-covered (15-03 write-tool routing):
  - D1 application + deployment optional instance — application/deployment tests
  - D2 service + database + emergency optional instance
  - D3 Unknown/partial/missing → COOLIFY_INSTANCE_NOT_FOUND / PARTIAL_ENV / NO_INSTANCE
  - D4 npm run build GREEN

  Auto-covered (15-04 read-tool routing):
  - D1 resource, system, diagnose optional instance
  - D2 server, private_key, project, environment optional instance
  - D3 Integration routing all 12 API tools — integration.test.ts CTX-06
  - D4 npm run build GREEN
result: pass

### 3. InstanceManager RED contract (load/add/list/set-default/delete/saveRegistry/resolveCredentials)
expected: InstanceManager RED contract (load/add/list/set-default/delete/saveRegistry/resolveCredentials)
result: pass
source: automated
coverage_id: 15-00-D1

### 4. instance tool CRUD RED scaffolds (list/get/add/update/delete/set-default/import-env)
expected: instance tool CRUD RED scaffolds (list/get/add/update/delete/set-default/import-env)
result: pass
source: automated
coverage_id: 15-00-D2

### 5. Credential resolution precedence RED (env override, partial env, no instance)
expected: Credential resolution precedence RED (env override, partial env, no instance)
result: pass
source: automated
coverage_id: 15-00-D3

### 6. Registry permissions + token redaction RED
expected: Registry permissions + token redaction RED
result: pass
source: automated
coverage_id: 15-00-D4

### 7. Atomic write + concurrent save serialization RED
expected: Atomic write + concurrent save serialization RED
result: pass
source: automated
coverage_id: 15-00-D5

### 8. loadEnv soft-start + COOLIFY_PARTIAL_ENV RED
expected: loadEnv soft-start + COOLIFY_PARTIAL_ENV RED
result: pass
source: automated
coverage_id: 15-00-D6

### 9. application.get instance routing RED stubs (CTX-06)
expected: application.get instance routing RED stubs (CTX-06)
result: pass
source: automated
coverage_id: 15-00-D7

### 10. InstanceManager load/add/list/set-default/delete/saveRegistry
expected: InstanceManager load/add/list/set-default/delete/saveRegistry
result: pass
source: automated
coverage_id: 15-01-D1

### 11. resolveCredentials precedence param → env → default with partial-env guard
expected: resolveCredentials precedence param → env → default with partial-env guard
result: pass
source: automated
coverage_id: 15-01-D2

### 12. Registry dir 0o700 + file 0o600 + token redaction
expected: Registry dir 0o700 + file 0o600 + token redaction
result: pass
source: automated
coverage_id: 15-01-D3

### 13. Atomic temp+rename write with concurrent save serialization
expected: Atomic temp+rename write with concurrent save serialization
result: pass
source: automated
coverage_id: 15-01-D4

### 14. Multi-instance error codes + RECOVERY_HINTS in errors.ts
expected: Multi-instance error codes + RECOVERY_HINTS in errors.ts
result: pass
source: automated
coverage_id: 15-01-D5

### 15. instance tool 7 actions with discriminatedUnion schema and token redaction
expected: instance tool 7 actions with discriminatedUnion schema and token redaction
result: pass
source: automated
coverage_id: 15-02-D1

### 16. loadEnv soft-start and COOLIFY_PARTIAL_ENV partial-env guard
expected: loadEnv soft-start and COOLIFY_PARTIAL_ENV partial-env guard
result: pass
source: automated
coverage_id: 15-02-D2

### 17. instance.list _meta.envOverride when env credentials both set
expected: instance.list _meta.envOverride when env credentials both set
result: pass
source: automated
coverage_id: 15-02-D3

### 18. Server registers 15 tools including instance with readOnlyHint
expected: Server registers 15 tools including instance with readOnlyHint
result: pass
source: automated
coverage_id: 15-02-D4

### 19. npm run build GREEN after soft-start wiring
expected: npm run build GREEN after soft-start wiring
result: pass
source: automated
coverage_id: 15-02-D5

### 20. application + deployment accept optional instance param and route via resolveCredentials
expected: application + deployment accept optional instance param and route via resolveCredentials
result: pass
source: automated
coverage_id: 15-03-D1

### 21. service + database + emergency accept optional instance param and route via resolveCredentials
expected: service + database + emergency accept optional instance param and route via resolveCredentials
result: pass
source: automated
coverage_id: 15-03-D2

### 22. Unknown/partial/missing creds return COOLIFY_INSTANCE_NOT_FOUND / COOLIFY_PARTIAL_ENV / COOLIFY_NO_INSTANCE
expected: Unknown/partial/missing creds return COOLIFY_INSTANCE_NOT_FOUND / COOLIFY_PARTIAL_ENV / COOLIFY_NO_INSTANCE
result: pass
source: automated
coverage_id: 15-03-D3

### 23. npm run build GREEN after routing wiring
expected: npm run build GREEN after routing wiring
result: pass
source: automated
coverage_id: 15-03-D4

### 24. resource, system, diagnose accept optional instance and route via resolveCredentials
expected: resource, system, diagnose accept optional instance and route via resolveCredentials
result: pass
source: automated
coverage_id: 15-04-D1

### 25. server, private_key, project, environment accept optional instance and route via resolveCredentials
expected: server, private_key, project, environment accept optional instance and route via resolveCredentials
result: pass
source: automated
coverage_id: 15-04-D2

### 26. Integration routing for all 12 API tools — named instance, unknown, no-instance, partial-env
expected: Integration routing for all 12 API tools — named instance, unknown, no-instance, partial-env
result: pass
source: automated
coverage_id: 15-04-D3

### 27. npm run build GREEN after read-tool routing wiring
expected: npm run build GREEN after read-tool routing wiring
result: pass
source: automated
coverage_id: 15-04-D4

## Summary

total: 27
passed: 27
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none yet]
