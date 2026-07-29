---
phase: 27
slug: branding-docs-stale-fix
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-28
---

# Phase 27 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest `^4.1.10` |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm test -- src/mcp/server.test.ts -x` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- src/mcp/server.test.ts -x`
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 27-00-01 | 00 | 0 | BRND-01 | T-27-01 / — | icons[] has data URI + CDN entries | unit | `npm test -- src/mcp/server.test.ts -x` | ✅ extend | ⬜ pending |
| 27-00-02 | 00 | 0 | BRND-01 | — | buildMcpServerIcons shape RED scaffolds | unit | `npm test -- src/mcp/server-icons.test.ts -x` | ❌ create | ⬜ pending |
| 27-00-03 | 00 | 0 | D-08 | — | serverInfo.version === readPackageVersion() RED | unit | `npm test -- src/mcp/server.test.ts -x` | ✅ extend | ⬜ pending |
| 27-00-04 | 00 | 0 | DOC-01 | — | PROJECT opener stale-string `it.fails` gate | unit/grep | `npm test -- tests/integration/doc-version-parity.test.ts -x` | ❌ create | ⬜ pending |
| 27-01-01 | 01 | 1 | BRND-01 | T-27-02 | initialize serverInfo.icons shape GREEN | unit | `npm test -- src/mcp/server-icons.test.ts -x` | ✅ from W0 | ⬜ pending |
| 27-02-01 | 02 | 2 | BRND-02 | — | N/A | manual | Maintainer checklist in cursor-icon-verify.md | ✅ | ⬜ pending |
| 27-03-01 | 03 | 3 | DOC-01 | — | PROJECT opener GREEN + no pending Version Packages | unit/grep | `npm test -- tests/integration/doc-version-parity.test.ts -x` | ✅ from W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements (Plan 27-00 — RED scaffolds only)

- [ ] Extend `src/mcp/server.test.ts` — BRND-01/D-08 `it.fails` branding scaffolds (data URI + CDN + readPackageVersion)
- [ ] Create `src/mcp/server-icons.test.ts` — `buildMcpServerIcons()` shape `it.fails` scaffolds
- [ ] Create `tests/integration/doc-version-parity.test.ts` — PROJECT opener stale-string `it.fails` gate (no PROJECT.md edits in Wave 0)

**Deferred to later plans (not Wave 0):**

- `scripts/generate-mcp-icon-data.mjs` + `package.json` build wire-up → **Plan 27-01**
- `.planning/PROJECT.md` L5 opener fix + flip doc-version-parity GREEN → **Plan 27-03**

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Cursor MCP list icon render | BRND-02 | Client UI not automatable | Follow `docs/assets/cursor-icon-verify.md` for dist/ and npx paths; screenshot + initialize dump |
| Icon variant experiments (up to 4) | BRND-01/D-03 | Visual client behavior | Document each variant in verify doc before accepting client limitation |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
