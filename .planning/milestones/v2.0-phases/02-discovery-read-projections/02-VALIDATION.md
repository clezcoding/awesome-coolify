---
phase: 2
slug: discovery-read-projections
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-07-12
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest |
| **Config file** | `package.json` (vitest script configurations) |
| **Quick run command** | `npm run test` |
| **Full suite command** | `npm run test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test`
- **After every plan wave:** Run `npm run test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | OUT-04, OUT-01 | T-2-01 / — | Summary projection strips secrets | unit | `npm run test` | ✅ | ✅ green |
| 02-02-01 | 02 | 2 | SYS-01, SYS-02 | — | Read-only overview/list | unit | `npm run test` | ✅ | ✅ green |
| 02-03-01 | 03 | 3 | APP-01, APP-02, SVC-01, SVC-02 | T-2-01 | Get projections summary/full | unit | `npm run test` | ✅ | ✅ green |
| 02-04-01 | 04 | 4 | SYS-06, SYS-07 | — | Find ranked matches, docs search | unit | `npm run test` | ✅ | ✅ green |
| 02-05-01 | 05 | 5 | OUT-03, OUT-05, DX-03 | T-2-02 | max_chars cap + truncation warning | integration | `npm run test` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `src/utils/projections.test.ts` — stubs for OUT-04, APP-01, SVC-01 field reductions
- [x] `src/utils/formatters.test.ts` — stubs for OUT-01, OUT-03, OUT-05, DX-03
- [x] `src/mcp/tools/resource.test.ts` — stubs for SYS-02, SYS-06
- [x] `src/mcp/tools/docs.test.ts` — stubs for SYS-07

*Wave 0 installs test stubs before implementation waves.*

---

## Requirement Traceability (Phase 2)

| REQ-ID | Description | Verification | Status |
|--------|-------------|--------------|--------|
| SYS-01 | Infrastructure overview counts | `src/mcp/tools/system.test.ts`, `src/mcp/integration.test.ts` | ✅ pass |
| SYS-02 | Unified resource list | `src/mcp/tools/resource.test.ts`, `src/mcp/integration.test.ts` | ✅ pass |
| SYS-06 | Resource find by UUID/name/domain/IP | `src/mcp/tools/resource.test.ts`, `src/mcp/integration.test.ts` | ✅ pass |
| SYS-07 | Docs search | `src/mcp/tools/docs.test.ts`, `src/mcp/integration.test.ts` | ✅ pass |
| APP-01 | App list summary projection | `src/mcp/tools/resource.test.ts` | ✅ pass |
| APP-02 | App get summary/full | `src/mcp/tools/application.test.ts`, `src/mcp/integration.test.ts` | ✅ pass |
| SVC-01 | Service/DB list summary | `src/mcp/tools/resource.test.ts` | ✅ pass |
| SVC-02 | Service/DB get summary/full | `src/mcp/tools/service.test.ts`, `src/mcp/tools/database.test.ts` | ✅ pass |
| OUT-01 | format table/json/pretty | `src/utils/formatters.test.ts`, `src/mcp/integration.test.ts` | ✅ pass |
| OUT-03 | Pagination page/per_page | `src/utils/formatters.test.ts`, `src/mcp/tools/resource.test.ts` | ✅ pass |
| OUT-04 | Summary vs full projection | `src/utils/projections.test.ts`, `src/mcp/tools/application.test.ts` | ✅ pass |
| OUT-05 | max_chars truncation cap | `src/utils/formatters.test.ts`, `src/mcp/tools/docs.test.ts` | ✅ pass |
| DX-03 | 80% size warning | `src/utils/formatters.test.ts` | ✅ pass |

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live Coolify API integration | SYS-01 | Requires running Coolify instance | Connect MCP to test instance; call `system.infrastructure_overview` |

*Most phase behaviors have automated unit verification; live API smoke is manual.*

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter
- [x] Full suite green: `npx vitest run` — 17 files, 119 tests passed (2026-07-12)

**Approval:** signed off — Phase 2 ready for `/gsd-verify-work`
