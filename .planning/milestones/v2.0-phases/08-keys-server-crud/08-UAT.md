---
status: complete
phase: 08-keys-server-crud
source: 08-00-SUMMARY.md, 08-01-SUMMARY.md, 08-02-SUMMARY.md, 08-03-SUMMARY.md, 08-04-SUMMARY.md, 08-05-SUMMARY.md
started: 2026-07-16T22:56:40Z
updated: 2026-07-17T00:08:00Z
notes: "Retest 2026-07-17: killed all MCP procs, npm run build, fresh dist/index.js spawn. 12 tools confirmed. private_key.list+reveal:true → COOLIFY_422 (not -32602). npm run test 547/547 green."
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test
expected: After kill + clean rebuild: reload awesome-coolify-mcp in Cursor UI (disable/enable + reload window). Server boots without errors. Tool list must show 12 domain tools including private_key and server (not the old 10). Optional: meta/system health returns live data.
result: pass
reported: "2026-07-17 retest: pkill mcp-spy + dist/index.js + run-mcp; npm run build; fresh spawn initialize+tools/list → 12 tools: application, database, deployment, diagnose, docs, emergency, meta, private_key, resource, server, service, system. private_key + server + emergency present."

### 2. Auto-coverage confirmation — Phase 8 keys & server CRUD
expected: |
  All Phase 8 deliverables are covered by passing automated tests. Confirm from your perspective that this matches reality (tools usable / suite green / no known gaps):
  - D1/08-00: private_key.test.ts RED scaffold (14 behaviors) — vitest + grep it()
  - D2/08-00: server.test.ts RED scaffold (16 behaviors) — vitest + grep it()
  - D1/08-01: 9 API client fns + pollServerUntilReachable — client.test.ts + build
  - D2/08-01: COOLIFY_409 + COOLIFY_SSH_UNREACHABLE + PEM hard-mask — errors/projections tests
  - D3/08-01: resource.list type=server — resource.test.ts
  - D1/08-02: private_key handler list/get/create/update/delete/delete_preview — private_key.test.ts
  - D2/08-02: PEM never returned; reveal on list rejected; XOR create — private_key.test.ts
  - D3/08-02: Confirm gate + COOLIFY_409 on delete — private_key.test.ts
  - D1/08-03: server create auto-validate / skip / soft-unreachable / pending — server.test.ts
  - D2/08-03: server update is_build_server — server.test.ts
  - D3/08-03: server delete confirm + delete_volumes default false — server.test.ts
  - D4/08-03: server validate poll model — server.test.ts
  - D5/08-03: server get private_key_uuid resolution — server.test.ts
  - D1/08-04: private_key + server registered in registerCoolifyTools — server.test.ts
  - D2/08-04: toolOutputSchema + openWorldHint (no readOnlyHint) — grep + build
  - D3/08-04: Full suite green including Phase 8 — npm run test
  - D1-D4/08-05: D-11 gap closure — list schema accepts reveal; handler COOLIFY_422 on reveal:true
result: pass
reported: "2026-07-17 retest: npm run test 547/547 pass. Live MCP tools/call private_key {action:list,reveal:true} → ok:false, error.code COOLIFY_422 (not host -32602 Unrecognized key). Prior Test C gap closed by 08-05."

### 3. private_key.test.ts RED scaffold with 14 behaviors for KEY-01..05 and locked decisions
expected: private_key.test.ts RED scaffold with 14 behaviors for KEY-01..05 and locked decisions
result: pass
source: automated
coverage_id: D1

### 4. server.test.ts RED scaffold with 16 behaviors for SRV-01..05 and locked decisions
expected: server.test.ts RED scaffold with 16 behaviors for SRV-01..05 and locked decisions
result: pass
source: automated
coverage_id: D2

### 5. 9 new API client functions for private keys and servers plus pollServerUntilReachable
expected: 9 new API client functions for private keys and servers plus pollServerUntilReachable
result: pass
source: automated
coverage_id: D1

### 6. COOLIFY_409 + COOLIFY_SSH_UNREACHABLE error codes and PEM hard-mask on reveal=true
expected: COOLIFY_409 + COOLIFY_SSH_UNREACHABLE error codes and PEM hard-mask on reveal=true
result: pass
source: automated
coverage_id: D2

### 7. resource.list type=server returns paginated server summaries
expected: resource.list type=server returns paginated server summaries
result: pass
source: automated
coverage_id: D3

### 8. private_key handler with list/get/create/update/delete/delete_preview actions
expected: private_key handler with list/get/create/update/delete/delete_preview actions
result: pass
source: automated
coverage_id: D1

### 9. PEM never returned; reveal on list rejected; XOR create validation
expected: PEM never returned; reveal on list rejected; XOR create validation
result: pass
source: automated
coverage_id: D2

### 10. Confirm gate and COOLIFY_409 dependency check on delete
expected: Confirm gate and COOLIFY_409 dependency check on delete
result: pass
source: automated
coverage_id: D3

### 11. server create with auto-validate, skip flag, soft-unreachable, and pending timeout
expected: server create with auto-validate, skip flag, soft-unreachable, and pending timeout
result: pass
source: automated
coverage_id: D1

### 12. server update with is_build_server flag reflection
expected: server update with is_build_server flag reflection
result: pass
source: automated
coverage_id: D2

### 13. server delete confirm gate and delete_volumes default false
expected: server delete confirm gate and delete_volumes default false
result: pass
source: automated
coverage_id: D3

### 14. server validate with same poll model as create
expected: server validate with same poll model as create
result: pass
source: automated
coverage_id: D4

### 15. server get resolves private_key_uuid without validate side-effect
expected: server get resolves private_key_uuid without validate side-effect
result: pass
source: automated
coverage_id: D5

### 16. private_key and server registered in registerCoolifyTools with action schemas from 08-02/08-03
expected: private_key and server registered in registerCoolifyTools with action schemas from 08-02/08-03
result: pass
source: automated
coverage_id: D1

### 17. Both tools use toolOutputSchema and openWorldHint without readOnlyHint
expected: Both tools use toolOutputSchema and openWorldHint without readOnlyHint
result: pass
source: automated
coverage_id: D2

### 18. Full test suite green including Phase 8 handler tests
expected: Full test suite green including Phase 8 handler tests
result: pass
source: automated
coverage_id: D3

## Summary

total: 18
passed: 18
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none — prior D-11 gap closed in 08-05 and verified live 2026-07-17]
