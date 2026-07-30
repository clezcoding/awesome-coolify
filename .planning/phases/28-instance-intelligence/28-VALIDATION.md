---
phase: 28
slug: instance-intelligence
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-30
---

# Phase 28 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^4.1.10 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run src/mcp/tools/intelligence.test.ts -x` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~15–45 seconds (unit); full suite longer |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/mcp/tools/intelligence.test.ts -x`
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 28-W0-01 | 00 | 0 | — | — | N/A | unit stubs | `npx vitest run src/mcp/tools/intelligence.test.ts -x` | ❌ W0 | ⬜ pending |
| 28-XX-XX | TBD | TBD | INTEL-01 | — | N/A | unit | `npx vitest run src/mcp/tools/intelligence.test.ts -t scorecard -x` | ❌ W0 | ⬜ pending |
| 28-XX-XX | TBD | TBD | INTEL-02 | — | N/A | unit | `npx vitest run src/mcp/tools/intelligence.test.ts -t findings -x` | ❌ W0 | ⬜ pending |
| 28-XX-XX | TBD | TBD | GRAPH-01 | — | N/A | unit | `npx vitest run src/mcp/tools/intelligence.test.ts -t graph -x` | ❌ W0 | ⬜ pending |
| 28-XX-XX | TBD | TBD | GRAPH-02 | — | N/A | unit | `npx vitest run src/mcp/tools/intelligence.test.ts -t impact -x` | ❌ W0 | ⬜ pending |
| 28-XX-XX | TBD | TBD | JANI-01 | — | N/A | unit | `npx vitest run src/mcp/tools/intelligence.test.ts -t janitor -x` | ❌ W0 | ⬜ pending |
| 28-XX-XX | TBD | TBD | JANI-02 | T-28-01 | confirm gate blocks mutation | unit | `npx vitest run src/mcp/tools/intelligence.test.ts -t cleanup -x` | ❌ W0 | ⬜ pending |
| 28-XX-XX | TBD | TBD | SAF-02 | T-28-02 | delete_volumes/configurations default false | unit | same as JANI-02 | ❌ W0 | ⬜ pending |
| 28-XX-XX | TBD | TBD | D-17 | — | soft partial on factor failure | unit | `npx vitest run src/mcp/tools/intelligence.test.ts -t partial -x` | ❌ W0 | ⬜ pending |

*Planner fills exact Task IDs / Plan / Wave columns when PLAN.md ships. Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/mcp/tools/intelligence.test.ts` — stubs for INTEL/GRAPH/JANI behaviors above
- [ ] Existing Vitest infrastructure covers runner — no new framework
- [ ] Optional: `src/utils/resource-graph.test.ts` if graph helper extracted

*Existing infrastructure (Vitest + co-located tests) covers all phase requirements once Wave 0 stubs land.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live Coolify scorecard against real instance | INTEL-01 | Needs live API + real resources | Point MCP at test instance; call `intelligence.scorecard`; spot-check factors vs dashboard |
| Live graph edges for one known app↔db pair | GRAPH-01 | Fixture may not mirror nested service payloads | Call `intelligence.graph`; confirm known link present |

*Unit tests cover contracts; live spot-check optional at UAT.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
