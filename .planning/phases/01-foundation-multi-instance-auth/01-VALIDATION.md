---
phase: 1
slug: foundation-multi-instance-auth
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-12
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest v1.x / v2.x |
| **Config file** | `vitest.config.ts` (none — Wave 0 creates) |
| **Quick run command** | `npx vitest run` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | CTX-01 | — | health tool returns connected status without echoing token | unit | `npx vitest run src/mcp/tools/system.test.ts` | ❌ W0 | ⬜ pending |
| 01-01-02 | 01 | 1 | CTX-02 | — | version tool returns Coolify API version | unit | `npx vitest run src/mcp/tools/system.test.ts` | ❌ W0 | ⬜ pending |
| 01-01-03 | 01 | 1 | CTX-03 | — | meta tool returns MCP server version | unit | `npx vitest run src/mcp/tools/meta.test.ts` | ❌ W0 | ⬜ pending |
| 01-02-01 | 02 | 1 | ERR-01 | T-01-01 | errors return structured {code,message,recoveryHints,httpStatus} | unit | `npx vitest run src/utils/errors.test.ts` | ❌ W0 | ⬜ pending |
| 01-02-02 | 02 | 1 | ERR-02 | T-01-01 | error codes COOLIFY_401/404/422/500/NETWORK/TIMEOUT mapped correctly | unit | `npx vitest run src/utils/errors.test.ts` | ❌ W0 | ⬜ pending |
| 01-03-01 | 03 | 1 | ERR-03 | — | retry 429+5xx+network, max 3 attempts, backoff 1s/2s/4s | unit | `npx vitest run src/api/client.test.ts` | ❌ W0 | ⬜ pending |
| 01-04-01 | 04 | 1 | DX-01 | — | action-based tool registration (system, meta only) | unit | `npx vitest run src/mcp/server.test.ts` | ❌ W0 | ⬜ pending |
| 01-04-02 | 04 | 1 | DX-02 | — | Zod discriminatedUnion('action', [...]) validates inputs | unit | `npx vitest run src/mcp/tools/system.test.ts` | ❌ W0 | ⬜ pending |
| 01-05-01 | 05 | 2 | DIST-03 | — | local MCP config points at built entry; handshake succeeds | smoke | `node dist/index.js --help` + manual Cursor/Claude Desktop handshake | ❌ W0 | ⬜ pending |
| 01-06-01 | 06 | 1 | CTX-01 | T-01-02 | secrets redacted in logs (Bearer/token/api_key/password/secret → ***) | unit | `npx vitest run src/utils/redact.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vitest.config.ts` — test runner configuration
- [ ] `src/utils/errors.test.ts` — unit tests for error mapping (ERR-01, ERR-02)
- [ ] `src/api/client.test.ts` — unit tests for HTTP client, retry, and SSL verification (ERR-03)
- [ ] `src/mcp/tools/system.test.ts` — system tool tests (CTX-01, CTX-02, DX-02)
- [ ] `src/mcp/tools/meta.test.ts` — meta tool tests (CTX-03)
- [ ] `src/mcp/server.test.ts` — server bootstrap + action registration (DX-01)
- [ ] `src/utils/redact.test.ts` — secret redaction tests (CTX-01 threat T-01-02)
- [ ] Vitest install: `npm i -D vitest` — no framework detected yet (greenfield)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| MCP stdio handshake succeeds in Cursor | DIST-03 | Requires live MCP client UI | Add to `.cursor/mcp.json`, reload Cursor, invoke `system({action:'health'})` |
| MCP stdio handshake succeeds in Claude Desktop | DIST-03 | Requires live MCP client UI | Add to Claude Desktop config, restart, invoke `system({action:'health'})` |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
