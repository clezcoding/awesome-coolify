---
status: complete
phase: 16-coolify-cloud-server-branding
source: 16-00-SUMMARY.md, 16-01-SUMMARY.md, 16-02-SUMMARY.md, 16-03-SUMMARY.md, 16-04-SUMMARY.md
started: 2026-07-22T02:35:43.499Z
updated: 2026-07-22T02:42:23.279Z
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test
expected: Kill any running MCP/server process for this project. Clear ephemeral state if any. Start fresh (e.g. reload Cursor MCP or run the package entry). Server boots without errors; a primary query (meta/version, instance.cloud-info, or health-style tool call) returns live structured data.
result: pass

### 2. Cursor MCP server list shows branded icon
expected: After MCP server is configured/running in Cursor, the MCP server list shows the Awesome Coolify branded 192×192 icon (or you confirm the documented client limitation if the custom icon does not render).
result: pass
coverage_id: D6
rationale: Visual MCP client list appearance deferred to Plan 16-04 D-09 verify gate
note: User confirmed client limitation — custom icon does not render for stdio MCP; hypothesized HTTPS MCP only

### 3. D-09 Cursor MCP list icon verify — documented client limitation
expected: docs/assets/cursor-icon-verify.md (+ screenshot) documents that Cursor may not render custom serverInfo.icons despite a 200 jsDelivr asset — acceptable documented limitation per RESEARCH Pitfall 2 (not treated as icon PASS).
result: pass
coverage_id: D4
rationale: Human verified Cursor UI; custom icon does not render despite serverInfo.icons + jsDelivr 200 — acceptable documented limitation per RESEARCH Pitfall 2

### 4. McpServer branding metadata RED scaffolds (title, description, websiteUrl, icons)
expected: McpServer branding metadata RED scaffolds (title, description, websiteUrl, icons)
result: pass
source: automated
coverage_id: D1

### 5. package.json description parity scaffold (BRND-03)
expected: package.json description parity scaffold (BRND-03)
result: pass
source: automated
coverage_id: D2

### 6. Cloud hostname 403/404 error mapping RED scaffolds (CLD-02)
expected: Cloud hostname 403/404 error mapping RED scaffolds (CLD-02)
result: pass
source: automated
coverage_id: D3

### 7. Self-hosted hostname unaffected by cloud error codes (D-03)
expected: Self-hosted hostname unaffected by cloud error codes (D-03)
result: pass
source: automated
coverage_id: D4

### 8. instance.cloud-info action RED scaffolds (env/registry/infer sources, D-16/D-17)
expected: instance.cloud-info action RED scaffolds (env/registry/infer sources, D-16/D-17)
result: pass
source: automated
coverage_id: D5

### 9. CoolifyErrorCode union includes COOLIFY_CLOUD_FORBIDDEN and COOLIFY_CLOUD_UNSUPPORTED
expected: CoolifyErrorCode union includes COOLIFY_CLOUD_FORBIDDEN and COOLIFY_CLOUD_UNSUPPORTED
result: pass
source: automated
coverage_id: D1

### 10. RECOVERY_HINTS entries for cloud codes with actionable EN hints
expected: RECOVERY_HINTS entries for cloud codes with actionable EN hints
result: pass
source: automated
coverage_id: D2

### 11. Cloud hostname HTTP 403 → COOLIFY_CLOUD_FORBIDDEN with team-scoped token hints
expected: Cloud hostname HTTP 403 → COOLIFY_CLOUD_FORBIDDEN with team-scoped token hints
result: pass
source: automated
coverage_id: D3

### 12. Cloud hostname HTTP 404 → COOLIFY_CLOUD_UNSUPPORTED with endpoint hints
expected: Cloud hostname HTTP 404 → COOLIFY_CLOUD_UNSUPPORTED with endpoint hints
result: pass
source: automated
coverage_id: D4

### 13. Self-hosted hostname 403 does not map to COOLIFY_CLOUD_* codes (D-03)
expected: Self-hosted hostname 403 does not map to COOLIFY_CLOUD_* codes (D-03)
result: pass
source: automated
coverage_id: D5

### 14. instanceActionSchema accepts cloud-info with optional instance param
expected: instanceActionSchema accepts cloud-info with optional instance param
result: pass
source: automated
coverage_id: D1

### 15. cloud-info env path returns source env and isCloud from hostname
expected: cloud-info env path returns source env and isCloud from hostname
result: pass
source: automated
coverage_id: D2

### 16. cloud-info registry path with named instance returns source registry
expected: cloud-info registry path with named instance returns source registry
result: pass
source: automated
coverage_id: D3

### 17. cloud-info infer fallback to https://app.coolify.io when no creds
expected: cloud-info infer fallback to https://app.coolify.io when no creds
result: pass
source: automated
coverage_id: D4

### 18. cloud-info response includes setupHints, knownLimits, docsLink
expected: cloud-info response includes setupHints, knownLimits, docsLink
result: pass
source: automated
coverage_id: D5

### 19. unknown instance name returns COOLIFY_INSTANCE_NOT_FOUND
expected: unknown instance name returns COOLIFY_INSTANCE_NOT_FOUND
result: pass
source: automated
coverage_id: D6

### 20. Dedicated 192x192 MCP list icon PNG committed to docs/assets/
expected: Dedicated 192x192 MCP list icon PNG committed to docs/assets/
result: pass
source: automated
coverage_id: D1

### 21. docs/assets/README.md lists mcp-icon-192.png with jsDelivr URL
expected: docs/assets/README.md lists mcp-icon-192.png with jsDelivr URL
result: pass
source: automated
coverage_id: D2

### 22. McpServer constructor passes title Awesome Coolify
expected: McpServer constructor passes title Awesome Coolify
result: pass
source: automated
coverage_id: D3

### 23. McpServer constructor passes websiteUrl and description from package.json
expected: McpServer constructor passes websiteUrl and description from package.json
result: pass
source: automated
coverage_id: D4

### 24. McpServer constructor passes icons array with jsDelivr PNG, mimeType, sizes
expected: McpServer constructor passes icons array with jsDelivr PNG, mimeType, sizes
result: pass
source: automated
coverage_id: D5

### 25. docs/en/cloud.md and docs/de/cloud.md with setup, smoke, limits, error codes
expected: docs/en/cloud.md and docs/de/cloud.md with setup, smoke, limits, error codes
result: pass
source: automated
coverage_id: D1

### 26. README EN/DE Coolify Cloud quick overview sections linking to topic docs
expected: README EN/DE Coolify Cloud quick overview sections linking to topic docs
result: pass
source: automated
coverage_id: D2

### 27. CONVENTIONS.md Repository Model single-repo; dual-repo sync retired
expected: CONVENTIONS.md Repository Model single-repo; dual-repo sync retired
result: pass
source: automated
coverage_id: D3

## Summary

total: 27
passed: 27
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none yet]
