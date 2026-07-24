---
phase: 20
slug: recipes-service-list-types
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-24
---

# Phase 20 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest v4.1.10 |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run src/mcp/tools/service.test.ts src/mcp/tools/recipe.test.ts` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/mcp/tools/service.test.ts src/mcp/tools/recipe.test.ts` (or the file under edit)
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 20-00-01 | 00 | 0 | RECIPE-02/03/04 | — | N/A | unit scaffold | `npx vitest run src/mcp/tools/recipe.test.ts` | ❌ W0 | ⬜ pending |
| 20-01-01 | 01 | 1 | RECIPE-01 | T-20-02 | Templates only from hardcoded CDN/GitHub hosts | unit | `npx vitest run src/mcp/tools/service.test.ts` | ✅ extend | ⬜ pending |
| 20-02-01 | 02 | 2 | RECIPE-02 | — | N/A | unit | `npx vitest run src/mcp/tools/recipe.test.ts` | ❌ W0 | ⬜ pending |
| 20-02-02 | 02 | 2 | RECIPE-04 | — | Type validated against list-types before create | unit | `npx vitest run src/mcp/tools/recipe.test.ts` | ❌ W0 | ⬜ pending |
| 20-03-01 | 03 | 3 | RECIPE-03 | T-20-01 | Connection strings masked unless reveal:true | unit | `npx vitest run src/mcp/tools/recipe.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/mcp/tools/recipe.test.ts` — stubs for RECIPE-02, RECIPE-03, RECIPE-04
- [ ] `src/mcp/tools/recipe.ts` — implementation target for new `recipe` tool (created in later wave; Wave 0 may use dynamic import + it.fails)

*Existing vitest infrastructure covers RECIPE-01 via extending `service.test.ts`.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live `list-types` against real Coolify-version-pinned CDN | RECIPE-01 | Network + version pin | Call `service.list-types` on configured instance; confirm non-empty type IDs/labels |
| Live `create-app-db` env wiring on Coolify 4.1.x | RECIPE-03 | Needs live API + DB create | Run recipe; confirm app env has masked DATABASE_URL; reveal confirms internal_db_url value |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
