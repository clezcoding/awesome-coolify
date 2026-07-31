---
phase: 28
slug: instance-intelligence
status: verified
threats_open: 0
asvs_level: 1
created: 2026-07-30
---

# Phase 28 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| MCP client → intelligence tool | Untrusted agent args (uuid, targets, confirm, delete flags) | Resource UUIDs, confirm booleans, cleanup targets |
| Coolify API → MCP | Inventory payloads from trusted-enough upstream API | Deployment/backup/resource records |
| Coolify payloads → scorecard/graph | Untrusted strings in findings and node metadata | Status strings, names, error messages |
| MCP client → cleanup | Destructive mutation gate | targets[], confirm, delete_volumes, delete_configurations |
| intelligence.cleanup → domain delete handlers | Internal trusted reuse with SAF-02 defaults | Delete args forwarded to application/service/database handlers |
| Impact/janitor → agent | Advisory read-only surfaces | Suggestions, orphan hints — no mutations without cleanup+confirm |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-28-01 | Tampering | intelligence.cleanup confirm | high | mitigate | `validateConfirmGate` requires `confirm === true`; else `COOLIFY_CONFIRM_REQUIRED` (D-13) | closed |
| T-28-02 | Destruction | delete_volumes / delete_configurations | high | mitigate | `delete_volumes ?? false`, `delete_configurations ?? false` (SAF-02, D-14) | closed |
| T-28-03 | Elevation | cleanup targets | high | mitigate | Non-empty `targets[]` required; no fleet-wide wipe action | closed |
| T-28-04 | Spoofing | resource-graph edges / orphan detection | medium | mitigate | UUID-only primary edges (`database_uuid`, `application_uuid`); zero inbound degree for orphans (D-08) | closed |
| T-28-05 | Info disclosure | scorecard/graph node payloads | low | mitigate | `redactSecrets` on errors; nodes project uuid/type/name/status/project/environment only | closed |
| T-28-06 | Denial of service | N+1 scorecard fetches | medium | mitigate | `SAMPLE_CAP = 50`, `SAMPLE_CONCURRENCY = 5`, `partial` flag on overflow | closed |
| T-28-07 | Tampering | impact advice | medium | mitigate | `advisory: true` in impact response; callers must use domain tools (D-10) | closed |
| T-28-08 | Repudiation | batch cleanup results | low | mitigate | Per-item `results[]` with `ok`/`error` for auditability | closed |
| T-28-SC | Tampering | npm installs | low | accept | No new packages added in Phase 28 | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|--------|
| AR-28-SC | T-28-SC | Phase 28 adds no new npm dependencies; supply-chain risk unchanged from baseline | Phase 28 PLAN (28-00..28-04) | 2026-07-30 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-07-30 | 9 | 9 | 0 | gsd-secure-phase (L1 grep verification) |

### Security Audit 2026-07-30

| Metric | Count |
|--------|-------|
| Threats found | 9 |
| Closed | 9 |
| Open | 0 |

**Evidence summary (L1):**

- T-28-01: `src/mcp/tools/intelligence.ts:852-856` (`validateConfirmGate`); test `intelligence.test.ts:533`
- T-28-02: `src/mcp/tools/intelligence.ts:858-859`; test `intelligence.test.ts:557`
- T-28-03: `src/mcp/tools/intelligence.ts:839-849` (empty targets → `COOLIFY_VALIDATION_ERROR`)
- T-28-04: `src/utils/resource-graph.ts:62-97`, `399-478` (UUID-only edges, inbound-degree orphans)
- T-28-05: `src/mcp/tools/intelligence.ts:105` (`redactSecrets`); `src/utils/resource-graph.ts:143-166` (projected node fields)
- T-28-06: `src/mcp/tools/intelligence.ts:56-57`, `183-268` (cap 50, concurrency 5, partial)
- T-28-07: `src/mcp/tools/intelligence.ts:733` (`advisory: true`)
- T-28-08: `src/mcp/tools/intelligence.ts:861-915` (per-item `results[]`)
- T-28-SC: `package.json` dependencies unchanged (no new packages)

**Unregistered flags:** None — all SUMMARY.md Threat Flags sections report no new attack surface beyond plan threat model.

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-07-30
