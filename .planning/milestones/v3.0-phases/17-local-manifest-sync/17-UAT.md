---
status: complete
phase: 17-local-manifest-sync
source: 17-00-SUMMARY.md, 17-01-SUMMARY.md, 17-02-SUMMARY.md, 17-03-SUMMARY.md, 17-VERIFICATION.md
started: 2026-07-22T17:42:00Z
updated: 2026-07-22T18:52:39Z
---

## Current Test

[testing complete]


## Tests

### 1. Cold Start Smoke Test
expected: Kill any running MCP/server process for this project. Clear ephemeral state (temp workspaces, caches, lock files). Start fresh (reload Cursor MCP or run the package entry). Server boots without errors; a primary query (meta.version, manifest.get, or instance.list) returns live structured data.
result: pass

### 2. Parallel manifest writes do not corrupt the file
expected: Spawn two ManifestManager.upsert calls concurrently (e.g. Promise.all([upsert(A), upsert(B)]) with different resource UUIDs). Both resources A and B appear in `.coolify/manifest.json`; no partial write; no leftover `.tmp` files; `updatedAt` reflects the later write.
result: pass
notes: |
  Cursor host MCP lacked `manifest` tool (stale tool list; dist has 16 tools incl. manifest).
  Probe: spawn `dist/index.js` over stdio, Promise.all two in-flight `tools/call` manifest.upsert (A+B), then manifest.get.
  Isolated via COOLIFY_MCP_TEST_WORKSPACE. Both UUIDs on disk; dirEntries=[manifest.json]; no .tmp; updatedAt=2026-07-22T18:23:44.882Z.

### 3. Concurrent 404 hint injection vs. manifest save
expected: Trigger toStructuredError on a COOLIFY_404 for a manifest-cached UUID while a ManifestManager.save is in flight. recoveryHints either contains both STALE_MANIFEST_HINTS literals or neither — no torn/partial hint set.
result: pass
notes: |
  Probe: 40 iterations × Promise.all([ManifestManager.save(fat), 20× toStructuredError(COOLIFY_404+cached UUID)]).
  Alternated save with/without cached UUID. 800 samples → both=400, neither=400, torn=0.
  Base recoveryHints[0] preserved; STALE_MANIFEST_HINTS always appended as a pair (or omitted entirely on miss/catch).

### 4. Confirm auto-covered deliverables
expected: |
  All Phase 17 coverage deliverables are already green via automated tests. Confirm this matches reality from your perspective (local manifest cache + MCP tool + sync/diff + auto-hooks).

  Auto-covered (17-00 RED scaffolds):
  - D1 ManifestManager utility RED contract — src/utils/manifest.test.ts
  - D2 manifest MCP tool action RED scaffolds — src/mcp/tools/manifest.test.ts
  - D3 resolveProjectRoot walk-up RED scaffolds — src/utils/project-root.test.ts

  Auto-covered (17-01 ManifestManager):
  - D1 load/save/upsert/remove/hasUuid atomic write + strict schemas (MAN-01)
  - D2 ensureGitignore appends `.coolify/` on first write (MAN-02)
  - D3 resolveProjectRoot + COOLIFY_MCP_TEST_WORKSPACE seam
  - D4 autoUpsert/autoRemove propagate disk errors
  - D5 `.coolify-manifest.example.json` placeholder template, no secrets

  Auto-covered (17-02 manifest MCP tool):
  - D1 manifest tool 7 actions registered in server.ts (MAN-03)
  - D2 manifest.sync remote-wins + dry_run + prune confirm (MAN-03)
  - D3 404 stale-manifest recovery hints (MAN-04)

  Auto-covered (17-03 mutation auto-hooks):
  - D1 application create/update/delete auto-upsert/remove + manifestWarning
  - D2 service create/update/delete auto-upsert/remove + manifestWarning
  - D3 database create/update/delete auto-upsert/remove + manifestWarning
result: pass

### 5. ManifestManager utility RED contract (load/upsert/remove/gitignore/hasUuid/atomic/autoUpsert)
expected: ManifestManager utility RED contract (load/upsert/remove/gitignore/hasUuid/atomic/autoUpsert)
result: pass
source: automated
coverage_id: 17-00-D1

### 6. manifest MCP tool action RED scaffolds (get/upsert/set/remove/clear/sync/diff)
expected: manifest MCP tool action RED scaffolds (get/upsert/set/remove/clear/sync/diff)
result: pass
source: automated
coverage_id: 17-00-D2

### 7. resolveProjectRoot walk-up RED scaffolds (.git, package.json, .coolify, fallback, env seam)
expected: resolveProjectRoot walk-up RED scaffolds (.git, package.json, .coolify, fallback, env seam)
result: pass
source: automated
coverage_id: 17-00-D3

### 8. ManifestManager load/save/upsert/remove/hasUuid with atomic write and strict schemas
expected: ManifestManager load/save/upsert/remove/hasUuid with atomic write and strict schemas
result: pass
source: automated
coverage_id: 17-01-D1

### 9. ensureGitignore auto-appends .coolify/ on first write, idempotent on second
expected: ensureGitignore auto-appends .coolify/ on first write, idempotent on second
result: pass
source: automated
coverage_id: 17-01-D2

### 10. resolveProjectRoot walk-up and COOLIFY_MCP_TEST_WORKSPACE test seam
expected: resolveProjectRoot walk-up and COOLIFY_MCP_TEST_WORKSPACE test seam
result: pass
source: automated
coverage_id: 17-01-D3

### 11. autoUpsert/autoRemove propagate disk errors to caller (not swallowed)
expected: autoUpsert/autoRemove propagate disk errors to caller (not swallowed)
result: pass
source: automated
coverage_id: 17-01-D4

### 12. Committed example manifest template with placeholder UUIDs, no secrets
expected: Committed example manifest template with placeholder UUIDs, no secrets
result: pass
source: automated
coverage_id: 17-01-D5

### 13. manifest MCP tool with 7 actions registered in server.ts
expected: manifest MCP tool with 7 actions registered in server.ts
result: pass
source: automated
coverage_id: 17-02-D1

### 14. manifest.sync reconciles against live API with dry_run and prune confirm gates
expected: manifest.sync reconciles against live API with dry_run and prune confirm gates
result: pass
source: automated
coverage_id: 17-02-D2

### 15. 404 on manifest-cached UUID surfaces manifest.sync/diff recovery hints
expected: 404 on manifest-cached UUID surfaces manifest.sync/diff recovery hints
result: pass
source: automated
coverage_id: 17-02-D3

### 16. Application create/update/delete auto-upsert/remove with manifestWarning on hook failure
expected: Application create/update/delete auto-upsert/remove with manifestWarning on hook failure
result: pass
source: automated
coverage_id: 17-03-D1

### 17. Service create/update/delete auto-upsert/remove with manifestWarning on hook failure
expected: Service create/update/delete auto-upsert/remove with manifestWarning on hook failure
result: pass
source: automated
coverage_id: 17-03-D2

### 18. Database create/update/delete auto-upsert/remove with manifestWarning on hook failure
expected: Database create/update/delete auto-upsert/remove with manifestWarning on hook failure
result: pass
source: automated
coverage_id: 17-03-D3

## Summary

total: 18
passed: 18
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps
