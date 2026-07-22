---
phase: 08
slug: keys-server-crud
status: verified
threats_open: 0
asvs_level: 1
created: 2026-07-18
---

# Phase 8 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Agent → MCP private_key/server tools | Agent invokes CRUD on SSH keys and servers | PEM material (write-only on create), server credentials metadata |
| MCP → Coolify API | ofetch client with bearer token | API token, PEM on create, server config |
| MCP → local filesystem | `key_file` path on private_key.create | PEM file content via `readFileSync` (agent-trusted path) |
| Test process → mocked ofetch | Vitest mocks replace network layer | Fake PEM fixtures only — no real credentials |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-08-00-01 | Information Disclosure | test fixtures containing PEM strings | medium | mitigate | Fake PEM strings in test fixtures (`-----BEGIN FAKE KEY-----`); never real PEM material | closed |
| T-08-00-02 | Tampering | vi.mock('../../api/client.js') | low | accept | Mocks are test-only; no production code path altered | closed |
| T-08-01-01 | Information Disclosure | sanitizeFullProjection reveal=true path | high | mitigate | `PEM_FIELD_PATTERN` hard-mask runs even when reveal=true (D-02) | closed |
| T-08-01-02 | Tampering | deleteServer default delete_volumes | high | mitigate | Default `delete_volumes=false` in client; explicit query param sent (D-16) | closed |
| T-08-01-03 | Denial of Service | pollServerUntilReachable infinite loop | medium | mitigate | Hard 30s timeout default; returns last-seen server (D-05/D-07) | closed |
| T-08-01-04 | Information Disclosure | COOLIFY_409 dependent UUIDs in error data | low | accept | UUIDs are non-secret resource identifiers; redactEnvelopeData redacts secrets | closed |
| T-08-02-01 | Information Disclosure | create/update response echo PEM | critical | mitigate | Create response hardcoded to `{uuid, name, fingerprint?}`; update wrapped in stripPemFields | closed |
| T-08-02-02 | Information Disclosure | get/list full projection PEM leak | critical | mitigate | Routes through sanitizeFullProjection + stripPemFields (D-02/D-04) | closed |
| T-08-02-03 | Tampering | key_file path traversal | high | accept | MCP runs with user filesystem privileges; agent trusted to pass valid paths; no symlink resolution in v2.0 | closed |
| T-08-02-04 | Repudiation | delete without confirm | high | mitigate | Confirm gate (D-14) + COOLIFY_409 dependency check (D-15) | closed |
| T-08-02-05 | Elevation of Privilege | force-delete of in-use key | high | mitigate | No `force` param in schema (D-15) | closed |
| T-08-03-01 | Denial of Service | validate poll hangs on dead host | high | mitigate | 30s hard timeout in pollServerUntilReachable; soft-success pending state (D-05) | closed |
| T-08-03-02 | Tampering | delete server without confirm | high | mitigate | Confirm gate (D-14) + delete_preview warning (D-16) | closed |
| T-08-03-03 | Information Disclosure | server.get leaks validation_logs or proxy secrets | medium | mitigate | Full projection routed through sanitizeFullProjection (D-12) | closed |
| T-08-03-04 | Elevation of Privilege | unvalidated server used for deployments | medium | accept | Soft-success on unreachable preserves UUID for remediation (D-07); downstream deploy phases surface own validation | closed |
| T-08-03-05 | Tampering | delete_volumes default destroys volumes | high | mitigate | Default delete_volumes=false in schema and client (D-16) | closed |
| T-08-04-01 | Elevation of Privilege | private_key.delete without confirm | high | mitigate | Handler enforces confirm gate (08-02, D-14); registration is wiring only | closed |
| T-08-04-02 | Elevation of Privilege | server.delete delete_volumes=true by default | high | mitigate | Handler defaults delete_volumes=false (08-03, D-16) | closed |
| T-08-04-03 | Information Disclosure | tool descriptions in registerTool logs | low | accept | Descriptions document masking guarantees — intended disclosure for safe agent use | closed |
| T-08-05-01 | Information Disclosure | reveal:true on list leaks PEM | high | mitigate | Handler throws COOLIFY_422 before fetchPrivateKeys when reveal:true (D-11) | closed |
| T-08-05-02 | Tampering | widened list schema accepts unknown keys | medium | mitigate | listActionSchema keeps .strict() — only reveal and shared read params accepted | closed |
| T-08-05-03 | Denial of Service | handler-level rejection overhead | low | accept | One extra Zod parse + boolean check per list call; negligible | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-08-01 | T-08-00-02 | vi.mock replaces API client in tests only; no production code path altered. Standard vitest pattern. | gsd-security-auditor | 2026-07-18 |
| AR-08-02 | T-08-01-04 | COOLIFY_409 dependent server UUIDs are non-secret resource identifiers; redactEnvelopeData already redacts string secrets. | gsd-security-auditor | 2026-07-18 |
| AR-08-03 | T-08-02-03 | key_file uses readFileSync on agent-supplied path; MCP inherits user filesystem privileges. Agent is trusted to pass valid paths; no symlink resolution in v2.0. | gsd-security-auditor | 2026-07-18 |
| AR-08-04 | T-08-03-04 | Soft-success on SSH unreachable preserves server UUID for remediation (D-07); no auto-rollback. Downstream deploy phases enforce their own validation. | gsd-security-auditor | 2026-07-18 |
| AR-08-05 | T-08-04-03 | Tool descriptions document PEM masking and confirm-gate guarantees — intended disclosure to guide safe agent use. | gsd-security-auditor | 2026-07-18 |
| AR-08-06 | T-08-05-03 | Dual-layer D-11 rejection adds one Zod parse + boolean check per list call; negligible DoS surface. | gsd-security-auditor | 2026-07-18 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-07-18 | 19 | 19 | 0 | gsd-security-auditor (L1, ASVS-1) |

### Security Audit 2026-07-18

| Metric | Count |
|--------|-------|
| Threats found | 19 |
| Closed | 19 |
| Open | 0 |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-07-18
