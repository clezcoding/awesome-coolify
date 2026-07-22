---
phase: 10
slug: application-crud-safety
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: validated
nyquist_compliant: true
wave_0_complete: false
created: 2026-07-19
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run src/mcp/tools/application.test.ts` |
| **Full suite command** | `npm run test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/mcp/tools/application.test.ts`
- **After every plan wave:** Run `npm run test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 10-00-01 | 00 | 1 | APP-12..APP-16, APP-20, APP-21, SAF-03 | T-10-01 | Wave 0 RED: create source-types + instant_deploy + 409/override + create Zod | unit | `npx vitest run src/mcp/tools/application.test.ts` | ✅ | ⬜ pending |
| 10-00-02 | 00 | 1 | APP-17..APP-19, APP-21, SAF-01..SAF-04 | T-10-02/T-10-03 | Wave 0 RED: update/delete + basic-auth mask + confirm + 4 delete flags + update Zod | unit | `npx vitest run src/mcp/tools/application.test.ts` | ✅ | ⬜ pending |
| 10-01-01 | 01 | 1 | APP-12..APP-18, APP-21 | — | Client CRUD methods for five create routes + update/delete | unit | `npx vitest run src/api/client.test.ts` | ✅ | ⬜ pending |
| 10-01-02 | 01 | 1 | APP-21 | T-10-01 | COOLIFY_409 conflicts passthrough + force_domain_override recoveryHints | unit | `npx vitest run src/utils/errors.test.ts` | ✅ | ⬜ pending |
| 10-02-01 | 02 | 2 | APP-12..APP-16, APP-20, SAF-03 | — | createActionSchema + five source_type routes + Zod before API | unit | `npx vitest run src/mcp/tools/application.test.ts` | ✅ | ⬜ pending |
| 10-02-02 | 02 | 2 | APP-21 | T-10-01 | Domain 409 → COOLIFY_409 + force_domain_override hint; override happy-path | unit | `npx vitest run src/mcp/tools/application.test.ts` | ✅ | ⬜ pending |
| 10-03-01 | 03 | 3 | APP-17, APP-19, SAF-03, SAF-04 | T-10-02 | update schema `.strict()` + basic-auth fields + masking unless reveal | unit | `npx vitest run src/mcp/tools/application.test.ts` | ✅ | ⬜ pending |
| 10-03-02 | 03 | 3 | APP-21 | T-10-01 | Update-path 409 + force_domain_override happy-path | unit | `npx vitest run src/mcp/tools/application.test.ts` | ✅ | ⬜ pending |
| 10-04-01 | 04 | 4 | APP-18, SAF-01, SAF-02 | T-10-03 | confirm gate + safe delete defaults (4 flags) | unit | `npx vitest run src/mcp/tools/application.test.ts` | ✅ | ⬜ pending |
| 10-04-02 | 04 | 4 | APP-18 | — | delete_preview parity with Phase 8/9 | unit | `npx vitest run src/mcp/tools/application.test.ts` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/mcp/tools/application.test.ts` — RED scaffolds in plan `10-00` (create + update/delete describes) that later waves flip GREEN
- Existing Vitest infrastructure covers framework/config; Wave 0 adds failing tests only (no new framework install)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live MCP stdio create/update/delete against real Coolify | APP-12–APP-21 | Real MCP stdio E2E MANUAL-ONLY per P1–P9 precedent | Run against live instance; verify five source types, update, confirm delete, 409 force override, basic auth + reveal |

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
| Resolved | 1 (D-08 instant_deploy failed_to_queue test already in application.test.ts) |
| Escalated | 0 |
