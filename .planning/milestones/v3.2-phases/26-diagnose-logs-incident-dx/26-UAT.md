---
status: complete
phase: 26-diagnose-logs-incident-dx
source:
  - 26-01-SUMMARY.md
  - 26-02-SUMMARY.md
  - 26-03-SUMMARY.md
started: 2026-07-28T03:27:00Z
updated: 2026-07-28T03:37:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Live-Bestätigung diagnose.logs & Incident DX
expected: Gegen laufenden MCP + Coolify-Instanz: diagnose.logs mode full/logs-only/deployment_uuid, diagnose_logs capability, incident-Prompt + coolify-setup Troubleshooting
result: pass

### 2. diagnose.logs schema defaults, XOR, soft partial (26-01-D1)
expected: diagnose.logs schema defaults, XOR, mode full/logs-only, soft partial, empty hint
result: pass
source: automated
coverage_id: 26-01-D1

### 3. buildRuntimeLogPayload shared helper (26-01-D2)
expected: buildRuntimeLogPayload slice/cap envelope shared with application.logs
result: pass
source: automated
coverage_id: 26-01-D2

### 4. application.logs runtime unchanged (26-01-D3)
expected: application.logs runtime golden paths unchanged after OBS-03 extraction
result: pass
source: automated
coverage_id: 26-01-D3

### 5. diagnoseActionsCatalog logs action (26-01-D4)
expected: diagnoseActionsCatalog lists logs action for openapi coverage map parity
result: pass
source: automated
coverage_id: 26-01-D4

### 6. Incident prompt diagnose.logs (26-02-D1)
expected: Incident prompt uses diagnose.logs mode full; cites deployment.logs, follow, guardrail
result: pass
source: automated
coverage_id: 26-02-D1

### 7. diagnose_logs capability key (26-02-D2)
expected: system.version exposes diagnose_logs sixth capability key
result: pass
source: automated
coverage_id: 26-02-D2

### 8. README/coverage docs (26-02-D3)
expected: README EN/DE + COVERAGE.md document diagnose.logs and diagnose_logs
result: pass
source: automated
coverage_id: 26-02-D3

### 9. coolify-setup troubleshooting section (26-03-D1)
expected: coolify-setup has standalone App log troubleshooting after setup flow with capability check and diagnose.logs
result: pass
source: automated
coverage_id: 26-03-D1

### 10. Sibling skill links (26-03-D2)
expected: Section links to coolify-incident, coolify-deploy, coolify-diagnose sibling skills
result: pass
source: automated
coverage_id: 26-03-D2

### 11. OBS-03 regression (26-03-D3)
expected: application.logs runtime golden paths unchanged after Phase 26 handler work (OBS-03)
result: pass
source: automated
coverage_id: 26-03-D3

## Summary

total: 11
passed: 11
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none]

## Deferred Follow-Ups

- test: out-of-scope
  idea: "diagnose.app mit name/query wirft t?.has is not a function — uuid-Pfad OK"
  deferred_at: 2026-07-28
  note: Operator-Nebenbefund, nicht Phase-26-Scope (diagnose.logs / incident DX)
