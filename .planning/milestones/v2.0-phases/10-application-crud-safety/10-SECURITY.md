---
phase: 10
slug: application-crud-safety
status: verified
threats_open: 0
asvs_level: 1
created: 2026-07-19
---

# Phase 10 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|----------------|
| Agent → MCP application handlers | Untrusted tool args | Create/update/delete identity + config fields |
| MCP → Coolify Applications API | Authenticated HTTP | Bearer token; curated JSON payloads |
| Coolify 409/200 → MCP envelope | Response mapping | Domain conflicts (no secrets); masked projections |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-10-00-01 | Tampering | Test fixtures | low | accept | Test-only mocks; no production path | closed |
| T-10-SC | Tampering | npm installs | high | mitigate | No new packages in Phase 10 plans; zod/ofetch already pinned | closed |
| T-10-01-01 | Information Disclosure | 409 conflicts passthrough | low | accept | OpenAPI conflicts schema has no secrets | closed |
| T-10-01-02 | Tampering | Client payload construction | medium | mitigate | Handlers Zod-validate before client calls (SAF-03) | closed |
| T-10-01-03 | Spoofing | Bearer token reuse | low | accept | Existing createCoolifyClient auth unchanged | closed |
| T-10-02-01 | Tampering | create payload validation | high | mitigate | `createActionSchema` discriminatedUnion + `.strict()` / superRefine | closed |
| T-10-02-02 | Information Disclosure | instant_deploy soft-success | low | accept | Returns UUID + deploy status only | closed |
| T-10-02-03 | Denial of Service | instant_deploy fire-and-forget | medium | mitigate | Single `triggerDeploy`; no create-path polling | closed |
| T-10-02-04 | Repudiation | create audit trail | low | accept | Coolify server logs; MCP out of scope | closed |
| T-10-02-05 | Spoofing | project name resolution | medium | mitigate | Multi-match → `COOLIFY_AMBIGUOUS_MATCH` | closed |
| T-10-03-01 | Information Disclosure | basic-auth password | high | mitigate | `sanitizeFullProjection` masks unless `reveal:true` | closed |
| T-10-03-02 | Tampering | update payload validation | high | mitigate | Zod `.strict()` curated allowlist (D-13) | closed |
| T-10-03-03 | Spoofing | update identity resolution | medium | mitigate | `resolveAppMutationUuid` ambiguity gate | closed |
| T-10-03-04 | Tampering | force_domain_override | medium | accept | Flag alone gates override (D-11); documented | closed |
| T-10-03-05 | Information Disclosure | update 409 conflicts | low | accept | Domain/resource names only | closed |
| T-10-04-01 | Tampering | delete without confirm | high | mitigate | `validateDeleteConfirm` → `COOLIFY_CONFIRM_REQUIRED` | closed |
| T-10-04-02 | Tampering | unsafe delete defaults | high | mitigate | Zod defaults four delete flags to `false` (SAF-02) | closed |
| T-10-04-03 | Spoofing | delete identity resolution | medium | mitigate | Ambiguity refusal before DELETE | closed |
| T-10-04-04 | Repudiation | delete audit trail | low | accept | Coolify server logs; MCP out of scope | closed |
| T-10-04-05 | Information Disclosure | delete_preview children | low | accept | uuid/name/type only | closed |
| T-10-04-06 | Denial of Service | ambiguous name delete | medium | mitigate | `COOLIFY_AMBIGUOUS_MATCH` blocks mutation | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above `workflow.security_block_on` count toward `threats_open`*
*Disposition: mitigate · accept · transfer*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-10-01 | T-10-00-01 | Test fixtures only | plan disposition | 2026-07-19 |
| AR-10-02 | T-10-01-01 | OpenAPI 409 conflicts contain no secrets | plan disposition | 2026-07-19 |
| AR-10-03 | T-10-01-03 | Existing client auth unchanged | plan disposition | 2026-07-19 |
| AR-10-04 | T-10-02-02 | Soft-success surface has no secrets | plan disposition | 2026-07-19 |
| AR-10-05 | T-10-02-04 | Audit owned by Coolify server | plan disposition | 2026-07-19 |
| AR-10-06 | T-10-03-04 | `force_domain_override` intentional agent flag (D-11) | plan disposition | 2026-07-19 |
| AR-10-07 | T-10-03-05 | Conflicts passthrough safe | plan disposition | 2026-07-19 |
| AR-10-08 | T-10-04-04 | Delete audit owned by Coolify | plan disposition | 2026-07-19 |
| AR-10-09 | T-10-04-05 | Preview listing non-sensitive | plan disposition | 2026-07-19 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-07-19 | 21 | 21 | 0 | gsd-verify-work → secure-phase (ASVS L1) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-07-19
