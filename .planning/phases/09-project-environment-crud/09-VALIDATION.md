---
phase: 9
slug: project-environment-crud
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-17
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^1.4.0 |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 9-01-01 | 01 | 1 | PROJ-01..05 (infra) | T-9-01 | client.ts exports 7 CRUD functions; resource.list type=project\|environment; resolveProjectUuid + resolveEnvironmentUuid | unit | `npx tsc --noEmit src/api/client.ts src/mcp/tools/resource.ts src/utils/project-lookup.ts` | ✅ existing | ⬜ pending |
| 9-00-01 | 00 | 0 | PROJ-01..03 | — | project.test.ts RED scaffold exists and fails at handler import; covers list/get/create/update/delete/delete_preview + confirm gate + non-empty 409 + initial_environment requirement (D-05..D-11, D-14) | red-scaffold | `npx vitest run src/mcp/tools/project.test.ts` (expect RED) | ❌ W0 | ⬜ pending |
| 9-00-02 | 00 | 0 | PROJ-04..05 | — | environment.test.ts RED scaffold exists and fails at handler import; covers list/get/create/delete/delete_preview + non-empty 409 (incl. deleting/destroying child pre-check per RESEARCH pitfall 2) + duplicate-409 + SC#4 resource.list-after-create | red-scaffold | `npx vitest run src/mcp/tools/environment.test.ts` (expect RED) | ❌ W0 | ⬜ pending |
| 9-02-01 | 02 | 2 | PROJ-01 | T-9-02 | project.create requires initial_environment (no default); missing/empty → COOLIFY_422; ensures env exists | unit | `vitest run src/mcp/tools/project.test.ts` | ❌ W0 | ⬜ pending |
| 9-02-02 | 02 | 2 | PROJ-02 | — | project.update name/description reflected on get | unit | `vitest run src/mcp/tools/project.test.ts` | ❌ W0 | ⬜ pending |
| 9-02-03 | 02 | 2 | PROJ-03 | T-9-02 | project.delete: missing confirm → COOLIFY_CONFIRM_REQUIRED; empty project delete with confirm; non-empty → COOLIFY_409 with env UUIDs | unit | `vitest run src/mcp/tools/project.test.ts` | ❌ W0 | ⬜ pending |
| 9-03-01 | 03 | 2 | PROJ-04 | — | environment.create scoped to project_uuid XOR project_name; duplicate name → COOLIFY_409; SC#4 resource.list shows new env after create | unit | `vitest run src/mcp/tools/environment.test.ts` | ❌ W0 | ⬜ pending |
| 9-03-02 | 03 | 2 | PROJ-05 | T-9-03 | environment.delete: non-empty (incl. deleting/destroying children) → COOLIFY_409 with child UUIDs; empty delete with confirm succeeds | unit | `vitest run src/mcp/tools/environment.test.ts` | ❌ W0 | ⬜ pending |
| 9-04-01 | 04 | 3 | PROJ-01..05 | — | registerCoolifyTools registers 'project' + 'environment' MCP tools with toolOutputSchema + openWorldHint; error results propagate via isProjectErrorResult/isEnvironmentErrorResult; descriptions document confirm gates, 409 on non-empty, required initial_environment (no default), name-resolution ambiguity | unit | `grep -cE "registerTool\(\s*'(project\|environment)'" src/mcp/server.ts` + `npx tsc --noEmit src/mcp/server.ts` + `npm test` | ✅ existing | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/mcp/tools/project.test.ts` — stubs for PROJ-01, PROJ-02, PROJ-03
- [ ] `src/mcp/tools/environment.test.ts` — stubs for PROJ-04, PROJ-05

*Existing Vitest infrastructure covers runner; new tool test files are Wave 0 gaps.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live Coolify auto-creates `production` on project create | PROJ-01 / D-09–D-11 | Depends on live instance behavior | Create project via MCP against real Coolify; confirm `production` present and `initial_environment` ensured |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
