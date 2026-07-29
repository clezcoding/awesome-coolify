---
status: complete
phase: 24-capabilities-deployment-logs
source:
  - 24-00-SUMMARY.md
  - 24-01-SUMMARY.md
  - 24-02-SUMMARY.md
  - 24-03-SUMMARY.md
started: 2026-07-27T22:15:00Z
updated: 2026-07-27T22:42:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Live-Bestätigung Capabilities & Deployment Logs
expected: system.version capabilities + meta.version ohne capabilities + deployment.logs live gegen Coolify-Instanz (siehe Current Test)
result: pass

### 2. system.version RED scaffolds (24-00)
expected: system.version RED scaffolds for coolifyVersion/mcpVersion/serverName/capabilities + four D-03 keys
result: pass
source: automated
coverage_id: D1

### 3. meta.version RED scaffold (24-00)
expected: meta.version RED scaffold for readPackageVersion() parity
result: pass
source: automated
coverage_id: D2

### 4. deployment.logs RED scaffolds (24-00)
expected: deployment.logs RED scaffolds (schema XOR, fetch, latest, no-deployments, empty logs, sensitive-required)
result: pass
source: automated
coverage_id: D3

### 5. COOLIFY_NO_DEPLOYMENTS scaffold (24-00)
expected: COOLIFY_NO_DEPLOYMENTS recovery hints scaffold
result: pass
source: automated
coverage_id: D4

### 6. coverage-map deployment.logs row (24-00)
expected: coverage-map.yaml deployment.logs row
result: pass
source: automated
coverage_id: D5

### 7. system.version shape + capabilities (24-01)
expected: system.version returns coolifyVersion, mcpVersion, serverName, and four-key capabilities map
result: pass
source: automated
coverage_id: D1

### 8. meta.version package-backed (24-01)
expected: meta.version returns package-backed mcpVersion without capabilities
result: pass
source: automated
coverage_id: D2

### 9. COOLIFY_412_CAPABILITIES table (24-01)
expected: Static COOLIFY_412_CAPABILITIES table with four D-03 keys all supported on 4.1.2
result: pass
source: automated
coverage_id: D3

### 10. deployment.logs by deployment_uuid (24-02)
expected: deployment.logs fetches build logs by deployment_uuid with logs_lines envelope
result: pass
source: automated
coverage_id: D1

### 11. deployment.logs latest by application_uuid (24-02)
expected: application_uuid resolves newest deployment by created_at (dep-3)
result: pass
source: automated
coverage_id: D2

### 12. COOLIFY_NO_DEPLOYMENTS error (24-02)
expected: Empty deployments return COOLIFY_NO_DEPLOYMENTS with deploy/list recovery hints
result: pass
source: automated
coverage_id: D3

### 13. Empty logs soft OK (24-02)
expected: Empty logs string returns soft OK with hint (D-16)
result: pass
source: automated
coverage_id: D4

### 14. application.logs back-compat (24-02)
expected: application.logs build path unchanged via shared processor (D-11)
result: pass
source: automated
coverage_id: D5

### 15. COVERAGE.md regenerated (24-03)
expected: docs/COVERAGE.md regenerated with deployment.logs covered row
result: pass
source: automated
coverage_id: D1

### 16. README EN/DE discovery notes (24-03)
expected: README EN/DE note documents coolifyVersion rename, capabilities, deployment.logs steer
result: pass
source: automated
coverage_id: D2

### 17. Deploy prompt deployment.logs cite (24-03)
expected: Deploy prompt failure path cites deployment.logs for build log fetch
result: pass
source: automated
coverage_id: D3

## Summary

total: 17
passed: 17
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none yet]
