---
phase: 19
slug: dx-schemas-mcp-prompts
status: verified
threats_open: 0
asvs_level: 1
created: 2026-07-24
---

# Phase 19 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| MCP client → tool inputSchema | Untrusted agent/client; Zod validates before Coolify API | Action + optional fields; no credentials in schema |
| Tool schema → handler | Strict flat schema rejects unknown keys per action | Validated payload only |
| Handler → Coolify API | Only Zod-validated payloads reach outbound HTTPS | Sanitized API bodies |
| MCP client → prompts | Prompt handlers return guidance text from optional args | uuid/name/force strings only; no disk I/O |
| Catalog string → agent payload | Catalog param names must match schema field names | Static description metadata |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-19-01 | Tampering | createFlatActionSchema superRefine | high | mitigate | Strict z.object + per-action allowed/required fields → COOLIFY_VALIDATION_ERROR + recoveryHints (D-04) | closed |
| T-19-02 | Information Disclosure | parseWithInstanceRouting recoveryHints | medium | mitigate | recoveryHints list field/action names only — never credentials or response data | closed |
| T-19-03 | Spoofing | instance routing param | medium | accept | instance regex-validated in shared-read-params; flat schema preserves boundary | closed |
| T-19-04 | Information Disclosure | prompt message bodies | high | mitigate | Handlers compose from caller args only; soft Note without reading manifest from disk (D-10) | closed |
| T-19-05 | Tampering | prompt args | medium | mitigate | Optional z.string() args; force via strict `=== 'true'`; no eval/exec | closed |
| T-19-06 | Information Disclosure | tool description strings | low | accept | Static co-located catalog/footer constants; no user input | closed |
| T-19-07 | Denial of Service | prompt handler invocation | low | accept | Fixed-size messages array; no I/O loops | closed |
| T-19-08 | Tampering | actionsCatalog constants | high | mitigate | Catalog tokens use schema field names (env_uuid, entries); regression tests (CR-01, D-05) | closed |
| T-19-09 | Spoofing | agent payload composition | medium | mitigate | Catalog names align with actionRequiredFields/actionAllowedFields | closed |
| T-19-SC | Tampering | npm package installs | low | accept | No new packages; zod + MCP SDK already pinned | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-19-01 | T-19-03 | instance param validation unchanged from prior phases; flat schema preserves regex gate | plan threat_model | 2026-07-24 |
| AR-19-02 | T-19-06 | Description strings are static reviewed metadata | plan threat_model | 2026-07-24 |
| AR-19-03 | T-19-07 | Prompt handlers bounded by construction (fixed message count/size) | plan threat_model | 2026-07-24 |
| AR-19-04 | T-19-SC | No new npm deps in Phase 19; [SUS] on MCP SDK accepted in RESEARCH | plan threat_model | 2026-07-24 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-07-24 | 10 | 10 | 0 | gsd-verify-work → secure-phase (ASVS L1 short-circuit) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-07-24
