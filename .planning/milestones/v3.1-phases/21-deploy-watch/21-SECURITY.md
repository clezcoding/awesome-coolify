---
phase: 21
slug: deploy-watch
status: verified
threats_open: 0
asvs_level: 1
created: 2026-07-25
---

# Phase 21 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|----------------|
| MCP client → `deployment.watch` schema | Untrusted agent input; Zod + min≤max refine | `deployment_uuid`, timeout/interval bounds, `include_logs`, instance |
| Watch handler → Coolify REST API | Bearer via `resolveRoutingEnv`; poll GET only | Deployment UUID path; status JSON |
| HTTP error headers → `error.data` | Retry-After parsed as delay ms only | Finite `retry_after` milliseconds |
| Poll sleep scheduler → MCP session | Server-controlled 429 Retry-After must not unbound sleep | Clamped delay ≤ remaining timeout budget |
| Error/log payload → agent | Summary projection + optional capped logs | Redacted snapshot; truncated logs |
| Prompt/README → agent behavior | Docs steer tool calls; no new auth boundary | Public placeholder UUIDs only |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-21-00-01 | Denial of Service | Polling storm scaffolds | medium | mitigate | RED cases encode min/max interval + hard timeout; implemented via T-21-01 / T-21-02 (`deploy-watch-poll.ts`, `deployment.watch`) | closed |
| T-21-00-02 | Information Disclosure | Test fixtures | low | accept | Synthetic deployment UUIDs/tokens only; no real credentials | closed |
| T-21-01 | Denial of Service | `pollDeploymentWithBackoff` interval schedule | high | mitigate | min/max interval floor/cap, Equal Jitter, hard `timeoutMs` exit (`src/utils/deploy-watch-poll.ts`) | closed |
| T-21-01-02 | Denial of Service | HTTP 429 handling | medium | mitigate | Continue with `max(backoff, Retry-After)`; never tight-loop retry on 429 (D-08) | closed |
| T-21-01-03 | Tampering | Retry-After header parse | low | mitigate | `parseRetryAfterMs`: delta-seconds or HTTP-date → finite ms; clamp negative to 0; ignore malformed (`errors.ts`) | closed |
| T-21-02 | Denial of Service | `deployment.watch` unbounded poll | high | mitigate | Zod defaults timeout 300 (max 1800), min_interval≥1, max≥min; helper caps backoff at 30s default | closed |
| T-21-02-02 | Information Disclosure | `include_logs` / error.data deployment snapshot | medium | mitigate | Default `include_logs:false`; summary / `truncateLogs` / `max_chars`; `wrapMcpError` redactSecrets | closed |
| T-21-02-03 | Tampering | Deployment log text in agent context | medium | mitigate | Treat logs as untrusted data; cap size; do not execute log contents | closed |
| T-21-02-04 | Elevation of Privilege | instance routing | low | mitigate | `resolveRoutingEnv` / soft instance only — Phase 15/20 pattern unchanged | closed |
| T-21-03 | Denial of Service | Docs encouraging tight poll loops | medium | mitigate | Prompt + README mandate bounded timeout, backoff, re-watch — no forever watch | closed |
| T-21-03-02 | Information Disclosure | README examples | low | accept | Examples use placeholder UUIDs only; no real tokens | closed |
| T-21-04-01 | Denial of Service | sleep on 429 Retry-After | high | mitigate | Clamp every sleep to `remainingMs` so hostile Retry-After cannot hang beyond `timeoutMs` (CR-01) | closed |
| T-21-04-02 | Denial of Service | sleep on normal backoff | medium | mitigate | Same `remainingMs` clamp on normal path (WR-01) | closed |
| T-21-04-03 | Information Disclosure | `include_logs` watch success | low | accept | Logs already capped via projection + `max_chars`; WR-02 test-only | closed |
| T-21-04-04 | Tampering | timeout / interval agent params | low | accept | Zod bounds already enforce timeout 10–1800 and min≤max | closed |
| T-21-SC / T-21-04-SC | Tampering | npm package installs | low–high | accept / mitigate | No new packages in Phase 21 plans; deps already pinned | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-21-01 | T-21-00-02 | Synthetic fixtures only; no real credentials in tests | plan threat_model | 2026-07-25 |
| AR-21-02 | T-21-03-02 | Public docs use placeholder UUIDs only | plan threat_model | 2026-07-25 |
| AR-21-03 | T-21-04-03 | include_logs capped; WR-02 adds regression test only | plan threat_model | 2026-07-25 |
| AR-21-04 | T-21-04-04 | Zod param bounds already enforced; gap plan does not widen surface | plan threat_model | 2026-07-25 |
| AR-21-05 | T-21-SC | No new npm deps; legitimacy audit in RESEARCH | plan threat_model | 2026-07-25 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-07-25 | 16 | 16 | 0 | gsd-verify-work → secure-phase (ASVS L1 short-circuit) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-07-25
