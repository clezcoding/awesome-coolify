---
phase: 11
slug: service-database-crud
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: validated
nyquist_compliant: true
wave_0_complete: false
created: 2026-07-19
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run src/mcp/tools/service.test.ts src/mcp/tools/database.test.ts` |
| **Full suite command** | `npm run test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/mcp/tools/service.test.ts src/mcp/tools/database.test.ts`
- **After every plan wave:** Run `npm run test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 11-00-01 | 00 | 0 | SVC-06 | — | N/A | unit | `npx vitest run src/mcp/tools/service.test.ts` | ❌ W0 | ⬜ pending |
| 11-00-02 | 00 | 0 | SVC-07 | — | N/A | unit | `npx vitest run src/mcp/tools/service.test.ts` | ❌ W0 | ⬜ pending |
| 11-00-03 | 00 | 0 | SVC-08 | — | N/A | unit | `npx vitest run src/mcp/tools/service.test.ts` | ❌ W0 | ⬜ pending |
| 11-00-04 | 00 | 0 | SVC-09 | — | N/A | unit | `npx vitest run src/mcp/tools/service.test.ts` | ❌ W0 | ⬜ pending |
| 11-00-05 | 00 | 0 | SVC-10 | T-11-01 | 409 force_domain_override hint | unit | `npx vitest run src/mcp/tools/service.test.ts` | ❌ W0 | ⬜ pending |
| 11-00-06 | 00 | 0 | DB-01 | T-11-02 | connection secrets masked | unit | `npx vitest run src/mcp/tools/database.test.ts` | ❌ W0 | ⬜ pending |
| 11-00-07 | 00 | 0 | DB-02 | — | N/A | unit | `npx vitest run src/mcp/tools/database.test.ts` | ❌ W0 | ⬜ pending |
| 11-00-08 | 00 | 0 | DB-03 | — | N/A | unit | `npx vitest run src/mcp/tools/database.test.ts` | ❌ W0 | ⬜ pending |
| 11-00-09 | 00 | 0 | DB-04 | T-11-03 | public_access requires confirm | unit | `npx vitest run src/mcp/tools/database.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/mcp/tools/service.test.ts` — Add test specs for Service Create/Update/Delete (currently contains Get/lifecycle only)
- [ ] `src/mcp/tools/database.test.ts` — Add test specs for Database Create/Update/Delete (currently contains Get/lifecycle only)
- [ ] `src/api/client.test.ts` — Add specs for 8 database poster calls and service POST/PATCH/DELETE wrappers

---

## Manual-Only Verifications

All phase behaviors have automated verification.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** 2026-07-21 (milestone tech-debt cleanup --auto -all)

## Validation Audit 2026-07-21
| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |
