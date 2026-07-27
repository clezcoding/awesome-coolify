---
phase: 20
slug: recipes-service-list-types
status: validated
nyquist_compliant: true
wave_0_complete: true
created: 2026-07-24
validated: 2026-07-27
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

## Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? | Status |
|--------|----------|-----------|-------------------|-------------|--------|
| **RECIPE-01** | service.list-types returns slim type catalog from pinned CDN | Unit | `npx vitest run src/mcp/tools/service.test.ts -t "list-types" src/utils/service-templates.test.ts` | ✅ | ✅ green |
| **RECIPE-02** | recipe.create-git-app validates repo/build_pack; D-20 manifest hints | Unit | `npx vitest run src/mcp/tools/recipe.test.ts -t "create-git-app"` | ✅ | ✅ green |
| **RECIPE-03** | recipe.create-app-db engine dispatch, masking, partial failure | Unit | `npx vitest run src/mcp/tools/recipe.test.ts -t "create-app-db"` | ✅ | ✅ green |
| **RECIPE-04** | recipe.create-one-click validates type; SSRF reject | Unit | `npx vitest run src/mcp/tools/recipe.test.ts -t "create-one-click"` | ✅ | ✅ green |

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 20-00-T1 | 00 | 0 | RECIPE-02/03/04 | T-20-02, T-20-01 | RED scaffolds assert SSRF reject, masking, partial-failure | unit | `npx vitest run src/mcp/tools/recipe.test.ts` | ✅ | ✅ green |
| 20-01-T1 | 01 | 1 | RECIPE-01 | T-20-02 | Templates from hardcoded CDN; empty {} hard error | unit | `npx vitest run src/utils/service-templates.test.ts` | ✅ | ✅ green |
| 20-01-T2 | 01 | 1 | RECIPE-01 | T-20-02 | list-types slim { id, label } response | unit | `npx vitest run src/mcp/tools/service.test.ts -t "list-types"` | ✅ | ✅ green |
| 20-02-T1 | 02 | 2 | RECIPE-02, RECIPE-04 | T-20-02 | create-git-app + create-one-click validation; D-20 hints | unit | `npx vitest run src/mcp/tools/recipe.test.ts` | ✅ | ✅ green |
| 20-03-T1 | 03 | 3 | RECIPE-03 | T-20-01, T-20-03-01 | create-app-db masking + partial failure envelope | unit | `npx vitest run src/mcp/tools/recipe.test.ts -t "create-app-db"` | ✅ | ✅ green |
| 20-03-T2 | 03 | 3 | RECIPE-03 | — | recipe tool registered in server.ts (17 tools) | unit | `npx vitest run src/mcp/server.test.ts` | ✅ | ✅ green |
| 20-04-T1 | 04 | 4 | RECIPE-02 | — | create-git-app MANIFEST_HINT on all error paths (D-20) | unit | `npx vitest run src/mcp/tools/recipe.test.ts -t "create-git-app"` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `src/mcp/tools/recipe.test.ts` — RECIPE-02, RECIPE-03, RECIPE-04 (Wave 0 RED → GREEN in 20-02/20-03)
- [x] `src/mcp/tools/recipe.ts` — recipe tool implementation (20-02/20-03)

*Existing vitest infrastructure covers RECIPE-01 via `service.test.ts` + `service-templates.test.ts`.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live `list-types` against real Coolify-version-pinned CDN | RECIPE-01 | Network + version pin | Call `service.list-types` on configured instance; confirm non-empty type IDs/labels |
| Live `create-app-db` env wiring on Coolify 4.1.x | RECIPE-03 | Needs live API + DB create | Run recipe; confirm app env has masked DATABASE_URL; reveal confirms internal_db_url value |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** validated

---

## Validation Audit 2026-07-27

| Metric | Count |
|--------|-------|
| Gaps found | 7 (all per-task rows pending; wave_0_complete false) |
| Resolved | 7 |
| Escalated | 0 |

Nyquist reconciliation (23.1-02): 100 recipe+service tests green; all RECIPE-01..04 REQ rows COVERED; earned `status: validated` + `nyquist_compliant: true`.
