---
phase: 25
slug: application-log-follow
status: verified
threats_open: 0
asvs_level: 1
created: 2026-07-28
---

# Phase 25 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Agent → application.logs follow params | Untrusted timeout, idle_timeout, interval bounds | Zod schema + handler defaults (D-13/D-06) |
| MCP SDK → parseApplicationAction | Boundary vs handler schema split (25-05) | follow+deployment_uuid reaches handler COOLIFY_422 |
| MCP → Coolify GET /applications/{uuid}/logs | Bearer token; repeated snapshot polls | Runtime log lines (may contain secrets) |
| followApplicationLogs → deploy-watch-poll | Shared backoff/sleep helpers | No new network surface |
| Test mocks → handlers | Synthetic empty/partial logs | No live tokens in asserts |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-25-01 | Denial of Service | followApplicationLogs poll loop | high | mitigate | Default timeout 120s, idle_timeout 60s, exponential backoff + 429 Retry-After; `log-follow-poll.test.ts` | closed |
| T-25-02 | Information Disclosure | partial logs on API error | medium | accept | D-07 intentional — same trust model as deploy watch timeout snapshot | closed |
| T-25-03 | Tampering | log aggregate | low | accept | Read-only upstream; no mutation path | closed |
| T-25-04-01 | Denial of Service | follow poll loop (gap closure) | high | accept | No runtime change — 25-01 caps remain | closed |
| T-25-04-02 | Tampering | schema refine ordering | low | mitigate | WR-03 tests lock resolved-default interval bounds | closed |
| T-25-03-01 | Information Disclosure | README follow docs | low | accept | Same trust model as existing application.logs | closed |
| T-25-05-01 | Elevation of Privilege | MCP boundary schema bypass | medium | mitigate | Handler `applicationActionSchema` + `throwValidationError` before API; regression test | closed |
| T-25-SC | Tampering | npm installs | high | accept | No new packages in Phase 25 | closed |

*Status: open · closed*
*Severity: critical > high > medium > low — only open threats at or above `workflow.security_block_on` count toward `threats_open`*

---

## Verification

| Check | Result |
|-------|--------|
| `threats_open` frontmatter | 0 |
| High-severity mitigations tested | `log-follow-poll.test.ts`, `application.test.ts` follow/idle/timeout |
| No new dependencies | package.json unchanged for Phase 25 scope |
| Boundary schema split (G-25-1) | `applicationActionMcpSchema` + handler COOLIFY_422 test |

---

## Accepted Risks

- **T-25-02**: Partial log aggregate on Coolify API error during follow aids agent debugging; mirrors Phase 21 watch timeout dual-signal pattern.
- **T-25-03**: Log content may contain application secrets — same as pre-Phase-25 `application.logs`; OUT-02 masking deferred.
