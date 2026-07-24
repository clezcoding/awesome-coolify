---
phase: 19
slug: dx-schemas-mcp-prompts
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-07-24
---

# Phase 19 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts |
| **Quick run command** | `pnpm exec vitest run` (or package test script) |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~30–60 seconds |

---

## Sampling Rate

- **After every task commit:** Run targeted vitest for touched files
- **After every plan wave:** Run full `pnpm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Research Validation Architecture (source)


### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest `^3.0.0` |
| Config file | `vitest.config.ts` |
| Quick run command | `pnpm test` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| **DX-01** | Tool descriptions expose compact hand-authored Actions catalogs | Unit | `pnpm test tests/mcp/server.test.ts` | ✅ |
| **DX-02** | Top-level tool input schemas are flat objects with top-level parameters | Unit | `pnpm test tests/mcp/shared-read-params.test.ts` | ✅ |
| **PROMPT-01** | Prompt `deploy` returns parameterized guidance steps for deployment | Unit | `pnpm test tests/mcp/prompts.test.ts` | ❌ (Greenfield test to be added) |
| **PROMPT-02** | Prompt `diagnose` returns guidance steps for diagnostic operations | Unit | `pnpm test tests/mcp/prompts.test.ts` | ❌ (Greenfield test to be added) |
| **PROMPT-03** | Prompt `new-project` returns setup and organizational project wiring steps | Unit | `pnpm test tests/mcp/prompts.test.ts` | ❌ (Greenfield test to be added) |
| **PROMPT-04** | Prompt `incident` returns emergency redeployment steps for disaster triage | Unit | `pnpm test tests/mcp/prompts.test.ts` | ❌ (Greenfield test to be added) |

### Sampling Rate
- **Per task commit:** `pnpm test` (Fast unit tests run in <1s)
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full test suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `tests/mcp/prompts.test.ts` — covers greenfield prompt template registrations and parameter assertions. Created in plan 19-02 Task 3 (Wave 2); not a Wave 0 prerequisite since plan 19-02 Task 2 verify uses `pnpm exec tsc --noEmit` (non-test gate) until Task 3 creates and runs the test file.


---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|------------|--------|
| TBD | TBD | TBD | DX-01 / DX-02 / PROMPT-* | T-19-* | No secret leakage in prompt/schema surfaces | unit | `pnpm exec vitest run` | ⬜ W0 | ⬜ pending |

*Filled by planner/executor per plan tasks.*

---

## Wave 0 Requirements

Existing vitest infrastructure covers unit tests for MCP tools/schemas. Add focused tests for flat schemas + prompt registry as plans specify.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Cursor tool panel shows params (not "No parameters") | DX-01, DX-02 | Host UI rendering | Open Coolify MCP tool in Cursor; confirm Actions catalog + top-level params visible |
| Prompt invoke returns guidance | PROMPT-01..04 | Host prompt UX | Invoke deploy/diagnose/new-project/incident prompts; confirm parameterized steps |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
