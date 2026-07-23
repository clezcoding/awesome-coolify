---
phase: 15
slug: multi-instance-registry-routing
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: validated
nyquist_compliant: true
wave_0_complete: true
created: 2026-07-21
validated: 2026-07-22
---

# Phase 15 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest v4.1.10 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run src/utils/instance-registry.test.ts` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/utils/instance-registry.test.ts`
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 15-00-01 | 00 | 0 | CTX-04 | — | N/A | unit | `npx vitest run src/utils/instance-registry.test.ts` | ✅ | ✅ green |
| 15-01-01 | 01 | 1 | CTX-04 | T-15-01 | tokens never written world-readable | unit | `npx vitest run src/utils/instance-registry.test.ts` | ✅ | ✅ green |
| 15-01-02 | 01 | 1 | CTX-05 | — | env overrides registry default | unit | `npx vitest run src/utils/instance-registry.test.ts` | ✅ | ✅ green |
| 15-01-03 | 01 | 1 | CTX-08 | T-15-02 | dir 0o700 / file 0o600; redact unless reveal | unit | `npx vitest run src/utils/instance-registry.test.ts` | ✅ | ✅ green |
| 15-01-04 | 01 | 1 | CTX-09 | T-15-03 | atomic temp+rename under lock | unit | `npx vitest run src/utils/instance-registry.test.ts` | ✅ | ✅ green |
| 15-02-01 | 02 | 2 | CTX-06 | T-15-04 | per-request client; no cross-instance leak | integration | `npx vitest run src/mcp/integration.test.ts` | ✅ | ✅ green |
| 15-03-01 | 03 | 2 | CTX-06 | T-15-04 | lifecycle tools route via instance param | integration | `npx vitest run src/mcp/integration.test.ts` | ✅ | ✅ green |
| 15-04-01 | 04 | 3 | CTX-06 | T-15-04 | read/CRUD tools incl. diagnose/server/environment | integration | `npx vitest run src/mcp/integration.test.ts` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `src/utils/instance-registry.test.ts` — stubs for CTX-04, CTX-05, CTX-08, CTX-09
- [x] `src/mcp/tools/instance.test.ts` — stubs for `instance` tool CRUD actions
- [x] Update `src/config/env.test.ts` — softened startup validation coverage

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Soft-start without env/registry | CTX-05 | Needs live MCP client session | Start server with no COOLIFY_* env and empty registry; confirm only `instance` + `meta.version` succeed; other tools return `COOLIFY_NO_INSTANCE` |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** validated 2026-07-22 via `/gsd-validate-phase 15`

---

## Validation Audit 2026-07-22

| Metric | Count |
|--------|-------|
| Gaps found | 3 |
| Resolved | 3 |
| Escalated | 0 |

**Gaps filled (CTX-06):** `diagnose.scan`, `server.get`, `environment.list` prod-routing cases added to `src/mcp/integration.test.ts` — 12/12 API tools now covered + 3 error paths. Auditor: [Fill Phase 15 validation gaps](f4ddb717-0ce9-4945-904d-bc45d12b3d45). Evidence: `npx vitest run src/mcp/integration.test.ts` → 18 passed; `npm test` → 892 passed.
