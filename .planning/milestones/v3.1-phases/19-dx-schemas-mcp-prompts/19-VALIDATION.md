---
phase: 19
slug: dx-schemas-mcp-prompts
status: validated
nyquist_compliant: true
wave_0_complete: true
created: 2026-07-24
validated: 2026-07-27
---

# Phase 19 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest v4.1.10 |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run tests/mcp/prompts.test.ts src/mcp/server.test.ts src/mcp/tools/shared-read-params.test.ts` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run targeted vitest for touched files
- **After every plan wave:** Run full `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? | Status |
|--------|----------|-----------|-------------------|-------------|--------|
| **DX-01** | Tool descriptions expose compact hand-authored Actions catalogs | Unit | `npx vitest run src/mcp/server.test.ts` | ✅ | ✅ green |
| **DX-02** | Top-level tool input schemas are flat objects with top-level parameters | Unit | `npx vitest run src/mcp/tools/shared-read-params.test.ts` | ✅ | ✅ green |
| **PROMPT-01** | Prompt `deploy` returns parameterized guidance steps for deployment | Unit | `npx vitest run tests/mcp/prompts.test.ts -t deploy` | ✅ | ✅ green |
| **PROMPT-02** | Prompt `diagnose` returns guidance steps for diagnostic operations | Unit | `npx vitest run tests/mcp/prompts.test.ts -t diagnose` | ✅ | ✅ green |
| **PROMPT-03** | Prompt `new-project` returns setup and organizational project wiring steps | Unit | `npx vitest run tests/mcp/prompts.test.ts -t new-project` | ✅ | ✅ green |
| **PROMPT-04** | Prompt `incident` returns emergency redeployment steps for disaster triage | Unit | `npx vitest run tests/mcp/prompts.test.ts -t incident` | ✅ | ✅ green |

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 19-01-T1 | 01 | 1 | DX-02 | T-19-01 | Flat schema strict per-action field validation | unit | `npx vitest run src/mcp/tools/shared-read-params.test.ts` | ✅ | ✅ green |
| 19-01-T2 | 01 | 1 | DX-02 | T-19-01 | 17 domain tools use flat z.object inputSchema | unit | `npx vitest run src/mcp/tools/shared-read-params.test.ts` | ✅ | ✅ green |
| 19-02-T1 | 02 | 2 | DX-01 | T-19-02 | composeToolDescription wires Actions:/Safety: on all tools | unit | `npx vitest run src/mcp/server.test.ts` | ✅ | ✅ green |
| 19-02-T2 | 02 | 2 | PROMPT-01..04 | T-19-03 | Four MCP prompts registered with parameterized steps | unit | `npx vitest run tests/mcp/prompts.test.ts` | ✅ | ✅ green |
| 19-02-T3 | 02 | 2 | DX-02 | T-19-01 | Flat schemas agent-callable via MCP JSON Schema | unit | `npx vitest run tests/integration/mcp-schema-validation.test.ts` | ✅ | ✅ green |
| 19-03-T1 | 03 | 3 | DX-01, DX-02 | — | Catalog tokens match schema field names (env_uuid, entries) | unit | `npx vitest run src/mcp/server.test.ts -t "actionsCatalog schema-field-name regression"` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `tests/mcp/prompts.test.ts` — covers prompt template registrations and parameter assertions (created in 19-02)
- [x] `src/mcp/server.test.ts` — Actions:/Safety: prefix + catalog regression block (extended in 19-02/19-03)
- [x] `src/mcp/tools/shared-read-params.test.ts` — createFlatActionSchema + flat shape tests (19-01)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Cursor tool panel shows params (not "No parameters") | DX-01, DX-02 | Host UI rendering | Open Coolify MCP tool in Cursor; confirm Actions catalog + top-level params visible |

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
| Gaps found | 4 (stale PROMPT File Exists ❌ rows; pending per-task map; draft frontmatter) |
| Resolved | 4 |
| Escalated | 0 |

Nyquist reconciliation (23.1-02): corrected test paths (`src/mcp/server.test.ts`, `src/mcp/tools/shared-read-params.test.ts`); confirmed 6 prompts + 26 server + shared-read-params tests green; earned `status: validated` + `nyquist_compliant: true`.
