---
phase: 24
slug: capabilities-deployment-logs
status: verified
threats_open: 0
asvs_level: 1
created: 2026-07-28
---

# Phase 24 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Agent → system.version | Untrusted MCP args (instance routing only) | Version JSON must not leak `COOLIFY_TOKEN` |
| system.version → Coolify GET /version | Authenticated Coolify call | Untrusted version string |
| readPackageVersion → filesystem | Trusted package root `package.json` only | `mcpVersion` string |
| Agent → deployment.logs | Untrusted uuids + log filter params | Build log lines (may contain secrets) |
| deployment.logs → Coolify GET /deployments/{uuid} | Authenticated; `api.sensitive` required for logs field | Raw build log blob |
| Test fixtures → handlers | Mocked Coolify API | No live tokens in asserts |
| coverage-map.yaml → CI | Declarative mapping only | No runtime secrets |
| README / prompts → agents | Public guidance | Must not overclaim APIs or embed secrets |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-24-00-01 | Information Disclosure | system.version JSON | low | mitigate | `system.test.ts` asserts serialized result excludes `COOLIFY_TOKEN` | closed |
| T-24-00-02 | Tampering | coverage-map.yaml | low | accept | Declarative row; Plan 24-03 regenerates `COVERAGE.md` under test | closed |
| T-24-01 | Information Disclosure | system.version JSON | medium | mitigate | Same token-exclusion asserts in `system.test.ts` (lines 96, 134, 182) | closed |
| T-24-02 | Elevation of Privilege | capabilities flags | medium | mitigate | `COOLIFY_412_CAPABILITIES` soft guidance only (D-04); tools stay registered; not a hard authz gate | closed |
| T-24-03 | Spoofing | mcpVersion filesystem | low | accept | `readPackageVersion` reads adjacent shipped `package.json` only | closed |
| T-24-10 | Information Disclosure | processDeploymentBuildLogs | high | mitigate | Non-string `logs` → `COOLIFY_403_SENSITIVE_REQUIRED`; tests in `deployment.test.ts` + `application.test.ts` | closed |
| T-24-11 | Tampering | crafted Coolify logs payload | medium | mitigate | `max_chars` cap in `processDeploymentBuildLogs`; no eval of log content | closed |
| T-24-12 | Denial of Service | large log blobs | medium | mitigate | `lines` / `max_chars` bounds via `sharedLogParamsSchema` Zod defaults | closed |
| T-24-13 | Elevation of Privilege | capability soft flags | low | accept | D-04: flags do not gate `deployment.logs` handler | closed |
| T-24-03-01 | Information Disclosure | README examples | low | mitigate | No real tokens or secret-bearing URLs in bilingual README examples | closed |
| T-24-03-02 | Spoofing | capability docs overclaim | medium | mitigate | README documents D-03 keys only; service/DB logs explicitly deferred | closed |
| T-24-SC | Tampering | npm/pip/cargo installs | low | accept | No new packages in Phase 24 | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above `workflow.security_block_on` count toward `threats_open`*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-24-01 | T-24-00-02 | `coverage-map.yaml` row is declarative; drift caught by OpenAPI coverage CI in Plan 24-03 | gsd-secure-phase L1 | 2026-07-28 |
| AR-24-02 | T-24-03 | `mcpVersion` sourced from shipped `package.json` adjacent to bundle — standard npm trust model | gsd-secure-phase L1 | 2026-07-28 |
| AR-24-03 | T-24-13 | Capability flags are discovery hints per D-04, not authorization enforcement | gsd-secure-phase L1 | 2026-07-28 |
| AR-24-04 | T-24-SC | Phase 24 added no new npm dependencies | gsd-secure-phase L1 | 2026-07-28 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-07-28 | 12 | 12 | 0 | gsd-secure-phase (L1 grep, ASVS L1 short-circuit) |

### Security Audit 2026-07-28

| Metric | Count |
|--------|-------|
| Threats found | 12 |
| Closed | 12 |
| Open | 0 |

**Method:** L1 grep-depth verification against implementation + tests. `register_authored_at_plan_time: true`, `asvs_level: 1`, `threats_open: 0` — auditor subagent skipped per workflow short-circuit.

**Key evidence:**
- Token leakage: `src/mcp/tools/system.test.ts` — `json.not.toContain(COOLIFY_TOKEN)`
- Sensitive logs gate: `src/utils/log-helpers.ts` `processDeploymentBuildLogs` → `COOLIFY_403_SENSITIVE_REQUIRED`
- Log bounds: `sharedLogParamsSchema` + `truncateLogs` path in log helpers
- Docs accuracy: README defers service/DB logs; cites `coolifyVersion` + `deployment.logs`

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-07-28
