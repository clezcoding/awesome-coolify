---
status: complete
phase: 23-openapi-coverage-npm-release
source:
  - 23-00-SUMMARY.md
  - 23-01-SUMMARY.md
  - 23-02-SUMMARY.md
  - 23-03-SUMMARY.md
  - 23-04-SUMMARY.md
started: 2026-07-27T03:05:03Z
updated: 2026-07-27T03:06:14Z
---

## Current Test

[testing complete]

## Tests

### 1. openapi-coverage RED scaffolds (indexOpenApiOperations, classifyRows, assertCoverageFresh)
expected: openapi-coverage RED scaffolds (indexOpenApiOperations, classifyRows, assertCoverageFresh)
result: pass
source: automated
coverage_id: D1

### 2. Four-bucket classification fixture intent (covered/deferred/out-of-scope/gap)
expected: Four-bucket classification fixture intent (covered/deferred/out-of-scope/gap)
result: pass
source: automated
coverage_id: D2

### 3. npm pack allowlist RED scaffolds (forbidden prefixes + allowed surface)
expected: npm pack allowlist RED scaffolds (forbidden prefixes + allowed surface)
result: pass
source: automated
coverage_id: D3

### 4. OpenAPI operation index via Scalar dereference (>=136 ops)
expected: OpenAPI operation index via Scalar dereference (>=136 ops)
result: pass
source: automated
coverage_id: D1

### 5. Four-bucket classifyRows (covered/deferred/out-of-scope/gap)
expected: Four-bucket classifyRows (covered/deferred/out-of-scope/gap)
result: pass
source: automated
coverage_id: D2

### 6. Committed COVERAGE.md drift gate (--check + assertCoverageFresh)
expected: Committed COVERAGE.md drift gate (--check + assertCoverageFresh)
result: pass
source: automated
coverage_id: D3

### 7. OpenAPI spec pinned to Coolify v4.1.2 with provenance doc
expected: OpenAPI spec pinned to Coolify v4.1.2 with provenance doc
result: pass
source: automated
coverage_id: D1

### 8. Full 115-action coverage-map with overrides and four-bucket report
expected: Full 115-action coverage-map with overrides and four-bucket report
result: pass
source: automated
coverage_id: D2

### 9. npm pack tarball excludes forbidden maintainer/UAT/planning/OpenAPI paths (D-13)
expected: npm pack tarball excludes forbidden maintainer/UAT/planning/OpenAPI paths (D-13)
result: pass
source: automated
coverage_id: D1

### 10. Tarball includes dist/, package.json, LICENSE, .env.example, README; no .env secrets
expected: Tarball includes dist/, package.json, LICENSE, .env.example, README; no .env secrets
result: pass
source: automated
coverage_id: D2

### 11. Pack allowlist gate wired into required CI via pnpm test (vitest default include)
expected: Pack allowlist gate wired into required CI via pnpm test (vitest default include)
result: pass
source: automated
coverage_id: D3

### 12. Changeset major bump awesome-coolify-mcp to 1.0.0 per D-10
expected: Changeset major bump awesome-coolify-mcp to 1.0.0 per D-10
result: pass
source: automated
coverage_id: D1

### 13. release.yml OIDC contract unchanged (id-token: write, changeset:emit-tag)
expected: release.yml OIDC contract unchanged (id-token: write, changeset:emit-tag)
result: pass
source: automated
coverage_id: D2

### 14. npm Trusted Publisher auf npmjs.com konfiguriert
expected: |
  Auf npmjs.com ist Trusted Publisher für das Package awesome-coolify-mcp
  so konfiguriert, dass GitHub Actions Workflow release.yml (OIDC) publishen darf.
  Dashboard-Einstellung liegt außerhalb von Git — manuell prüfen/bestätigen.
result: pass
coverage_id: D3
rationale: Dashboard config outside git — human typed approved at checkpoint
reason: human_judgment

## Summary

total: 14
passed: 14
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none yet]
