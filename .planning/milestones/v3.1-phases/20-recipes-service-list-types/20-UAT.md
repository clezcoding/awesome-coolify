---
status: complete
phase: 20-recipes-service-list-types
source: 20-00-SUMMARY.md, 20-01-SUMMARY.md, 20-02-SUMMARY.md, 20-03-SUMMARY.md, 20-04-SUMMARY.md
started: 2026-07-25T03:26:01Z
updated: 2026-07-25T03:43:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test
expected: Kill any running server/service. Clear ephemeral state (temp DBs, caches, lock files). Start the application from scratch. Server boots without errors, any seed/migration completes, and a primary query (health check, homepage load, or basic API call) returns live data.
result: pass

### 2. Confirm auto-covered deliverables
expected: |
  All Phase 20 coverage entries are covered by passing unit tests. Confirm the auto-covered set matches what you expect shipped:
  - 20-00 D1: RED create-git-app scaffolds → recipe.test.ts#recipe create-git-app
  - 20-00 D2: RED create-app-db scaffolds → recipe.test.ts#recipe create-app-db
  - 20-00 D3: RED create-one-click scaffolds → recipe.test.ts#recipe create-one-click
  - 20-01 D1: fetchServiceTemplates CDN/GitHub → service-templates.test.ts#fetchServiceTemplates
  - 20-01 D2: service.list-types slim sorted list → service.test.ts#service list-types
  - 20-02 D1: create-git-app build_pack + deploy → recipe.test.ts#recipe create-git-app
  - 20-02 D2: create-one-click type validation → recipe.test.ts#recipe create-one-click
  - 20-03 D1: create-app-db DB+app+env wiring → recipe.test.ts#recipe create-app-db
  - 20-03 D2: recipe registered + README EN/DE → server.test.ts#MCP server tool registration
  - 20-04 D1: create-git-app MANIFEST_HINT on Zod/runtime → recipe.test.ts D-20 create-git-app
  - 20-04 D2: create-git-app MANIFEST_HINT on API errors → recipe.ts#rethrowGitAppApiErrorWithManifestHint
result: pass

### 3. 10 RED create-git-app scaffolds (Dockerfile detection, D-10 glob, D-11/D-12 validation, D-16/D-17)
expected: 10 RED create-git-app scaffolds (Dockerfile detection, D-10 glob, D-11/D-12 validation, D-16/D-17)
result: pass
source: automated
coverage_id: 20-00-D1

### 4. 9 RED create-app-db scaffolds (DATABASE_URL wiring, D-14/D-15 partial failure, D-19 masking, D-20 hint)
expected: 9 RED create-app-db scaffolds (DATABASE_URL wiring, D-14/D-15 partial failure, D-19 masking, D-20 hint)
result: pass
source: automated
coverage_id: 20-00-D2

### 5. 6 RED create-one-click scaffolds (list-types validation, D-01 SSRF reject, D-07 delegate, D-20 hint)
expected: 6 RED create-one-click scaffolds (list-types validation, D-01 SSRF reject, D-07 delegate, D-20 hint)
result: pass
source: automated
coverage_id: 20-00-D3

### 6. fetchServiceTemplates fetches service-templates.json from jsDelivr with GitHub Raw fallback and version pinning
expected: fetchServiceTemplates fetches service-templates.json from jsDelivr with GitHub Raw fallback and version pinning
result: pass
source: automated
coverage_id: 20-01-D1

### 7. service.list-types action returns slim stable-sorted type IDs and labels to agents
expected: service.list-types action returns slim stable-sorted type IDs and labels to agents
result: pass
source: automated
coverage_id: 20-01-D2

### 8. create-git-app detects build_pack locally, rejects dockercompose, calls createPublicApplication + triggerDeploy
expected: create-git-app detects build_pack locally, rejects dockercompose, calls createPublicApplication + triggerDeploy
result: pass
source: automated
coverage_id: 20-02-D1

### 9. create-one-click validates type against fetchServiceTemplates and delegates to createService
expected: create-one-click validates type against fetchServiceTemplates and delegates to createService
result: pass
source: automated
coverage_id: 20-02-D2

### 10. create-app-db creates DB+app, wires DATABASE_URL/env_key, masks connection_string unless reveal
expected: create-app-db creates DB+app, wires DATABASE_URL/env_key, masks connection_string unless reveal
result: pass
source: automated
coverage_id: 20-03-D1

### 11. recipe tool registered in server.ts with instance routing and README EN/DE documentation
expected: recipe tool registered in server.ts with instance routing and README EN/DE documentation
result: pass
source: automated
coverage_id: 20-03-D2

### 12. create-git-app Zod and runtime errors append MANIFEST_HINT to recoveryHints (D-20 / truth #14)
expected: create-git-app Zod and runtime errors append MANIFEST_HINT to recoveryHints (D-20 / truth #14)
result: pass
source: automated
coverage_id: 20-04-D1

### 13. create-git-app API CoolifyApiError from createPublicApplication/triggerDeploy includes MANIFEST_HINT
expected: create-git-app API CoolifyApiError from createPublicApplication/triggerDeploy includes MANIFEST_HINT
result: pass
source: automated
coverage_id: 20-04-D2

## Summary

total: 13
passed: 13
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none yet]
