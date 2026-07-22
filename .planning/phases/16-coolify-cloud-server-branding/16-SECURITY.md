---
phase: 16
slug: coolify-cloud-server-branding
status: verified
threats_open: 0
asvs_level: 1
created: 2026-07-22
---

# Phase 16 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.
> Source: plan-time `<threat_model>` blocks in 16-00..16-04-PLAN.md (ASVS L1 short-circuit — all plan statuses `mitigated`, threats_open: 0).

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Coolify API (cloud) → error pipeline | ofetch FetchError; cloud detection hostname-only | request URL hostname, redacted message body |
| error pipeline → MCP client | Envelope + recoveryHints | redacted strings only (no tokens) |
| agent → cloud-info handler | Untrusted `instance` param | instance name; unknown → COOLIFY_INSTANCE_NOT_FOUND |
| cloud-info → local registry/env | Reads registry + env; no network | public URL, static hints — never token |
| MCP server → MCP client (initialize) | serverInfo metadata | public title/description/websiteUrl/icons |
| jsDelivr CDN → MCP client | Public icon fetch | HTTPS PNG asset |
| docs/README → user/agent | Cloud docs & README | placeholders only; public hostname app.coolify.io |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-16-00-SC | Tampering | npm/dev installs (none new) | high | accept | No new packages in Wave 0; vitest already pinned | closed |
| T-16-00-01 | Information Disclosure | test tmp registries with fake cloud tokens | low | mitigate | afterEach cleanup; throwaway tokens only | closed |
| T-16-00-02 | Tampering | test scaffolds assert package.json description | low | accept | Public metadata only; string compare | closed |
| T-16-01-01 | Information Disclosure | cloud error envelopes echoing URL/body with token | high | mitigate | sanitizeMessage/redactSecrets + wrapMcpError re-redact | closed |
| T-16-01-02 | Spoofing | self-hosted body crafted to look cloud-like | high | mitigate | isCloud from request URL hostname only (D-03) | closed |
| T-16-01-03 | Tampering | global mutable isCloud across concurrent requests | high | mitigate | isCloud computed per-error from fetchError.request | closed |
| T-16-01-04 | Information Disclosure | RECOVERY_HINTS leaking internal hostnames | low | accept | Public docs + app.coolify.io only | closed |
| T-16-01-SC | Tampering | npm installs (none new) | high | accept | No new external packages | closed |
| T-16-02-01 | Spoofing | unknown instance silently falling back | high | mitigate | COOLIFY_INSTANCE_NOT_FOUND for unknown names (D-17) | closed |
| T-16-02-02 | Information Disclosure | cloud-info echoing token | medium | mitigate | Returns url + static hints only — never token | closed |
| T-16-02-03 | Information Disclosure | cloud-info leaking internal hostnames | low | accept | Resolved instance URL already known to agent | closed |
| T-16-02-04 | Tampering | cloud-info live API / SSRF / token replay | high | mitigate | Local/static only — zero network (D-16) | closed |
| T-16-02-SC | Tampering | npm installs (none new) | high | accept | Reuses existing modules | closed |
| T-16-03-01 | Tampering | icon asset tampered on CDN | medium | accept | HTTPS jsDelivr from GitHub @main; CDN compromise out of scope | closed |
| T-16-03-02 | Information Disclosure | serverInfo leaking secrets | low | accept | Public metadata only | closed |
| T-16-03-03 | Spoofing | fingerprint via serverInfo | low | accept | Public by design | closed |
| T-16-03-04 | Tampering | jsDelivr @main cache lag / missing icon | medium | mitigate | Icon committed; D-09 verify gate documents client limit | closed |
| T-16-03-SC | Tampering | npm installs (none new) | high | accept | McpServer already imported | closed |
| T-16-04-01 | Information Disclosure | docs embedding real team tokens | high | mitigate | Placeholders `<team-scoped-token>` / `$COOLIFY_TOKEN` only | closed |
| T-16-04-02 | Information Disclosure | README leaking internal hostnames/teams | low | accept | Only public app.coolify.io | closed |
| T-16-04-03 | Tampering | CONVENTIONS dual-repo stale guidance | medium | mitigate | Single-repo rewrite per D-07 | closed |
| T-16-04-04 | Spoofing | docs implying cloud-info is live API probe | medium | mitigate | Documented local/static only (D-16) | closed |
| T-16-04-SC | Tampering | npm installs (none new) | high | accept | Docs/README/CONVENTIONS only | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Disposition: mitigate · accept · transfer*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-16-00-SC | T-16-00-SC | No new packages in Wave 0 | plan-time threat model | 2026-07-22 |
| AR-16-00-02 | T-16-00-02 | package.json description is public metadata | plan-time threat model | 2026-07-22 |
| AR-16-01-04 | T-16-01-04 | Hints reference public docs/host only | plan-time threat model | 2026-07-22 |
| AR-16-01-SC | T-16-01-SC | No new external packages | plan-time threat model | 2026-07-22 |
| AR-16-02-03 | T-16-02-03 | Resolved URL already known to agent | plan-time threat model | 2026-07-22 |
| AR-16-02-SC | T-16-02-SC | No new external packages | plan-time threat model | 2026-07-22 |
| AR-16-03-01 | T-16-03-01 | CDN/repo compromise out of scope for v1 | plan-time threat model | 2026-07-22 |
| AR-16-03-02 | T-16-03-02 | serverInfo is public metadata | plan-time threat model | 2026-07-22 |
| AR-16-03-03 | T-16-03-03 | Fingerprinting via public metadata by design | plan-time threat model | 2026-07-22 |
| AR-16-03-SC | T-16-03-SC | No new external packages | plan-time threat model | 2026-07-22 |
| AR-16-04-02 | T-16-04-02 | Only public hostname referenced | plan-time threat model | 2026-07-22 |
| AR-16-04-SC | T-16-04-SC | Docs-only change surface | plan-time threat model | 2026-07-22 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-07-22 | 23 | 23 | 0 | gsd-verify-work → secure-phase (ASVS L1 short-circuit) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-07-22
