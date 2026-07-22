---
phase: 16
slug: coolify-cloud-server-branding
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-22
---

# Phase 16 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest v4.1.10 |
| **Config file** | none (configured via package.json) |
| **Quick run command** | `npx vitest run src/utils/errors.test.ts` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/utils/errors.test.ts` (or plan-specific quick target)
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 16-00-01 | 00 | 0 | BRND-01 | T-16-01 | icons/title/description/websiteUrl in serverInfo; no token in handshake | unit | `npx vitest run src/mcp/server.test.ts` | ❌ W0 | ⬜ pending |
| 16-00-02 | 00 | 0 | CLD-02 | T-16-02 | 403/404 on coolify.io → cloud codes; tokens redacted | unit | `npx vitest run src/utils/errors.test.ts` | ✅ | ⬜ pending |
| 16-00-03 | 00 | 0 | CLD-01 | — | `cloud-info` action returns isCloud/source/hints without live API | unit | `npx vitest run src/mcp/tools/instance.test.ts` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/mcp/server.test.ts` — stubs asserting McpServer `serverInfo` contains `icons`, `title`, `description`, `websiteUrl`
- [ ] `src/utils/errors.test.ts` — cloud hostname 403→`COOLIFY_CLOUD_FORBIDDEN`, 404→`COOLIFY_CLOUD_UNSUPPORTED` cases
- [ ] `src/mcp/tools/instance.test.ts` — `cloud-info` action cases (registry|env|infer)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Cursor MCP server list shows awesome-coolify icon after reconnect | BRND-02 / D-09 | Client UI rendering not automatable in CI | Reconnect MCP in Cursor; screenshot MCP server list showing icon (or document client limitation with evidence) |
| Live connect to `https://app.coolify.io` with team token | CLD-01 | Requires real Cloud credentials | `instance.add` / `import-env` cloud → `system` or `meta.version` smoke |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
