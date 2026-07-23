---
status: complete
phase: 18-live-uat-harness
source: [18-01-SUMMARY.md, 18-02-SUMMARY.md, 18-03-SUMMARY.md, 18-04-SUMMARY.md]
started: 2026-07-23T18:45:24Z
updated: 2026-07-23T18:57:14Z
---

## Current Test

[testing complete]

## Tests

### 1. Exit codes 0/1/2 — live wave-gate run against UAT instance
expected: Exit codes 0/1/2 — live wave-gate run against UAT instance. Live MCP spawn requires configured UAT_PROJECT_UUID and Coolify credentials — deferred to verify-work gate
result: pass
coverage_id: D4
reason: human_judgment
notes: Live run via .cursor/mcp.json + UAT_PROJECT_UUID=h785essygwr360newm83inz6; exit 0 after tools/list scoring fix; 14 pass / 0 fail / 10 skip

### 2. Live wave-gate run against UAT instance with token redaction
expected: Live wave-gate run against UAT instance with token redaction. Live Coolify credentials and UAT_PROJECT_UUID required — deferred to verify-work gate
result: pass
coverage_id: D4
reason: human_judgment
notes: Live re-run via .cursor/mcp.json; exit 0; token absent from stdout/stderr/json/md

### 3. Declarative matrix covers all registerTool names plus tools/list stdio row and v3 mandatory rows
expected: Declarative matrix covers all registerTool names plus tools/list stdio row and v3 mandatory rows
result: pass
source: automated
coverage_id: D1

### 4. Harness skeleton resolves credentials without printing COOLIFY_TOKEN
expected: Harness skeleton resolves credentials without printing COOLIFY_TOKEN
result: pass
source: automated
coverage_id: D2

### 5. Matrix includes v3 manifest sync dry_run row for write/sync coverage without mutation
expected: Matrix includes v3 manifest sync dry_run row for write/sync coverage without mutation
result: pass
source: automated
coverage_id: D3

### 6. UAT_PROJECT_UUID identity gate aborts with exit 2 when unset or empty
expected: UAT_PROJECT_UUID identity gate aborts with exit 2 when unset or empty
result: pass
source: automated
coverage_id: D4

### 7. McpStdioClient spawns dist/index.js, drains NDJSON, 30s timeout, SIGTERM cleanup
expected: McpStdioClient spawns dist/index.js, drains NDJSON, 30s timeout, SIGTERM cleanup
result: pass
source: automated
coverage_id: D1

### 8. runStdioRows executes stdio matrix rows with pass/fail capture and token redaction
expected: runStdioRows executes stdio matrix rows with pass/fail capture and token redaction
result: pass
source: automated
coverage_id: D2

### 9. JSON stdout report with rows, summary, v3_gaps; optional --out + Markdown companion
expected: JSON stdout report with rows, summary, v3_gaps; optional --out + Markdown companion
result: pass
source: automated
coverage_id: D3

### 10. In-process runner dispatches matrix rows with flag gate and UAT identity scope
expected: In-process runner dispatches matrix rows with flag gate and UAT identity scope
result: pass
source: automated
coverage_id: D1

### 11. v3_gaps skip semantics for missing secondary instance, cloud, manifest preconditions
expected: v3_gaps skip semantics for missing secondary instance, cloud, manifest preconditions
result: pass
source: automated
coverage_id: D2

### 12. Merged hybrid report (stdio + in-process) with --full suite expansion
expected: Merged hybrid report (stdio + in-process) with --full suite expansion
result: pass
source: automated
coverage_id: D3

### 13. package.json scripts.uat:live maps to node scripts/live-uat.mjs
expected: package.json scripts.uat:live maps to node scripts/live-uat.mjs
result: pass
source: automated
coverage_id: D1

### 14. npm pack --dry-run excludes scripts/live-uat.mjs and scripts/live-uat.matrix.json
expected: npm pack --dry-run excludes scripts/live-uat.mjs and scripts/live-uat.matrix.json
result: pass
source: automated
coverage_id: D2

### 15. CONTRIBUTING.md Live UAT Harness section covers entry, preconditions, flags, reports, exit codes, v3_gaps, maintainer stance
expected: CONTRIBUTING.md Live UAT Harness section covers entry, preconditions, flags, reports, exit codes, v3_gaps, maintainer stance
result: pass
source: automated
coverage_id: D3

## Summary

total: 15
passed: 15
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none yet]
