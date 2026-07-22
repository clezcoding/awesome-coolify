---
phase: 11
slug: service-database-crud
status: verified
threats_open: 0
asvs_level: 1
created: 2026-07-19
---

# Phase 11 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|----------------|
| Agent → MCP service/database handlers | Untrusted tool args | Create/update/delete identity, compose YAML, engine config, public-access flags |
| MCP → Coolify Services/Databases API | Authenticated HTTP | Bearer token; curated JSON payloads; base64 compose encoding internal only |
| Coolify 409/200 → MCP envelope | Response mapping | Domain conflicts (no secrets); masked DB credentials and compose unless `reveal:true` |
| Local filesystem → MCP | Compose file read | Bounded path (`compose_file`); extension allowlist, realpath containment, 1 MiB cap |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-11-01 | Spoofing/EoP | Service create scoping | high | mitigate | `requireProjectAndEnvironment` → `COOLIFY_VALIDATION_ERROR` (D-03) | closed |
| T-11-02 | Tampering | Service create source | medium | mitigate | `requireServiceCreateSource` enforces type XOR compose, compose XOR compose_file (D-04) | closed |
| T-11-03 | Tampering | Compose validation | medium | mitigate | `validateCompose` before `encodeCompose`/API on create/update (D-07) | closed |
| T-11-04 | Information Disclosure | Compose projection | high | mitigate | `projectServiceCompose` strips `docker_compose_raw` and `docker_compose` on all paths (D-06) | closed |
| T-11-05 | Tampering | Service action validation | high | mitigate | `parseServiceAction` Zod safeParse before any API call (D-17/SAF-03) | closed |
| T-11-06 | Tampering | Service update payload | high | mitigate | Update schema `.strict()` + `SERVICE_UPDATE_CURATED_FIELD_KEYS` allowlist | closed |
| T-11-07 | Tampering | Service delete confirm | high | mitigate | `validateDeleteConfirm` → `COOLIFY_CONFIRM_REQUIRED` (D-15) | closed |
| T-11-08 | Tampering | Service safe delete defaults | high | mitigate | Delete flags default `false` (D-16/SAF-02) | closed |
| T-11-09 | Spoofing | Service identity resolution | medium | mitigate | `resolveServiceMutationUuid` → `COOLIFY_AMBIGUOUS_MATCH` on multi-match (D-18) | closed |
| T-11-10 | Information Disclosure | Domain 409 conflicts | medium | mitigate | 409 conflicts extracted + `force_domain_override` hint (D-19/SVC-10) | closed |
| T-11-11 | Denial of Service | Service instant deploy | medium | mitigate | Single `triggerServiceStart`; no poll loop (D-11) | closed |
| T-11-12 | Tampering/Path Traversal | Compose file read | high | mitigate | `readBoundedComposeFile`: extension allowlist, realpath containment, 1 MiB cap | closed |
| T-11-13 | Spoofing/EoP | Database create scoping | high | mitigate | `requireProjectAndEnvironment` → `COOLIFY_VALIDATION_ERROR` (D-10) | closed |
| T-11-14 | Information Disclosure/EoP | Public DB create | high | mitigate | `requireConfirmForPublicAccess` → `COOLIFY_CONFIRM_REQUIRED` when `is_public:true` without confirm (D-12) | closed |
| T-11-15 | Information Disclosure | Public DB update | high | mitigate | `requireConfirmForPublicAccess` applied to update schema (D-12 mirror) | closed |
| T-11-16 | Information Disclosure | Credential masking | high | mitigate | `sanitizeFullProjection` masks secrets unless `reveal:true` (D-09/D-10/SAF-04) | closed |
| T-11-17 | Tampering | Database action validation | high | mitigate | `parseDatabaseAction` Zod safeParse before API (D-17/SAF-03) | closed |
| T-11-18 | Tampering | Database update payload | high | mitigate | Update `.strict()` + `DATABASE_UPDATE_CURATED_FIELD_KEYS` allowlist | closed |
| T-11-19 | Tampering | Database delete confirm | high | mitigate | `validateDeleteConfirm` → `COOLIFY_CONFIRM_REQUIRED` (D-15) | closed |
| T-11-20 | Tampering | Database safe delete defaults | high | mitigate | Delete flags default `false` (D-16/SAF-02) | closed |
| T-11-21 | Spoofing | Database identity resolution | medium | mitigate | `resolveDatabaseUuid` → `COOLIFY_AMBIGUOUS_MATCH` on multi-match (D-18) | closed |
| T-11-22 | Denial of Service | Database instant deploy | medium | mitigate | Single `triggerDatabaseStart`; no poll loop (D-11) | closed |
| T-11-23 | Information Disclosure | Compose masking | medium | mitigate | `maskComposeIfNeeded` replaces compose with `'***'` unless `reveal:true` (SAF-04) | closed |
| T-11-24 | Spoofing | Bearer token reuse | low | accept | Existing `createCoolifyClient` auth unchanged | closed |
| T-11-25 | Information Disclosure | Error redaction | medium | mitigate | `wrapMcpError` + `onRequestError` redact message/hints/data | closed |
| T-11-26 | Information Disclosure | Soft-success surface | low | accept | Returns UUID + redacted error only; no secrets (D-13) | closed |
| T-11-27 | Information Disclosure | Service delete_preview | low | accept | Preview returns uuid/name/type only | closed |
| T-11-28 | Information Disclosure | Database delete_preview | low | accept | Preview returns uuid/name/type only | closed |
| T-11-29 | Repudiation | Mutation audit trail | low | accept | Audit owned by Coolify server; MCP out of scope | closed |
| T-11-30 | Tampering | Test fixtures | low | accept | Test-only mocks; no production path | closed |
| T-11-31 | Information Disclosure | 409 conflict passthrough | low | accept | Conflicts extracted + redacted; OpenAPI schema has no secrets | closed |
| T-11-32 | Tampering | force_domain_override | medium | accept | Flag-alone gate documented (D-19); no extra confirm | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above `workflow.security_block_on` count toward `threats_open`*
*Disposition: mitigate · accept · transfer*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-11-01 | T-11-24 | Existing client auth unchanged (mirrors AR-10-03) | retroactive-STRIDE audit | 2026-07-19 |
| AR-11-02 | T-11-26 | Soft-success surface has no secrets (D-13) | retroactive-STRIDE audit | 2026-07-19 |
| AR-11-03 | T-11-27 | Preview listing non-sensitive | retroactive-STRIDE audit | 2026-07-19 |
| AR-11-04 | T-11-28 | Preview listing non-sensitive | retroactive-STRIDE audit | 2026-07-19 |
| AR-11-05 | T-11-29 | Audit owned by Coolify server | retroactive-STRIDE audit | 2026-07-19 |
| AR-11-06 | T-11-30 | Test fixtures only | retroactive-STRIDE audit | 2026-07-19 |
| AR-11-07 | T-11-31 | 409 conflicts redacted; no secrets in schema | retroactive-STRIDE audit | 2026-07-19 |
| AR-11-08 | T-11-32 | `force_domain_override` intentional agent flag (D-19) | retroactive-STRIDE audit | 2026-07-19 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-07-19 | 32 | 32 | 0 | gsd-security-auditor (retroactive-STRIDE, ASVS L1) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-07-19
