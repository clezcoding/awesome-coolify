---
phase: 15
slug: multi-instance-registry-routing
status: verified
threats_open: 0
asvs_level: 1
created: 2026-07-22
---

# Phase 15 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| process → ~/.coolify-mcp/instances.json | Registry file on disk | API tokens, URLs, default pointer |
| agent → instance / tool args | Untrusted MCP params | instance slug, add/update/delete payloads |
| tool handler → resolveCredentials | Name → creds resolution | instance name, env overrides |
| handler → Coolify API | Per-request client | Resolved URL + token |
| test process → tmpdir | Scaffold/unit tests | Fake tokens in temp registries |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-15-00-SC | Tampering | npm/dev installs (vitest) | high | accept | No new packages in Wave 0; vitest already pinned | closed |
| T-15-00-01 | Information Disclosure | test tmp registries | low | mitigate | afterEach cleanup; throwaway tokens only | closed |
| T-15-01 | Information Disclosure | instances.json file perms | high | mitigate | mkdir/chmod 0o700; writeFile/chmod 0o600 every save | closed |
| T-15-02 | Information Disclosure | instance.list/get token field | high | mitigate | Redact token to `***` unless `reveal:true` | closed |
| T-15-03 | Tampering | concurrent saveRegistry writes | high | mitigate | Promise lock + temp+rename atomic write | closed |
| T-15-04 | Spoofing | unknown instance silent fallback | high | mitigate | `COOLIFY_INSTANCE_NOT_FOUND` — no silent fallback | closed |
| T-15-05 | Spoofing | partial env mixing | high | mitigate | `COOLIFY_PARTIAL_ENV` when only one of URL/TOKEN set | closed |
| T-15-06 | Information Disclosure | resolveCredentials error messages | medium | mitigate | wrapMcpError; no tokens in errors | closed |
| T-15-07 | Information Disclosure | instance.list/get echoing tokens | high | mitigate | Redaction at format time in instance.ts | closed |
| T-15-08 | Tampering | delete default/last instance | high | mitigate | confirm + force gates (D-04) | closed |
| T-15-09 | Denial of Service | crash on missing env at boot | high | mitigate | Soft-start boot; domain tools error at call time | closed |
| T-15-10 | Spoofing | import-env overwrite existing | medium | mitigate | add throws on duplicate name | closed |
| T-15-11 | Information Disclosure | envOverride meta flag | low | accept | Boolean only — not env values (D-17) | closed |
| T-15-12 | Information Disclosure | cross-instance via global client | high | mitigate | Fresh `createCoolifyClient` per request | closed |
| T-15-13 | Information Disclosure | creds in error messages | medium | mitigate | wrapMcpError redacts secrets | closed |
| T-15-14 | Denial of Service | mutation against wrong instance | high | mitigate | Per-request resolve + no silent fallback | closed |
| T-15-15 | Information Disclosure | read tool wrong instance | high | mitigate | Per-request resolve + no silent fallback | closed |
| T-15-SC | Tampering | npm installs | high | accept | No new external packages this phase | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above `workflow.security_block_on` count toward threats_open*
*Disposition: mitigate · accept · transfer*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-15-01 | T-15-00-SC / T-15-SC | No new npm packages; supply-chain risk unchanged from existing pinned deps | plan author | 2026-07-21 |
| AR-15-02 | T-15-11 | `_meta.envOverride` is a boolean presence signal, not credential values | plan author (D-17) | 2026-07-21 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-07-22 | 18 | 18 | 0 | gsd-secure-phase (ASVS L1 short-circuit; register authored at plan time) |
| 2026-07-22 | 18 | 18 | 0 | gsd-secure-phase re-run (L1 re-verify after review-fix; all mitigations present) |

## Security Audit 2026-07-22 (re-run)

| Metric | Count |
|--------|-------|
| Threats found | 18 |
| Closed | 18 |
| Open | 0 |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-07-22
